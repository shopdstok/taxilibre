const { Promotion, User, Ride, Sequelize } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const { Op } = require('sequelize')
const AppError = require('../middleware/errorMiddleware').AppError

/**
 * Create a new promotion
 */
const createPromotion = async (req, res, next) => {
  try {
    const {
      code,
      description,
      type,
      value,
      maxUses,
      maxUsesPerUser,
      minRideAmount,
      startsAt,
      expiresAt,
      applicableZones
    } = req.body

    // Validate required fields
    if (!code || !description || !type || value === undefined) {
      throw new AppError('Code, description, type, and value are required', 400, 'MISSING_FIELDS')
    }

    // Validate promotion type
    const validTypes = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_RIDE']
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid promotion type', 400, 'INVALID_PROMOTION_TYPE')
    }

    // Validate value based on type
    if (type === 'PERCENTAGE' && (value < 0 || value > 100)) {
      throw new AppError('Percentage value must be between 0 and 100', 400, 'INVALID_PERCENTAGE_VALUE')
    }
    
    if (type === 'FIXED_AMOUNT' && value < 0) {
      throw new AppError('Fixed amount value must be positive', 400, 'INVALID_FIXED_AMOUNT_VALUE')
    }
    
    if (type === 'FREE_RIDE' && value !== 1) {
      throw new AppError('Free ride value must be 1 (representing 100% discount)', 400, 'INVALID_FREE_RIDE_VALUE')
    }

    // Validate dates if provided
    if (startsAt && new Date(startsAt) > new Date(expiresAt || '')) {
      throw new AppError('Start date must be before expiration date', 400, 'INVALID_DATE_RANGE')
    }

    // Check if code already exists
    const existingPromotion = await Promotion.findOne({ where: { code: code.toUpperCase() } })
    if (existingPromotion) {
      throw new AppError('Promotion code already exists', 409, 'PROMOTION_CODE_EXISTS')
    }

    // Create promotion
    const promotion = await Promotion.create({
      code: code.toUpperCase(),
      description,
      type,
      value,
      maxUses: maxUses || null,
      maxUsesPerUser: maxUsesPerUser || null,
      minRideAmount: minRideAmount || 0,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      applicableZones: applicableZones || []
    })

    sendSuccess(res, promotion.toJSON(), 'Promotion created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Get promotion details
 */
const getPromotion = async (req, res, next) => {
  try {
    const { promotionId } = req.params

    const promotion = await Promotion.findByPk(promotionId)
    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND')
    }

    sendSuccess(res, promotion.toJSON(), 'Promotion retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get all promotions (with filtering)
 */
const getPromotions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, activeOnly } = req.query

    const whereClause = {}
    if (type) {
      whereClause.type = type
    }
    if (activeOnly) {
      whereClause[Op.or] = [
        { expiresAt: { [Op.gt]: new Date() } },
        { expiresAt: null }
      ]
      whereClause[Op.and] = [
        { startsAt: { [Op.lt]: new Date() } }
      ]
    }

    const promotions = await Promotion.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      promotions: promotions.rows.map(p => p.toJSON()),
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
 * Update promotion
 */
const updatePromotion = async (req, res, next) => {
  try {
    const { promotionId } = req.params
    const updates = req.body

    const promotion = await Promotion.findByPk(promotionId)
    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND')
    }

    // Validate promotion type if being updated
    if (updates.type) {
      const validTypes = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_RIDE']
      if (!validTypes.includes(updates.type)) {
        throw new AppError('Invalid promotion type', 400, 'INVALID_PROMOTION_TYPE')
      }
    }

    // Validate value based on type if being updated
    const typeToValidate = updates.type || promotion.type
    const valueToValidate = updates.value !== undefined ? updates.value : promotion.value
    
    if (typeToValidate === 'PERCENTAGE' && (valueToValidate < 0 || valueToValidate > 100)) {
      throw new AppError('Percentage value must be between 0 and 100', 400, 'INVALID_PERCENTAGE_VALUE')
    }
    
    if (typeToValidate === 'FIXED_AMOUNT' && valueToValidate < 0) {
      throw new AppError('Fixed amount value must be positive', 400, 'INVALID_FIXED_AMOUNT_VALUE')
    }
    
    if (typeToValidate === 'FREE_RIDE' && valueToValidate !== 1) {
      throw new AppError('Free ride value must be 1 (representing 100% discount)', 400, 'INVALID_FREE_RIDE_VALUE')
    }

    // Validate date range if being updated
    const startsAtToValidate = updates.startsAt !== undefined ? new Date(updates.startsAt) : promotion.startsAt
    const expiresAtToValidate = updates.expiresAt !== undefined ? new Date(updates.expiresAt) : promotion.expiresAt
    
    if (startsAtToValidate && expiresAtToValidate && startsAtToValidate > expiresAtToValidate) {
      throw new AppError('Start date must be before expiration date', 400, 'INVALID_DATE_RANGE')
    }

    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates }
    delete allowedUpdates.id
    delete allowedUpdates.createdAt
    delete allowedUpdates.currentUses // This should only be updated through usage

    // If code is being updated, check for uniqueness
    if (updates.code && updates.code !== promotion.code) {
      const existingPromotion = await Promotion.findOne({ where: { code: updates.code.toUpperCase() } })
      if (existingPromotion) {
        throw new AppError('Promotion code already exists', 409, 'PROMOTION_CODE_EXISTS')
      }
      allowedUpdates.code = updates.code.toUpperCase()
    }

    await promotion.update(allowedUpdates)

    sendSuccess(res, promotion.toJSON(), 'Promotion updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete promotion
 */
const deletePromotion = async (req, res, next) => {
  try {
    const { promotionId } = req.params

    const promotion = await Promotion.findByPk(promotionId)
    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND')
    }

    // Optional: Check if promotion has been used
    // if (promotion.currentUses > 0) {
    //   throw new AppError('Cannot delete promotion that has been used', 400, 'PROMOTION_IN_USE')
    // }

    await promotion.destroy()

    sendSuccess(res, { promotionId }, 'Promotion deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Validate and apply promotion to ride
 */
const validatePromotion = async (req, res, next) => {
  try {
    const { code, rideId } = req.body
    const userId = req.userId

    if (!code || !rideId) {
      throw new AppError('Promotion code and ride ID are required', 400, 'MISSING_FIELDS')
    }

    // Get promotion
    const promotion = await Promotion.findOne({
      where: { code: code.toUpperCase() }
    })

    if (!promotion) {
      throw new AppError('Invalid promotion code', 400, 'INVALID_PROMOTION_CODE')
    }

    // Check if promotion is valid
    if (!promotion.isValid()) {
      throw new AppError('Promotion has expired or reached usage limit', 400, 'PROMOTION_INVALID')
    }

    // Get ride
    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    // Check if ride belongs to user
    if (ride.passengerId !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Check if promotion can be applied to this ride
    if (!promotion.canApplyToRide(ride)) {
      throw new AppError('Promotion cannot be applied to this ride', 400, 'PROMOTION_NOT_APPLICABLE')
    }

    // Check if user has exceeded usage limit for this promotion
    if (promotion.usageLimitPerUser) {
      const userUsageCount = await Ride.count({
        where: {
          passengerId: userId,
          promoCode: promotion.code
        }
      })
      
      if (userUsageCount >= promotion.usageLimitPerUser) {
        throw new AppError('You have exceeded the usage limit for this promotion', 400, 'PROMOTION_USAGE_LIMIT_EXCEEDED')
      }
    }

    // Calculate discount
    const discountAmount = promotion.calculateDiscount(ride.totalFare || 0)
    const newTotalFare = (ride.totalFare || 0) - discountAmount

    sendSuccess(res, {
      promotion: promotion.toJSON(),
      discountAmount,
      newTotalFare,
      originalTotal: ride.totalFare || 0
    }, 'Promotion validated successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPromotion,
  getPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  validatePromotion
}