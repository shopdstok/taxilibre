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

/**
 * ========== DRIVER CONNECT ACCOUNT ENDPOINTS ==========
 */

/**
 * @route   POST /api/v1/payments/connect/account
 * @desc    Create Stripe Connect account for driver
 * @access   Private (Driver)
 */
router.post('/connect/account', authenticateToken, paymentController.createDriverConnectAccount)

/**
 * @route   GET /api/v1/payments/connect/account
 * @desc    Get driver's Stripe Connect account information
 * @access   Private (Driver)
 */
router.get('/connect/account', authenticateToken, paymentController.getDriverConnectAccount)

/**
 * @route   GET /api/v1/payments/connect/account/link
 * @desc    Get or create account link for driver onboarding
 * @access   Private (Driver)
 */
router.get('/connect/account/link', authenticateToken, paymentController.getDriverOnboardingLink)

/**
 * @route   POST /api/v1/payments/connect/payout
 * @desc    Initiate a payout to driver's connected account
 * @access   Private (Driver)
 */
router.post('/connect/payout', authenticateToken, paymentController.initiateDriverPayout)

/**
 * @route   GET /api/v1/payments/connect/payouts
 * @desc    Get driver's payout history
 * @access   Private (Driver)
 */
router.get('/connect/payouts', authenticateToken, paymentController.getDriverPayoutHistory)

module.exports = router