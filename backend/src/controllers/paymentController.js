const { Payment, Ride, PaymentStatus, PaymentMethod, Driver } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const {
  stripe,
  createPaymentIntent: createStripePaymentIntent,
  confirmPaymentIntent,
  retrievePaymentIntent,
  createRefund: createStripeRefund,
  constructWebhookEvent,
  createConnectAccount,
  getAccountLink,
  retrieveConnectAccount,
  updateConnectAccount,
  createConnectedPaymentIntent,
  confirmConnectedPaymentIntent,
  createPayout,
  retrievePayout,
  processConnectWebhookEvent,
  calculateNetPayout
} = require('../services/stripe')
const AppError = require('../middleware/errorMiddleware').AppError
const { logger } = require('../services/loggingService')
const { sequelize } = require('../config/database')

/**
 * Create payment intent for a ride (passenger pays to platform)
 */
const createPaymentIntent = async (req, res, next) => {
  logger.debug('Payment Controller: createPaymentIntent called', { 
    reqBody: req.body, 
    userId: req.userId 
  })
  try {
    const { rideId, amount } = req.body

    if (!rideId || !amount) {
      throw new AppError('Ride ID and amount are required', 400, 'MISSING_FIELDS')
    }

    // Verify ride exists and belongs to user
    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.passengerId !== req.userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Check if ride is completed
    if (ride.status !== RideStatus.COMPLETED) {
      throw new AppError('Ride must be completed to create payment', 400, 'RIDE_NOT_COMPLETED')
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ where: { rideId } })
    if (!existingPayment) {
      throw new AppError('No payment record found for this ride', 404, 'PAYMENT_NOT_FOUND')
    }

    // Check if payment is already processed
    if (existingPayment.status !== PaymentStatus.PENDING) {
      throw new AppError('Payment is already processed', 409, 'PAYMENT_ALREADY_PROCESSED')
    }

    // Create Stripe payment intent (passenger pays to our platform)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
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

    // Update existing payment record with Stripe details
    await Payment.update(
      {
        stripePaymentIntentId: paymentIntent.id,
        amount: amount // Ensure amount matches
      },
      { where: { rideId } }
    )

    // Fetch the updated payment record
    const updatedPayment = await Payment.findByPk(rideId)

    sendSuccess(res, {
      payment: updatedPayment.toJSON(),
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }, 'Payment intent created successfully', 201)
  } catch (error) {
    logger.error('Payment Controller: error caught:', error)
    next(error)
  }
}

/**
 * Confirm payment (passenger payment succeeded)
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
      status: PaymentStatus.CAPTURED,
      stripeChargeId: paymentIntent.charges.data[0]?.id,
      processedAt: new Date(),
      failureReason: null
    })

    // Update ride status and process driver earnings
    const ride = await Ride.findByPk(payment.rideId)
    if (ride) {
      await ride.update({
        status: RideStatus.COMPLETED,
        paymentStatus: 'paid'
      })

      // Process driver earnings if ride has a driver
      if (ride.driverId) {
        await processDriverEarnings(ride, paymentIntent.amount / 100) // Convert from cents
      }
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
 * Process driver earnings after successful passenger payment
 * @param {Object} ride - Ride object
 * @param {number} amount - Amount paid by passenger (in currency units)
 */
