const express = require('express')
const router = express.Router()
const reviewController = require('../controllers/reviewController')
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware')

/**
 * @route   POST /api/reviews
 * @desc    Create a review
 * @access   Private
 */
router.post('/', authenticateToken, reviewController.createReview)

/**
 * @route   GET /api/reviews/:reviewId
 * @desc    Get review details
 * @access   Public
 */
router.get('/:reviewId', optionalAuth, reviewController.getReview)

/**
 * @route   GET /api/reviews/driver/:driverId
 * @desc    Get driver reviews
 * @access   Public
 */
router.get('/driver/:driverId', optionalAuth, reviewController.getDriverReviews)

/**
 * @route   GET /api/reviews/passenger/:passengerId
 * @desc    Get passenger reviews
 * @access   Private
 */
router.get('/passenger/:passengerId', authenticateToken, reviewController.getPassengerReviews)

/**
 * @route   PUT /api/reviews/:reviewId
 * @desc    Update review
 * @access   Private
 */
router.put('/:reviewId', authenticateToken, reviewController.updateReview)

/**
 * @route   DELETE /api/reviews/:reviewId
 * @desc    Delete review
 * @access   Private
 */
router.delete('/:reviewId', authenticateToken, reviewController.deleteReview)

/**
 * @route   POST /api/reviews/:reviewId/helpful
 * @desc    Mark review as helpful
 * @access   Private
 */
router.post('/:reviewId/helpful', authenticateToken, reviewController.markHelpful)

/**
 * @route   POST /api/reviews/:reviewId/report
 * @desc    Report review
 * @access   Private
 */
router.post('/:reviewId/report', authenticateToken, reviewController.reportReview)

module.exports = router
