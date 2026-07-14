const { User, Driver } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')
const AppError = require('../middleware/errorMiddleware').AppError

/**
 * Get user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.userId

    const user = await User.findByPk(userId, {
      include: req.userRole === 'driver' ? [{ model: Driver, as: 'driver' }] : []
    })

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    sendSuccess(res, {
      user: user.toJSON()
    }, 'Profile retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.userId
    const { name, phone, avatar } = req.body

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Update user
    const updatedUser = await user.update({
      name: name || user.name,
      phone: phone || user.phone,
      avatar: avatar || user.avatar
    })

    sendSuccess(res, {
      user: updatedUser.toJSON()
    }, 'Profile updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.userId

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400, 'MISSING_PASSWORDS')
    }

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword)
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD')
    }

    // Update password
    await user.update({ password: newPassword })

    sendSuccess(res, null, 'Password changed successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete user account
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body
    const userId = req.userId

    if (!password) {
      throw new AppError('Password is required to delete account', 400, 'MISSING_PASSWORD')
    }

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new AppError('Password is incorrect', 401, 'INVALID_PASSWORD')
    }

    // Deactivate user (soft delete)
    await user.update({ isActive: false })

    sendSuccess(res, null, 'Account deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get user statistics
 */
const getStatistics = async (req, res, next) => {
  try {
    const userId = req.userId
    const userRole = req.userRole

    let statistics = {}

    if (userRole === 'passenger') {
      // Passenger statistics
      const { Ride } = require('../models')
      const { Op } = require('sequelize')

      const totalRides = await Ride.count({
        where: { passengerId: userId }
      })

      const completedRides = await Ride.count({
        where: {
          passengerId: userId,
          status: 'ride_completed'
        }
      })

      const totalSpent = await Ride.sum('finalPrice', {
        where: {
          passengerId: userId,
          status: 'ride_completed',
          finalPrice: { [Op.not]: null }
        }
      }) || 0

      statistics = {
        totalRides,
        completedRides,
        cancelledRides: totalRides - completedRides,
        totalSpent: parseFloat(totalSpent),
        currency: 'EUR'
      }
    } else if (userRole === 'driver') {
      // Driver statistics
      const driver = await Driver.findOne({ where: { userId } })

      if (driver) {
        statistics = {
          totalRides: driver.totalRides,
          totalEarnings: parseFloat(driver.totalEarnings),
          averageRating: parseFloat(driver.rating),
          status: driver.status,
          verificationStatus: driver.verificationStatus,
          currency: 'EUR'
        }
      }
    }

    sendSuccess(res, {
      statistics
    }, 'User statistics retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update notification preferences
 */
const updateNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.userId
    const {
      pushNotificationsEnabled,
      emailNotificationsEnabled,
      smsNotificationsEnabled,
      rideUpdateNotifications,
      promotionNotifications,
      emergencyNotifications
    } = req.body

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Update notification preferences
    await user.update({
      pushNotificationsEnabled,
      emailNotificationsEnabled,
      smsNotificationsEnabled,
      rideUpdateNotifications,
      promotionNotifications,
      emergencyNotifications
    })

    sendSuccess(res, {
      user: user.toJSON()
    }, 'Notification preferences updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Upload avatar
 */
const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.userId

    if (!req.file) {
      throw new AppError('Avatar file is required', 400, 'MISSING_FILE')
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    await user.update({ avatar: avatarUrl })

    sendSuccess(res, {
      user: user.toJSON(),
      avatarUrl
    }, 'Avatar uploaded successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get user rides history
 */
const getRideHistory = async (req, res, next) => {
  try {
    const userId = req.userId
    const { status, page = 1, limit = 10, startDate, endDate } = req.query

    const { Ride } = require('../models')
    const { Op } = require('sequelize')

    const whereClause = { passengerId: userId }

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
        { model: User, as: 'passenger' },
        {
          model: Driver,
          as: 'driver',
          include: [
            { model: User, as: 'user' },
            { model: require('../models').Vehicle, as: 'vehicle' }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    res.json(successResponse({
      rides: rides.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rides.count,
        pages: Math.ceil(rides.count / parseInt(limit))
      }
    }, 'Ride history retrieved successfully'))
  } catch (error) {
    next(error)
  }
}

/**
 * Search users (admin only)
 */
const searchUsers = async (req, res, next) => {
  try {
    const { query, role, page = 1, limit = 10 } = req.query

    if (req.userRole !== 'admin') {
      throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const whereClause = {}

    if (query) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
        { phone: { [Op.iLike]: `%${query}%` } }
      ]
    }

    if (role) {
      whereClause.role = role
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      include: role === 'driver' ? [{ model: Driver, as: 'driver' }] : [],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    res.json(successResponse({
      users: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        pages: Math.ceil(users.count / parseInt(limit))
      }
    }, 'Users searched successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getStatistics,
  updateNotificationPreferences,
  uploadAvatar,
  getRideHistory,
  searchUsers
}