const processDriverEarnings = async (ride, amount) => {
  try {
    // Get the driver
    const driver = await Driver.findByPk(ride.driverId)
    if (!driver) {
      logger.warn('Driver not found for earnings processing', { 
        rideId: ride.id,
        driverId: ride.driverId
      })
      return
    }

    // Calculate platform commission (e.g., 20%)
    const commissionRate = 0.20 // 20% platform fee
    const platformFee = amount * commissionRate
    const driverEarnings = amount - platformFee

    // Update driver's earnings and wallet balance
    await Driver.increment({
      totalEarnings: driverEarnings,
      weeklyEarnings: driverEarnings,
      walletBalance: driverEarnings
    }, {
      where: { id: ride.driverId }
    })

    // Log the transaction
    logger.info(`Driver earnings processed`, {
      rideId: ride.id,
      driverId: ride.driverId,
      passengerAmount: amount,
      platformFee,
      driverEarnings,
      newTotalEarnings: driver.totalEarnings + driverEarnings,
      newWeeklyEarnings: driver.weeklyEarnings + driverEarnings,
      newWalletBalance: driver.walletBalance + driverEarnings
    })

    // TODO: Trigger automatic payout if driver has automatic payout enabled
    // For now, earnings accumulate in wallet until driver requests payout or scheduled payout runs

  } catch (error) {
    logger.error('Error processing driver earnings', { 
      error,
      rideId: ride.id,
      driverId: ride.driverId
    })
    // Don't throw - we don't want to fail the passenger payment due to driver earnings processing
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
            { model: User, as: 'passenger' },
            {
              model: Driver,
              as: 'driver',
              include: [{ model: User, as: 'user' }]
            }
          ]
        }
      ]
    })

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND')
    }

    // Check if user has access to this payment
    if (payment.ride.passengerId !== req.userId && req.userRole !== 'ADMIN') {
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

    const whereClause = {}
    if (status) {
      whereClause.status = status
    }

    const payments = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Ride,
          as: 'ride',
          where: { passengerId: userId },
          include: [
            { model: User, as: 'passenger' }
          ]
        }
      ],
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

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new AppError('Payment must be captured to refund', 400, 'PAYMENT_NOT_CAPTURED')
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
      status: PaymentStatus.REFUNDED,
      processedAt: new Date(),
      failureReason: null
    })

    // Update ride status if needed
    const ride = await Ride.findByPk(payment.rideId)
    if (ride) {
      await ride.update({
        paymentStatus: 'refunded'
      })
    }

    // If refunding driver earnings, deduct from driver wallet
    if (ride && ride.driverId) {
      const refundAmount = amount || (payment.amount / 100) // If amount not specified, refund full amount
      await Driver.decrement({
        walletBalance: refundAmount
      }, {
        where: { id: ride.driverId }
      })
    }

    sendSuccess(res, {
      payment: payment.toJSON(),
      refund
    }, 'Refund created successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Handle Stripe webhook (standard payments)
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
        logger.debug(`Unhandled Stripe webhook event type: ${event.type}`)
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
        status: PaymentStatus.CAPTURED,
        stripeChargeId: paymentIntent.charges.data[0]?.id,
        processedAt: new Date(),
        failureReason: null
      })

      // Update ride status and process driver earnings
      const ride = await Ride.findByPk(payment.rideId)
      if (ride) {
        await ride.update({
          status: RideStatus.COMPLETED,
          paymentStatus: 'paid'
        })

        // Process driver earnings if ride has a driver
        if (ride.driverId) {
          await processDriverEarnings(ride, paymentIntent.amount / 100) // Convert from cents
        }
      }
    }
  } catch (error) {
    logger.error('Error handling payment succeeded webhook', { 
      error,
      paymentIntentId: paymentIntent.id
    })
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
        status: PaymentStatus.FAILED,
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        processedAt: new Date()
      })

      // Update ride status
      const ride = await Ride.findByPk(payment.rideId)
      if (ride) {
        await ride.update({
          paymentStatus: 'failed'
        })
      }
    }
  } catch (error) {
    logger.error('Error handling payment failed webhook', { 
      error,
      paymentIntentId: paymentIntent.id
    })
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
        status: PaymentStatus.FAILED,
        failureReason: 'Payment canceled',
        processedAt: new Date()
      })

      // Update ride status
      const ride = await Ride.findByPk(payment.rideId)
      if (ride) {
        await ride.update({
          paymentStatus: 'canceled'
        })
      }
    }
  } catch (error) {
    logger.error('Error handling payment canceled webhook', { 
      error,
      paymentIntentId: paymentIntent.id
    })
  }
}

/**
 * ========== DRIVER CONNECT ACCOUNT ENDPOINTS ==========
 */

/**
 * Create Stripe Connect account for driver
 */
