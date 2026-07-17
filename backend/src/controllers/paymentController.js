const { Payment, Ride } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const { stripe } = require('../config/stripe')
const AppError = require('../middleware/errorMiddleware').AppError
const { logger } = require('../services/loggingService')

/**
 * Create payment intent for a ride
 */
const createPaymentIntent = async (req, res, next) => {
  logger.debug('Payment Controller: createPaymentIntent called', { reqBody: req.body, userId: req.userId });
  try {
    const { rideId, amount, currency = 'eur' } = req.body

    if (!rideId || !amount) {
      throw new AppError('Ride ID and amount are required', 400, 'MISSING_FIELDS')
    }

    // Verify ride exists and belongs to user
    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    logger.debug('Payment Controller: ride passengerId:', ride.passengerId, 'req.userId:', req.userId)
    if (ride.passengerId !== req.userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    if (ride.status !== 'ride_completed') {
      throw new AppError('Ride must be completed to create payment', 400, 'RIDE_NOT_COMPLETED')
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ where: { rideId } })
    if (existingPayment) {
      throw new AppError('Payment already exists for this ride', 409, 'PAYMENT_EXISTS')
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      capture_method: 'automatic',
      metadata: {
        rideId,
        platform: 'taxilibre',
        passengerId: req.userId
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    })

    // Create payment record
    const payment = await Payment.create({
      rideId,
      amount,
      paymentMethod: 'card',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      transactionId: paymentIntent.id,
      platformFee: amount * 0.15,
      driverEarnings: amount * 0.85,
      currency: currency.toUpperCase()
    })

    sendSuccess(res, {
      payment: payment.toJSON(),
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }, 'Payment intent created successfully', 201)
  } catch (error) {
    logger.error('Payment Controller: error caught:', error)
    next(error)
  }
}

/**
 * Confirm payment
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body

    if (!paymentIntentId) {
      throw new AppError('Payment intent ID is required', 400, 'MISSING_PAYMENT_INTENT')
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('Payment not successful', 400, 'PAYMENT_NOT_SUCCESSFUL')
    }

    // Find payment record
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntentId }
    })

    if (!payment) {
      throw new AppError('Payment record not found', 404, 'PAYMENT_NOT_FOUND')
    }

    // Update payment record
    await payment.update({
      status: 'completed',
      stripeChargeId: paymentIntent.charges.data[0]?.id,
      processedAt: new Date()
    })

    // Update ride payment status
    const ride = await Ride.findByPk(payment.rideId)
    if (ride) {
      await ride.update({ paymentStatus: 'paid' })
    }

    sendSuccess(res, {
      payment: payment.toJSON(),
      paymentIntent
    }, 'Payment confirmed successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get payment details
 */
const getPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params

    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Ride,
          as: 'ride',
          include: [
            { model: require('../models').User, as: 'passenger' },
            {
              model: require('../models').Driver,
              as: 'driver',
              include: [{ model: require('../models').User, as: 'user' }]
            }
          ]
        }
      ]
    })

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND')
    }

    // Check if user has access to this payment
    if (payment.ride.passengerId !== req.userId && req.userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    sendSuccess(res, {
      payment: payment.toJSON()
    }, 'Payment details retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get user payments
 */
const getUserPayments = async (req, res, next) => {
  try {
    const userId = req.userId
    const { status, page = 1, limit = 10 } = req.query

    const payments = await Payment.findAndCountAll({
      include: [
        {
          model: Ride,
          as: 'ride',
          where: { passengerId: userId },
          include: [
            { model: require('../models').User, as: 'passenger' }
          ]
        }
      ],
      where: status ? { status } : {},
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      payments: payments.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: payments.count,
        pages: Math.ceil(payments.count / parseInt(limit))
      }
    }, 'User payments retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Create refund
 */
const createRefund = async (req, res, next) => {
  try {
    const { paymentId, reason, amount } = req.body

    if (!paymentId || !reason) {
      throw new AppError('Payment ID and reason are required', 400, 'MISSING_FIELDS')
    }

    const payment = await Payment.findByPk(paymentId)
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND')
    }

    if (payment.status !== 'completed') {
      throw new AppError('Payment must be completed to refund', 400, 'PAYMENT_NOT_COMPLETED')
    }

    if (!payment.canBeRefunded()) {
      throw new AppError('Payment cannot be refunded', 400, 'PAYMENT_CANNOT_REFUND')
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        paymentId,
        reason,
        platform: 'taxilibre'
      }
    })

    // Update payment record
    await payment.update({
      status: refund.status === 'succeeded' ? 'refunded' : 'partially_refunded',
      refundReason: reason,
      refundAmount: refund.amount / 100, // Convert back from cents
      processedAt: new Date()
    })

    sendSuccess(res, {
      payment: payment.toJSON(),
      refund
    }, 'Refund created successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Handle Stripe webhook
 */
const handleStripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!sig || !webhookSecret) {
      throw new AppError('Webhook signature missing', 400, 'WEBHOOK_SIGNATURE_MISSING')
    }

    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      return sendError(res, 'Webhook signature verification failed', 400)
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object)
        break

      default:
    }

    sendSuccess(res, { received: true })
  } catch (error) {
    next(error)
  }
}

/**
 * Handle payment succeeded webhook event
 */
async function handlePaymentSucceeded (paymentIntent) {
  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    })

    if (payment) {
      await payment.update({
        status: 'completed',
        stripeChargeId: paymentIntent.charges.data[0]?.id,
        processedAt: new Date()
      })

      // Update ride payment status
      const ride = await Ride.findByPk(payment.rideId)
      if (ride) {
        await ride.update({ paymentStatus: 'paid' })
      }
    }
  } catch (error) {
  }
}

/**
 * Handle payment failed webhook event
 */
async function handlePaymentFailed (paymentIntent) {
  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    })

    if (payment) {
      await payment.update({
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        processedAt: new Date()
      })
    }
  } catch (error) {
  }
}

/**
 * Handle payment canceled webhook event
 */
async function handlePaymentCanceled (paymentIntent) {
  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    })

    if (payment) {
      await payment.update({
        status: 'failed',
        failureReason: 'Payment canceled',
        processedAt: new Date()
      })
    }
  } catch (error) {
  }
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPayment,
  getUserPayments,
  createRefund,
  handleStripeWebhook
}
