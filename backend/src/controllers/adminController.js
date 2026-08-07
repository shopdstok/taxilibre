const { User, Driver, Ride, Payment, Rating, Promotion, PricingZone, UserRole, DriverStatus, RideStatus, PaymentStatus } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const AppError = require('../middleware/errorMiddleware').AppError
const { Sequelize, Op } = require('sequelize')
const geofencingService = require('../services/geofencingService')
const pricingService = require('../services/pricingService')

/**
 * Get all users (with filtering and pagination)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 10, search } = req.query

    // Admin only
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const whereClause = {}
    if (role) {
      whereClause.role = role
    }
    if (status !== undefined) {
      whereClause.isActive = status === 'active'
    }
    if (search) {
      whereClause[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { '$profile.firstName$': { [Op.iLike]: `%${search}%` } },
        { '$profile.lastName$': { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ]
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: require('../models').Profile, 
          as: 'profile',
          required: false
        },
        {
          model: Driver,
          as: 'driver',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      users: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        pages: Math.ceil(users.count / parseInt(limit))
      }
    }, 'Users retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get user details by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const user = await User.findByPk(userId, {
      include: [
        { 
          model: require('../models').Profile, 
          as: 'profile',
          required: false
        },
        {
          model: Driver,
          as: 'driver',
          required: false,
          include: [
            { model: require('../models').Vehicle, as: 'vehicle' }
          ]
        }
      ]
    })

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    sendSuccess(res, {
      user: user.toJSON()
    }, 'User retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update user status (activate/deactivate)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { isActive } = req.body
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    if (isActive === undefined) {
      throw new AppError('isActive is required', 400, 'MISSING_FIELD')
    }

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    await user.update({ isActive })

    sendSuccess(res, {
      user: user.toJSON()
    }, 'User status updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get all drivers (with filtering and pagination)
 */
const getAllDrivers = async (req, res, next) => {
  try {
    const { status, verificationStatus, page = 1, limit = 10, search } = req.query
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const whereClause = {}
    if (status) {
      whereClause.status = status
    }
    if (verificationStatus) {
      whereClause.verificationStatus = verificationStatus
    }
    if (search) {
      whereClause[Op.or] = [
        { '$user.email$': { [Op.iLike]: `%${search}%` } },
        { '$user.profile.firstName$': { [Op.iLike]: `%${search}%` } },
        { '$user.profile.lastName$': { [Op.iLike]: `%${search}%` } },
        { '$user.phone$': { [Op.iLike]: `%${search}%` } }
      ]
    }

    const drivers = await Driver.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          include: [
            { model: require('../models').Profile, as: 'profile' }
          ]
        },
        { 
          model: require('../models').Vehicle, 
          as: 'vehicle',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      drivers: drivers.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: drivers.count,
        pages: Math.ceil(drivers.count / parseInt(limit))
      }
    }, 'Drivers retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update driver verification status
 */
const updateDriverVerification = async (req, res, next) => {
  try {
    const { driverId } = req.params
    const { verificationStatus, isVerified } = req.body
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    const updateData = {}
    if (verificationStatus !== undefined) {
      updateData.verificationStatus = verificationStatus
    }
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified
    }

    await driver.update(updateData)

    sendSuccess(res, {
      driver: driver.toJSON()
    }, 'Driver verification status updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get all rides (with filtering and pagination)
 */
const getAllRides = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, startDate, endDate } = req.query
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const whereClause = {}
    if (status) {
      whereClause.status = status
    }
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate)
      }
    }

    const rides = await Ride.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'passenger',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'rating', 'ratingCount'],
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] }
          ]
        },
        { model: Payment, as: 'payment' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      rides: rides.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rides.count,
        pages: Math.ceil(rides.count / parseInt(limit))
      }
    }, 'Rides retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get ride details by ID
 */
const getRideById = async (req, res, next) => {
  try {
    const { rideId } = req.params
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const ride = await Ride.findByPk(rideId, {
      include: [
        { 
          model: User, 
          as: 'passenger',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'rating', 'ratingCount', 'totalRides'],
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] },
            { model: require('../models').Vehicle, as: 'vehicle' }
          ]
        },
        { model: Payment, as: 'payment' },
        { model: Rating, as: 'rating' }
      ]
    })

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Cancel ride by admin
 */
