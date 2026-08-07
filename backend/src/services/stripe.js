const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { Ride, Driver, User, Payment } = require('../models')
const { sequelize } = require('../config/database')
const { logger } = require('../services/loggingService')
const crypto = require('crypto')

/**
 * Create a Stripe Connect Express account for a driver
 * @param {Object} driverData - Driver information
 * @returns {Object} Stripe account object
 */
const createConnectAccount = async (driverData) => {
  try {
    const {
      driverId,
      email,
      firstName,
      lastName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      dateOfBirth,
      ssnLast4 // For individuals - in production, use proper identity verification
    } = driverData

    // Create the Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country || 'IE',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      individual: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        address: {
          line1: addressLine1,
          line2: addressLine2,
          city: city,
          state: state,
          postal_code: postalCode,
          country: country
        },
        dob: {
          day: dateOfBirth ? new Date(dateOfBirth).getDate() : null,
          month: dateOfBirth ? new Date(dateOfBirth).getMonth() + 1 : null,
          year: dateOfBirth ? new Date(dateOfBirth).getFullYear() : null
        },
        // In production, you would collect proper ID verification
        // ssn_last_4: ssnLast4 // Only for US, for other countries use appropriate verification
      },
      business_profile: {
        mcc: '4121', // Taxicabs and limousines
        url: 'https://taxilibre.ie',
        product_description: 'Ride-hailing driver services'
      },
      metadata: {
        driverId: driverId.toString(),
        platform: 'taxilibre'
      }
    })

    logger.info(`Stripe Connect account created for driver ${driverId}`, { 
      accountId: account.id,
      driverId
    })

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: account.capabilities.transfers.pending ? 
        `https://connect.stripe.com/express/${account.id}/oauth/authorize` : 
        null,
      requiresAction: account.requirements.currently_due.length > 0 ||
                     account.requirements.past_due.length > 0 ||
                     account.requirements.pending_verification.length > 0
    }
  } catch (error) {
    logger.error('Error creating Stripe Connect account', { 
      error, 
      driverData: { driverId: driverData.driverId }
    })
    throw error
  }
}

/**
 * Get or create a Stripe Connect account link for onboarding
 * @param {string} accountId - Stripe Connect account ID
 * @param {string} driverId - Driver ID
 * @returns {Object} Account link object
 */
