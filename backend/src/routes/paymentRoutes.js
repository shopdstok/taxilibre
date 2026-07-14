const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware')

/**
 * @route   POST /api/v1/payments/create-intent
 * @desc    Create payment intent
 * @access   Private (Passenger)
 */
router.post('/create-intent', authenticateToken, paymentController.createPaymentIntent)

/**
 * @route   POST /api/v1/payments/confirm
 * @desc    Confirm payment
 * @access   Private
 */
router.post('/confirm', optionalAuth, paymentController.confirmPayment)

/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment details
 * @access   Private
 */
router.get('/:paymentId', authenticateToken, paymentController.getPayment)

/**
 * @route   GET /api/v1/payments
 * @desc    Get user payments
 * @access   Private (Passenger)
 */
router.get('/', authenticateToken, paymentController.getUserPayments)

/**
 * @route   POST /api/v1/payments/refund
 * @desc    Create refund
 * @access   Private (Admin)
 */
router.post('/refund', authenticateToken, paymentController.createRefund)

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Handle Stripe webhook
 * @access   Public
 */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook)

module.exports = router