const cancelRideByAdmin = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const { reason } = req.body
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    if (!reason) {
      throw new AppError('Cancellation reason is required', 400, 'MISSING_REASON')
    }

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    // Only allow cancelling active rides
    const cancellableStatuses = [
      RideStatus.PENDING,
      RideStatus.DRIVER_ASSIGNED,
      RideStatus.DRIVER_ARRIVED,
      RideStatus.IN_PROGRESS
    ]
    if (!cancellableStatuses.includes(ride.status)) {
      throw new AppError('Ride cannot be cancelled at this stage', 400, 'RIDE_CANNOT_CANCEL')
    }

    // Update ride
    await ride.update({
      status: RideStatus.CANCELLED_BY_ADMIN,
      cancellationReason: reason,
      cancelledBy: 'admin',
      cancelledAt: new Date()
    })

    // Update driver status if driver was assigned
    if (ride.driverId) {
      await Driver.update(
        { status: DriverStatus.AVAILABLE },
        { where: { id: ride.driverId } }
      )
    }

    // Notify via socket
    const socketService = require('../services/socketService')
    socketService.sendRideStatusUpdate(rideId, 'cancelled', {
      reason,
      cancelledBy: 'admin'
    })
    socketService.removeActiveRide(rideId)

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride cancelled successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get revenue analytics
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = 'today', startDate, endDate } = req.query
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    let whereClause = {}
    if (period !== 'custom') {
      const now = new Date()
      if (period === 'today') {
        whereClause.createdAt = {
          [Op.gte]: new Date(now.setHours(0,0,0,0)),
          [Op.lt]: new Date(now.setHours(23,59,59,999))
        }
      } else if (period === 'yesterday') {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        whereClause.createdAt = {
          [Op.gte]: new Date(yesterday.setHours(0,0,0,0)),
          [Op.lt]: new Date(yesterday.setHours(23,59,59,999))
        }
      } else if (period === 'this_week') {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        whereClause.createdAt = {
          [Op.gte]: Друг: new Date(startOfWeek.setHours(0,0,0,0)),
          [Op.lt]: new Date(now)
        }
      } else if (period === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        whereClause.createdAt = {
          [Op.gte]: startOfMonth,
          [Op.lt]: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        }
      }
    } else {
      if (startDate) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          [Op.gte]: new Date(startDate)
        }
      }
      if (endDate) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          [Op.lte]: new Date(endDate)
        }
      }
    }

    // Only completed rides with payment
    whereClause.status = RideStatus.COMPLETED
    const completedRides = await Ride.findAll({
      where: whereClause,
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('totalFare')), 'grossRevenue'],
        [Sequelize.fn('AVG', Sequelize.col('totalFare')), 'averageFare'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'rideCount']
      ],
      raw: true
    })

    // Driver earnings (what we paid out)
    const driverEarnings = await Ride.findAll({
      where: whereClause,
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('driverEarnings')), 'totalDriverEarnings']
      ],
      raw: true
    })

    // Platform revenue (gross - driver earnings)
    const grossRevenue = parseFloat(completedRides[0].grossRevenue || 0)
    const totalDriverEarnings = parseFloat(driverEarnings[0].totalDriverEarnings || 0)
    const platformRevenue = grossRevenue - totalDriverEarnings

    // Payment method breakdown
    const paymentMethodBreakdown = await Payment.findAll({
      where: {
        status: PaymentStatus.CAPTURED,
        createdAt: whereClause.createdAt
      },
      attributes: [
        'paymentMethod',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['paymentMethod'],
      raw: true
    })

    sendSuccess(res, {
      period,
      dateRange: {
        start: whereClause.createdAt ? whereClause.createdAt[Op.gte] : null,
        end: whereClause.createdAt ? whereClause.createdAt[Op.lte] : null
      },
      grossRevenue,
      platformRevenue,
      totalDriverEarnings,
      averageFare: parseFloat(completedRides[0].averageFare || 0),
      rideCount: parseInt(completedRides[0].rideCount || 0),
      paymentMethodBreakdown
    }, 'Revenue analytics retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get all promotions
 */
const getAllPromotions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const whereClause = {}
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true'
    }

    const promotions = await Promotion.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      promotions: promotions.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: promotions.count,
        pages: Math.ceil(promotions.count / parseInt(limit))
      }
    }, 'Promotions retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Create promotion
 */