const getAccountLink = async (accountId, driverId) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/driver/onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL}/driver/onboarding/complete`,
      type: 'account_onboarding',
      metadata: {
        driverId: driverId.toString()
      }
    })

    return {
      success: true,
      url: accountLink.url,
      expiresAt: accountLink.expires_at
    }
  } catch (error) {
    logger.error('Error creating Stripe Connect account link', { 
      error, 
      accountId,
      driverId
    })
    throw error
  }
}

/**
 * Retrieve a Stripe Connect account
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Object} Stripe account object
 */
const retrieveConnectAccount = async (accountId) => {
  try {
    const account = await stripe.accounts.retrieve(accountId)
    
    return {
      success: true,
      account: {
        id: account.id,
        capability: {
          card_payments: account.capabilities.card_payments,
          transfers: account.capabilities.transfers
        },
        requirements: {
          currently_due: account.requirements.currently_due,
          past_due: account.requirements.past_due,
          pending_verification: account.requirements.pending_verification,
          disabled_reason: account.requirements.disabled_reason
        },
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      }
    }
  } catch (error) {
    logger.error('Error retrieving Stripe Connect account', { 
      error, 
      accountId
    })
    throw error
  }
}

/**
 * Update driver's Stripe Connect account information
 * @param {string} accountId - Stripe Connect account ID
 * @param {Object} updates - Information to update
 * @returns {Object} Updated account
 */
const updateConnectAccount = async (accountId, updates) => {
  try {
    const account = await stripe.accounts.update(accountId, updates)
    
    return {
      success: true,
      account
    }
  } catch (error) {
    logger.error('Error updating Stripe Connect account', { 
      error, 
      accountId
    })
    throw error
  }
}

/**
 * Create a payment intent on behalf of a connected account (destination charge)
 * @param {Object} paymentData - Payment information
 * @param {string} driverStripeId - Driver's Stripe Connect account ID
 * @returns {Object} Payment intent
 */
const createConnectedPaymentIntent = async ({ paymentData, driverStripeId }) => {
  try {
    const {
      amount,
      currency = 'eur',
      rideId,
      passengerId,
      paymentMethodId,
      metadata = {}
    } = paymentData

    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    // Create payment intent with destination charge to driver's Connect account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      payment_method_options: {
        card: {
          request_three_d_secure: 'any'
        }
      },
      confirmation_method: paymentMethodId ? 'manual' : 'automatic',
      confirm: !!paymentMethodId,
      payment_method: paymentMethodId,
      // Destination charge - transfer to driver's account after Stripe fee
      transfer_data: {
        destination: driverStripeId,
        // Amount to transfer to driver (we'll calculate this after Stripe fees)
        // For now, we'll send the full amount and handle fees separately
        // In production, you'd calculate the net amount after Stripe fees
      },
      metadata: {
        rideId: rideId || 'unknown',
        passengerId: passengerId || 'anonymous',
        driverStripeId: driverStripeId || 'unknown',
        platform: 'taxilibre',
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    })

    // If we provided a payment method and need to confirm
    if (paymentMethodId && paymentIntent.status === 'requires_action') {
      // Handle 3D Secure authentication if needed
      return {
        success: true,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      }
    }

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === 'requires_action'
    }
  } catch (error) {
    logger.error('Error creating connected payment intent', { 
      error, 
      paymentData,
      driverStripeId
    })
    throw error
  }
}

/**
 * Confirm a payment intent that requires action (3D Secure, etc)
 * @param {string} paymentIntentId - Payment intent ID
 * @param {string} paymentMethodId - Payment method ID (if not already attached)
 * @returns {Object} Confirmation result
 */
const confirmConnectedPaymentIntent = async ({ paymentIntentId, paymentMethodId }) => {
  try {
    const confirmParams = {}
    
    if (paymentMethodId) {
      confirmParams.payment_method = paymentMethodId
    }

    const paymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentId,
      confirmParams
    )

    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret
      },
      requiresAction: paymentIntent.status === 'requires_action'
    }
  } catch (error) {
    logger.error('Error confirming connected payment intent', { 
      error, 
      paymentIntentId,
      paymentMethodId
    })
    throw error
  }
}

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Object} Payment intent
 */
const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        amountReceived: paymentIntent.amount_received,
        metadata: paymentIntent.metadata,
        paymentMethodDetails: paymentIntent.payment_method_details,
        charges: paymentIntent.charges.data
      }
    }
  } catch (error) {
    logger.error('Error retrieving payment intent', { 
      error, 
      paymentIntentId
    })
    throw error
  }
}

/**
 * Create a refund for a connected payment
 * @param {string} paymentIntentId - Payment intent ID
 * @param {number} amount - Amount to refund (in currency units)
 * @param {string} reason - Refund reason
 * @returns {Object} Refund
 */
const createConnectedRefund = async ({ paymentIntentId, amount, reason }) => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer'
    }

    if (amount) {
      refundParams.amount = Math.round(amount * 100) // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams)

    return {
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      }
    }
  } catch (error) {
    logger.error('Error creating connected refund', { 
      error, 
      paymentIntentId,
      amount,
      reason
    })
    throw error
  }
}

/**
 * Initiate a payout to a driver's connected account
 * @param {string} driverStripeId - Driver's Stripe Connect account ID
 * @param {number} amount - Amount to payout (in currency units)
 * @param {string} currency - Currency code
 * @param {string} method - Payout method (standard or instant)
 * @returns {Object} Payout
 */
const createPayout = async ({ driverStripeId, amount, currency = 'eur', method = 'standard' }) => {
  try {
    if (!amount || amount <= 0) {
      throw new Error('Payout amount must be greater than 0')
    }

    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      method: method, // 'standard' or 'instant'
      destination: driverStripeId,
      metadata: {
        platform: 'taxilibre',
        payoutType: 'driver earnings'
      }
    })

    logger.info(`Payout created for driver`, { 
      driverStripeId,
      amount,
      payoutId: payout.id
    })

    return {
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        method: payout.method,
        destination: payout.destination,
        arrivalDate: payout.arrival_date
      }
    }
  } catch (error) {
    logger.error('Error creating payout', { 
      error, 
      driverStripeId,
      amount,
      currency,
      method
    })
    throw error
  }
}

/**
 * Retrieve a payout
 * @param {string} payoutId - Payout ID
 * @returns {Object} Payout
 */
const retrievePayout = async (payoutId) => {
  try {
    const payout = await stripe.payouts.retrieve(payoutId)
    
    return {
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        method: payout.method,
        destination: payout.destination,
        arrivalDate: payout.arrival_date
      }
    }
  } catch (error) {
    logger.error('Error retrieving payout', { 
      error, 
      payoutId
    })
    throw error
  }
}

/**
 * Handle Stripe Connect webhook events
 * @param {string} payload - Raw webhook payload
 * @param {string} sig - Stripe signature header
 * @returns {Object} Webhook event
 */
const constructConnectWebhookEvent = (payload, sig) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
    return {
      success: true,
      event
    }
  } catch (error) {
    logger.error('Error constructing Stripe Connect webhook event', { 
      error: error.message
    })
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Handle account.updated webhook event for Connect accounts
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<void>}
 */
const handleAccountUpdated = async (event) => {
  try {
    const account = event.data.object
    const driverId = account.metadata?.driverId
    
    if (!driverId) {
      logger.warn('Stripe Connect account updated without driver metadata', { 
        accountId: account.id
      })
      return
    }

    // Update driver's verification status based on account capabilities
    const chargesEnabled = account.charges_enabled
    const payoutsEnabled = account.payouts_enabled
    const detailsSubmitted = account.details_submitted
    
    const isVerified = chargesEnabled && payoutsEnabled && detailsSubmitted

    await Driver.update(
      { 
        isVerified: isVerified,
        verificationStatus: isVerified ? 'APPROVED' : 'PENDING',
        verifiedAt: isVerified ? new Date() : null
      }, 
      { where: { id: driverId } }
    )

    logger.info(`Driver ${driverId} verification status updated to ${isVerified}`, { 
      accountId: account.id,
      driverId
    })

    // Notify driver via WebSocket/Socket.io
    const socketService = require('./socketService')
    socketService.sendToUser(
      driverId, 
      'stripe:account:updated', 
      {
        accountId: account.id,
        isVerified,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        requirements: account.requirements
      }
    )
  } catch (error) {
    logger.error('Error handling account.updated webhook', { 
      error,
      eventId: event.id
    })
    throw error
  }
}

/**
 * Handle account.application.deauthorized webhook event
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<void>}
 */
const handleAccountDeauthorized = async (event) => {
  try {
    const account = event.data.object
    const driverId = account.metadata?.driverId
    
    if (!driverId) {
      logger.warn('Stripe Connect account deauthorized without driver metadata', { 
        accountId: account.id
      })
      return
    }

    // Disable the driver's ability to receive payouts
    await Driver.update(
      { 
        isVerified: false,
        verificationStatus: 'PENDING',
        stripeConnectId: null // Remove the Connect ID
      }, 
      { where: { id: driverId } }
    )

    logger.info(`Driver ${driverId} Stripe Connect account deauthorized`, { 
      accountId: account.id,
      driverId
    })

    // Notify driver
    const socketService = require('./socketService')
    socketService.sendToUser(
      driverId, 
      'stripe:account:deauthorized', 
      {
        accountId: account.id,
        message: 'Your Stripe Connect account has been deauthorized. Please re-onboard to continue receiving payouts.'
      }
    )
  } catch (error) {
    logger.error('Error handling account.application.deauthorized webhook', { 
      error,
      eventId: event.id
    })
    throw error
  }
}

/**
 * Handle charge.refunded webhook event
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<void>}
 */
const handleChargeRefunded = async (event) => {
  try {
    const charge = event.data.object
    const paymentIntentId = charge.payment_intent
    const refundId = charge.refunded.data?.[0]?.id
    
    if (!paymentIntentId) {
      logger.warn('Charge refunded without payment_intent', { 
        chargeId: charge.id
      })
      return
    }

    // Find the payment record
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntentId }
    })

    if (payment) {
      // Update payment status to refunded
      await payment.update({
        status: 'refunded',
        refundedAt: new Date(),
        refundId: refundId
      })

      // Update ride status if needed
      const ride = await Ride.findByPk(payment.rideId)
      if (ride) {
        await ride.update({
          paymentStatus: 'refunded'
        })
      }

      // Update driver earnings (deduct the refunded amount)
      if (ride && ride.driverId) {
        const refundAmount = charge.amount_refunded / 100 // Convert from cents
        await Driver.update({
          totalEarnings: sequelize.literal(`totalEarnings - ${refundAmount}`)
        }, {
          where: { id: ride.driverId }
        })
      }

      logger.info(`Payment ${paymentIntentId} refunded`, { 
        chargeId: charge.id,
        refundId,
        amountRefunded: charge.amount_refunded
      })
    }
  } catch (error) {
    logger.error('Error handling charge.refunded webhook', { 
      error,
      eventId: event.id
    })
    throw error
  }
}

/**
 * Process all Stripe Connect webhook events
 * @param {Object} event - Parsed Stripe webhook event
 * @returns {Promise<void>}
 */
const processConnectWebhookEvent = async (event) => {
  try {
    logger.info(`Processing Stripe Connect webhook event: ${event.type}`, { 
      eventId: event.id
    })

    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event)
        break
        
      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event)
        break
        
      case 'charge.refunded':
        await handleChargeRefunded(event)
        break
        
      case 'payout.paid':
        logger.info(`Payout paid: ${event.data.object.id}`)
        break
        
      case 'payout.failed':
        logger.info(`Payout failed: ${event.data.object.id}`)
        break
        
      default:
        logger.debug(`Unhandled Stripe Connect webhook event type: ${event.type}`)
    }
  } catch (error) {
    logger.error('Error processing Stripe Connect webhook event', { 
      error,
      eventId: event.id,
      eventType: event.type
    })
    throw error
  }
}

// Helper function to calculate Stripe fees
/**
 * Calculate Stripe processing fees for a transaction
 * @param {number} amount - Transaction amount in currency units
 * @param {string} country - Country code
 * @returns {number} Fee amount in currency units
 */
const calculateStripeFee = (amount, country = 'IE') => {
  // Stripe Ireland pricing: 1.4% + €0.25 for European cards
  // 2.9% + €0.25 for non-European cards
  // For simplicity, we'll use the European rate
  // In production, you'd detect the card origin
  
  const percentageFee = 0.014 // 1.4%
  const fixedFee = 0.25 // €0.25
  
  return (amount * percentageFee) + fixedFee
}

/**
 * Calculate net payout amount after Stripe fees
 * @param {number} grossAmount - Gross transaction amount
 * @param {string} country - Country code
 * @returns {number} Net amount to transfer to driver
 */
const calculateNetPayout = (grossAmount, country = 'IE') => {
  const stripeFee = calculateStripeFee(grossAmount, country)
  return grossAmount - stripeFee
}

module.exports = {
  stripe,
  createConnectAccount,
  getAccountLink,
  retrieveConnectAccount,
  updateConnectAccount,
  createConnectedPaymentIntent,
  confirmConnectedPaymentIntent,
  retrievePaymentIntent,
  createConnectedRefund,
  createPayout,
  retrievePayout,
  constructConnectWebhookEvent,
  processConnectWebhookEvent,
  handleAccountUpdated,
  handleAccountDeauthorized,
  handleChargeRefunded,
  calculateStripeFee,
  calculateNetPayout
}