const createDriverConnectAccount = async (req, res, next) => {
  try {
    const driverId = req.driverId
    
    // Check if driver exists
    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    // Check if driver already has a Connect account
    if (driver.stripeConnectId) {
      throw new AppError('Driver already has a Stripe Connect account', 400, 'CONNECT_ACCOUNT_EXISTS')
    }

    // Get driver's user information
    const user = await User.findByPk(driver.userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Prepare driver data for Connect account creation
    const driverData = {
      driverId: driver.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      // Address would need to be collected from driver during onboarding
      addressLine1: '', // TODO: Collect from driver
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IE', // Default to Ireland
      dateOfBirth: '' // TODO: Collect from driver
    }

    // Create the Connect account
    const result = await createConnectAccount(driverData)

    // Save the Connect account ID to the driver
    await driver.update({
      stripeConnectId: result.accountId
    })

    sendSuccess(res, {
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
      requiresAction: result.requiresAction
    }, 'Stripe Connect account created successfully', 201)
  } catch (error) {
    logger.error('Error creating driver Connect account', { 
      error,
      driverId: req.driverId
    })
    next(error)
  }
}

/**
 * Get driver's Stripe Connect account information
 */
const getDriverConnectAccount = async (req, res, next) => {
  try {
    const driverId = req.driverId
    
    // Get driver with their Connect account ID
    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    if (!driver.stripeConnectId) {
      throw new AppError('Driver does not have a Stripe Connect account', 404, 'CONNECT_ACCOUNT_NOT_FOUND')
    }

    // Retrieve the Connect account from Stripe
    const accountInfo = await retrieveConnectAccount(driver.stripeConnectId)

    sendSuccess(res, {
      driverId: driver.id,
      stripeConnectId: driver.stripeConnectId,
      isVerified: driver.isVerified,
      verificationStatus: driver.verificationStatus,
      stripeAccount: accountInfo.account
    }, 'Driver Connect account retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get or create account link for driver onboarding
 */
const getDriverOnboardingLink = async (req, res, next) => {
  try {
    const driverId = req.driverId
    
    // Get driver
    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    if (!driver.stripeConnectId) {
      throw new AppError('Driver does not have a Stripe Connect account', 400, 'CONNECT_ACCOUNT_NOT_FOUND')
    }

    // Get or create account link
    const accountLink = await getAccountLink(driver.stripeConnectId, driverId)

    sendSuccess(res, {
      url: accountLink.url,
      expiresAt: accountLink.expiresAt
    }, 'Account link retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Initiate a payout to driver's connected account
 */
const initiateDriverPayout = async (req, res, next) => {
  try {
    const driverId = req.driverId
    const { amount } = req.body

    // Get driver
    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    if (!driver.stripeConnectId) {
      throw new AppError('Driver does not have a Stripe Connect account', 400, 'CONNECT_ACCOUNT_NOT_FOUND')
    }

    // Validate amount
    let payoutAmount
    if (amount !== undefined) {
      if (amount <= 0) {
        throw new AppError('Payout amount must be greater than 0', 400, 'INVALID_AMOUNT')
      }
      payoutAmount = amount
    } else {
      // Payout entire wallet balance
      payoutAmount = driver.walletBalance
    }

    if (payoutAmount > driver.walletBalance) {
      throw new AppError('Insufficient wallet balance for payout', 400, 'INSUFFICIENT_BALANCE')
    }

    // Check if payout method allows this payout
    // For now, we'll allow any amount, but in production you'd check against payoutMethod (daily/weekly/monthly limits)

    // Create the payout
    const payoutResult = await createPayout({
      driverStripeId: driver.stripeConnectId,
      amount: payoutAmount,
      currency: 'eur',
      method: 'standard' // Could be 'instant' for immediate payout (higher fee)
    })

    // Deduct from driver's wallet balance
    await driver.decrement({
      walletBalance: payoutAmount
    })

    logger.info(`Driver payout initiated`, {
      driverId: driver.id,
      amount: payoutAmount,
      payoutId: payoutResult.payout.id
    })

    sendSuccess(res, {
      payoutId: payoutResult.payout.id,
      amount: payoutResult.payout.amount,
      status: payoutResult.payout.status,
      newWalletBalance: driver.walletBalance - payoutAmount
    }, 'Payout initiated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver's payout history
 */
const getDriverPayoutHistory = async (req, res, next) => {
  try {
    const driverId = req.driverId
    
    // Get driver
    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    if (!driver.stripeConnectId) {
      throw new AppError('Driver does not have a Stripe Connect account', 404, 'CONNECT_ACCOUNT_NOT_FOUND')
    }

    // TODO: In a real implementation, you'd query Stripe for payouts connected to this account
    // For now, we'll return a placeholder
    
    sendSuccess(res, {
      driverId: driver.id,
      stripeConnectId: driver.stripeConnectId,
      payouts: [], // Would be populated from Stripe API
      message: 'Payout history feature coming soon'
    }, 'Payout history retrieved')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPayment,
  getUserPayments,
  createRefund,
  handleStripeWebhook,
  // Driver Connect Account endpoints
  createDriverConnectAccount,
  getDriverConnectAccount,
  getDriverOnboardingLink,
  initiateDriverPayout,
  getDriverPayoutHistory
}