const { Rating, Ride, User, Driver } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const { Op } = require('sequelize')
const AppError = require('../middleware/errorMiddleware').AppError

/**
 * Create a rating
 */
const createRating = async (req, res, next) => {
  try {
    const { rideId, score, comment, categories, isComplaint = false } = req.body
    const userId = req.userId

    if (!rideId || !score) {
      throw new AppError('Ride ID and score are required', 400, 'MISSING_FIELDS')
    }

    if (score < 1 || score > 5) {
      throw new AppError('Score must be between 1 and 5', 400, 'INVALID_SCORE')
    }

    // Get ride details
    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.status !== 'completed') {
      throw new AppError('Ride must be completed to rate', 400, 'RIDE_NOT_COMPLETED')
    }

    // Check if user was part of the ride
    if (ride.passengerId !== userId && ride.driverId !== userId) {
      throw new AppError('You can only rate rides you participated in', 403, 'ACCESS_DENIED')
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({ where: { rideId } })
    if (existingRating) {
      throw new AppError('Rating already exists for this ride', 409, 'RATING_EXISTS')
    }

    // Determine who is rating whom
    let fromUserId, toUserId
    if (ride.passengerId === userId) {
      // Passenger is rating driver
      fromUserId = ride.passengerId
      toUserId = ride.driverId
    } else {
      // Driver is rating passenger
      fromUserId = ride.driverId
      toUserId = ride.passengerId
    }

    // Validate that the user being rated exists
    const userToRate = await User.findByPk(toUserId)
    if (!userToRate) {
      throw new AppError('User to rate not found', 404, 'USER_NOT_FOUND')
    }

    // Create rating
    const rating = await Rating.create({
      rideId,
      fromUserId,
      toUserId,
      score,
      comment: comment || '',
      categories: categories || {},
      isComplaint,
      complaintStatus: isComplaint ? 'PENDING' : null
    })

    // Update rated user's rating
    if (toUserId) {
      await User.updateRating(toUserId)
    }

    sendSuccess(res, {
      rating: rating.toJSON()
    }, 'Rating created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Get rating details
 */
const getRating = async (req, res, next) => {
  try {
    const { ratingId } = req.params

    const rating = await Rating.findByPk(ratingId, {
      include: [
        { model: Ride, as: 'ride' },
        { model: User, as: 'fromUser' },
        { model: User, as: 'toUser' }
      ]
    })

    if (!rating) {
      throw new AppError('Rating not found', 404, 'RATING_NOT_FOUND')
    }

    // Check if user has access to this rating
    const userId = req.userId
    if (rating.fromUserId !== userId && rating.toUserId !== userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    sendSuccess(res, {
      rating: rating.toJSON()
    }, 'Rating retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get ratings for a user (as recipient)
 */
const getUserRatingsReceived = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 10, score, isComplaint } = req.query

    // Check if user can access these ratings
    if (parseInt(userId) !== req.userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const whereClause = { toUserId: userId }
    if (score) {
      whereClause.score = score
    }
    if (isComplaint !== undefined) {
      whereClause.isComplaint = isComplaint === 'true'
    }

    const ratings = await Rating.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'createdAt', 'totalFare', 'pickupAddress', 'dropoffAddress']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    // Calculate rating distribution
    const ratingDistribution = await Rating.findAll({
      where: { toUserId: userId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        'score'
      ],
      group: ['score']
    })

    sendSuccess(res, {
      ratings: ratings.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ratings.count,
        pages: Math.ceil(ratings.count / parseInt(limit))
      },
      ratingDistribution
    }, 'User ratings received retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get ratings given by a user
 */
const getUserRatingsGiven = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 10, score, isComplaint } = req.query

    // Check if user can access these ratings
    if (parseInt(userId) !== req.userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const whereClause = { fromUserId: userId }
    if (score) {
      whereClause.score = score
    }
    if (isComplaint !== undefined) {
      whereClause.isComplaint = isComplaint === 'true'
    }

    const ratings = await Rating.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'toUser', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'createdAt', 'totalFare', 'pickupAddress', 'dropoffAddress']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      ratings: ratings.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ratings.count,
        pages: Math.ceil(ratings.count / parseInt(limit))
      }
    }, 'User ratings given retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update rating
 */
const updateRating = async (req, res, next) => {
  try {
    const { ratingId } = req.params
    const { score, comment, categories } = req.body
    const userId = req.userId

    const rating = await Rating.findByPk(ratingId)
    if (!rating) {
      throw new AppError('Rating not found', 404, 'RATING_NOT_FOUND')
    }

    // Check if user can update this rating (only the rater can update)
    if (rating.fromUserId !== userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Validate score if provided
    if (score !== undefined && (score < 1 || score > 5)) {
      throw new AppError('Score must be between 1 and 5', 400, 'INVALID_SCORE')
    }

    // Update rating
    const updatedRating = await rating.update({
      score: score !== undefined ? score : rating.score,
      comment: comment !== undefined ? comment : rating.comment,
      categories: categories !== undefined ? categories : rating.categories
    })

    // Update rated user's rating if score changed
    if (score !== undefined) {
      await User.updateRating(rating.toUserId)
    }

    sendSuccess(res, {
      rating: updatedRating.toJSON()
    }, 'Rating updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete rating
 */
const deleteRating = async (req, res, next) => {
  try {
    const { ratingId } = req.params
    const userId = req.userId

    const rating = await Rating.findByPk(ratingId)
    if (!rating) {
      throw new AppError('Rating not found', 404, 'RATING_NOT_FOUND')
    }

    // Check if user can delete this rating (only the rater can delete)
    if (rating.fromUserId !== userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const toUserId = rating.toUserId

    await rating.destroy()

    // Update rated user's rating
    if (toUserId) {
      await User.updateRating(toUserId)
    }

    sendSuccess(res, null, 'Rating deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Handle complaint (for admin)
 */
const handleComplaint = async (req, res, next) => {
  try {
    const { ratingId } = req.params
    const { action } = req.body // 'resolve' or 'reject'
    const userId = req.userId
    const userRole = req.userRole

    // Only admin can handle complaints
    if (userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const rating = await Rating.findByPk(ratingId)
    if (!rating) {
      throw new AppError('Rating not found', 404, 'RATING_NOT_FOUND')
    }

    if (!rating.isComplaint) {
      throw new AppError('Rating is not a complaint', 400, 'NOT_A_COMPLAINT')
    }

    if (action === 'resolve') {
      await rating.update({ complaintStatus: 'RESOLVED' })
      sendSuccess(res, { rating: rating.toJSON() }, 'Complaint resolved successfully')
    } else if (action === 'reject') {
      await rating.update({ complaintStatus: 'PENDING' }) // Keep as pending or could add a 'REJECTED' status
      sendSuccess(res, { rating: rating.toJSON() }, 'Complaint rejected successfully')
    } else {
      throw new AppError('Invalid action', 400, 'INVALID_ACTION')
    }
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createRating,
  getRating,
  getUserRatingsReceived,
  getUserRatingsGiven,
  updateRating,
  deleteRating,
  handleComplaint
}