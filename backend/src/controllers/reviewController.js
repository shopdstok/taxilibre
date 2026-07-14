const { Review, Ride, User, Driver } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const { Op } = require('sequelize')
const AppError = require('../middleware/errorMiddleware').AppError

/**
 * Create a review
 */
const createReview = async (req, res, next) => {
  try {
    const { rideId, rating, comment, isPublic = false } = req.body
    const userId = req.userId
    const userRole = req.userRole

    if (!rideId || !rating) {
      throw new AppError('Ride ID and rating are required', 400, 'MISSING_FIELDS')
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING')
    }

    // Get ride details
    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.status !== 'ride_completed') {
      throw new AppError('Ride must be completed to review', 400, 'RIDE_NOT_COMPLETED')
    }

    // Check if user was part of the ride
    if (ride.passengerId !== userId && ride.driverId !== userId) {
      throw new AppError('You can only review rides you participated in', 403, 'ACCESS_DENIED')
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ where: { rideId } })
    if (existingReview) {
      throw new AppError('Review already exists for this ride', 409, 'REVIEW_EXISTS')
    }

    // Determine passenger and driver IDs
    const passengerId = ride.passengerId
    const driverId = ride.driverId

    // Create review
    const review = await Review.create({
      rideId,
      passengerId,
      driverId,
      rating,
      comment,
      isPublic
    })

    // Update driver rating
    if (driverId) {
      const driver = await Driver.findByPk(driverId)
      if (driver) {
        const allReviews = await Review.findAll({ where: { driverId } })
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        await driver.update({ rating: parseFloat(avgRating.toFixed(2)) })
      }
    }

    sendSuccess(res, {
      review: review.toJSON()
    }, 'Review created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Get review details
 */
const getReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params

    const review = await Review.findByPk(reviewId, {
      include: [
        { model: Ride, as: 'ride' },
        { model: User, as: 'passenger' },
        {
          model: Driver,
          as: 'driver',
          include: [{ model: User, as: 'user' }]
        }
      ]
    })

    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND')
    }

    // Check if review is public or user has access
    if (!review.isPublic && review.passengerId !== req.userId && review.driverId !== req.userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    sendSuccess(res, {
      review: review.toJSON()
    }, 'Review retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver reviews
 */
const getDriverReviews = async (req, res, next) => {
  try {
    const { driverId } = req.params
    const { page = 1, limit = 10, rating, isPublic } = req.query

    const whereClause = { driverId }

    if (isPublic !== undefined) {
      whereClause.isPublic = isPublic === 'true'
    }

    if (rating) {
      whereClause.rating = rating
    }

    const reviews = await Review.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'passenger' },
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'createdAt', 'totalPrice']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    // Calculate rating distribution
    const ratingDistribution = await Review.findAll({
      where: { driverId, isPublic: true },
      attributes: [
        [Review.sequelize.fn('COUNT', Review.sequelize.col('id')), 'count'],
        'rating'
      ],
      group: ['rating']
    })

    sendSuccess(res, {
      reviews: reviews.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: reviews.count,
        pages: Math.ceil(reviews.count / parseInt(limit))
      },
      ratingDistribution
    }, 'Driver reviews retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get passenger reviews
 */
const getPassengerReviews = async (req, res, next) => {
  try {
    const { passengerId } = req.params
    const { page = 1, limit = 10 } = req.query

    // Check if user can access these reviews
    if (passengerId !== req.userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const reviews = await Review.findAndCountAll({
      where: { passengerId },
      include: [
        {
          model: Driver,
          as: 'driver',
          include: [
            { model: User, as: 'user' },
            { model: require('../models').Vehicle, as: 'vehicle' }
          ]
        },
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'createdAt', 'totalPrice', 'pickupAddress', 'dropoffAddress']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      reviews: reviews.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: reviews.count,
        pages: Math.ceil(reviews.count / parseInt(limit))
      }
    }, 'Passenger reviews retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update review
 */
const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params
    const { comment, isPublic } = req.body
    const userId = req.userId

    const review = await Review.findByPk(reviewId)
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND')
    }

    // Check if user can update this review
    if (review.passengerId !== userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Check if review can be edited (within 24 hours)
    const timeDiff = Date.now() - review.createdAt.getTime()
    if (timeDiff > 24 * 60 * 60 * 1000 && req.userRole !== 'admin') {
      throw new AppError('Review can only be edited within 24 hours', 400, 'EDIT_TIME_EXPIRED')
    }

    // Update review
    const updatedReview = await review.update({
      comment: comment || review.comment,
      isPublic: isPublic !== undefined ? isPublic : review.isPublic
    })

    sendSuccess(res, {
      review: updatedReview.toJSON()
    }, 'Review updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete review
 */
const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params
    const userId = req.userId

    const review = await Review.findByPk(reviewId)
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND')
    }

    // Check if user can delete this review
    if (review.passengerId !== userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Check if review can be deleted (within 24 hours)
    const timeDiff = Date.now() - review.createdAt.getTime()
    if (timeDiff > 24 * 60 * 60 * 1000 && req.userRole !== 'admin') {
      throw new AppError('Review can only be deleted within 24 hours', 400, 'DELETE_TIME_EXPIRED')
    }

    await review.destroy()

    // Update driver rating
    if (review.driverId) {
      const driver = await Driver.findByPk(review.driverId)
      if (driver) {
        const remainingReviews = await Review.findAll({ where: { driverId: review.driverId } })
        if (remainingReviews.length > 0) {
          const avgRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length
          await driver.update({ rating: parseFloat(avgRating.toFixed(2)) })
        } else {
          await driver.update({ rating: 0 })
        }
      }
    }

    sendSuccess(res, null, 'Review deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Mark review as helpful
 */
const markHelpful = async (req, res, next) => {
  try {
    const { reviewId } = req.params
    const userId = req.userId

    const review = await Review.findByPk(reviewId)
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND')
    }

    // Check if review is public
    if (!review.isPublic) {
      throw new AppError('Cannot mark private review as helpful', 400, 'REVIEW_NOT_PUBLIC')
    }

    // In a real implementation, you'd track which users marked reviews as helpful
    // For now, just increment the count
    await review.update({
      helpfulCount: review.helpfulCount + 1
    })

    sendSuccess(res, {
      helpfulCount: review.helpfulCount + 1
    }, 'Review marked as helpful')
  } catch (error) {
    next(error)
  }
}

/**
 * Report review
 */
const reportReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params
    const { reason } = req.body
    const userId = req.userId

    if (!reason) {
      throw new AppError('Report reason is required', 400, 'MISSING_REASON')
    }

    const review = await Review.findByPk(reviewId)
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND')
    }

    // In a real implementation, you'd create a separate reports table
    // For now, just increment the report count and add to flags
    const flags = review.flags || []
    flags.push({
      userId,
      reason,
      timestamp: new Date()
    })

    await review.update({
      reportCount: review.reportCount + 1,
      flags
    })

    // If report count exceeds threshold, auto-hide review
    if (review.reportCount + 1 >= 5) {
      await review.update({ isActive: false })
    }

    sendSuccess(res, {
      reportCount: review.reportCount + 1
    }, 'Review reported successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createReview,
  getReview,
  getDriverReviews,
  getPassengerReviews,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview
}