const createPromotion = async (req, res, next) => {
  try {
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const {
      code,
      description,
      discountType, // 'percentage' or 'fixed'
      discountValue,
      maxUses,
      maxUsesPerUser,
      startsAt,
      expiresAt,
      isActive = true
    } = req.body

    // Validation
    if (!code || !description || !discountType || discountValue === undefined) {
      throw new AppError('Code, description, discount type, and value are required', 400, 'MISSING_FIELDS')
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      throw new AppError('Discount type must be percentage or fixed', 400, 'INVALID_DISCOUNT_TYPE')
    }

    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      throw new AppError('Percentage discount must be between 0 and 100', 400, 'INVALID_DISCOUNT_VALUE')
    }

    if (discountType === 'fixed' && discountValue < 0) {
      throw new AppError('Fixed discount must be positive', 400, 'INVALID_DISCOUNT_VALUE')
    }

    // Check if code already exists
    const existingPromotion = await Promotion.findOne({ where: { code: code.toUpperCase() } })
    if (existingPromotion) {
      throw new AppError('Promotion code already exists', 409, 'PROMOTION_CODE_EXISTS')
    }

    const promotion = await Promotion.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      maxUses: maxUses || null,
      maxUsesPerUser: maxUsesPerUser || null,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive
    })

    sendSuccess(res, {
      promotion: promotion.toJSON()
    }, 'Promotion created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Get all pricing zones
 */
const getAllPricingZones = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, isActive } = req.query
    
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const whereClause = {}
    if (type) {
      whereClause.type = type
    }
    if (isActive !== undefined) {
      whereClause.status = isActive === 'true' ? 'ACTIVE' : 'INACTIVE'
    }

    const zones = await PricingZone.findAndCountAll({
      where: whereClause,
      order: [['priority', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      zones: zones.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: zones.count,
        pages: Math.ceil(zones.count / parseInt(limit))
      }
    }, 'Pricing zones retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Create pricing zone
 */
const createPricingZone = async (req, res, next) => {
  try {
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const {
      name,
      type,
      baseFareMultiplier,
      perKmMultiplier,
      perMinuteMultiplier,
      minimumFare,
      priority = 0,
      boundaries, // GeoJSON polygon/multipolygon
      peakHours, // Array of { start: 'HH:MM', end: 'HH:MM', multiplier: number }
      restrictedVehicleTypes, // Array of VehicleType
      isActive = true
    } = req.body

    // Validation
    if (!name || !type || boundaries === undefined) {
      throw new AppError('Name, type, and boundaries are required', 400, 'MISSING_FIELDS')
    }

    const zone = await PricingZone.create({
      name,
      type,
      baseFareMultiplier: baseFareMultiplier || 1.0,
      perKmMultiplier: perKmMultiplier || 1.0,
      perMinuteMultiplier: perMinuteMultiplier || 1.0,
      minimumFare: minimumFare || null,
      priority,
      boundaries,
      peakHours: peakHours || [],
      restrictedVehicleTypes: restrictedVehicleTypes || [],
      status: isActive ? 'ACTIVE' : 'INACTIVE'
    })

    // Clear geofencing cache
    await geofencingService.clearCache ? geofencingService.clearCache() : null

    sendSuccess(res, {
      zone: zone.toJSON()
    }, 'Pricing zone created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Get system statistics
 */
const getSystemStats = async (req, res, next) => {
  try {
    if (req.userRole !== UserRole.ADMIN) {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const [
      userCount,
      driverCount,
      activeDriverCount,
      rideCountToday,
      rideCountYesterday,
      pendingRides,
      completedRidesToday,
      cancelledRidesToday
    ] = await Promise.all([
      User.count(),
      Driver.count(),
      Driver.count({ where: { status: DriverStatus.AVAILABLE } }),
      Ride.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date().setHours(0,0,0,0)),
            [Op.lt]: new Date(new Date().setHours(23,59,59,999))
          }
        }
      }),
      Ride.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0,0,0,0),
            [Op.lt]: new Date(new Date().setDate(new Date().getDate() - 1)).setHours(23,59,59,999)
          }
        }
      }),
      Ride.count({ where: { status: RideStatus.PENDING } }),
      Ride.count({
        where: {
          status: RideStatus.COMPLETED,
          createdAt: {
            [Op.gte]: new Date(new Date().setHours(0,0,0,0)),
            [Op.lt]: new Date(new Date().setHours(23,59,59,999))
          }
        }
      }),
      Ride.count({
        where: {
          status: { [Op.in]: [RideStatus.CANCELLED_BY_PASSENGER, RideStatus.CANCELLED_BY_DRIVER, RideStatus.CANCELLED_BY_ADMIN] },
          createdAt: {
            [Op.gte]: new Date(new Date().setHours(0,0,0,0)),
            [Op.lt]: new Date(new Date().setHours(23,59,59,999))
          }
        }
      })
    ])

    sendSuccess(res, {
      users: userCount,
      drivers: driverCount,
      activeDrivers: activeDriverCount,
      ridesToday: rideCountToday,
      ridesYesterday: rideCountYesterday,
      pendingRides,
      completedRidesToday,
      cancelledRidesToday
    }, 'System statistics retrieved successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllDrivers,
  updateDriverVerification,
  getAllRides,
  getRideById,
  cancelRideByAdmin,
  getRevenueAnalytics,
  getAllPromotions,
  createPromotion,
  getAllPricingZones,
  createPricingZone,
  getSystemStats
}