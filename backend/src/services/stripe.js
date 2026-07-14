const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { Ride, Driver } = require('../models')
const { sequelize } = require('../config/database')

/**
 * Create payment intent for a ride
 */
const createPaymentIntent = async ({ amount, currency = 'eur', rideId, userId }) => {
  try {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        rideId: rideId || 'unknown',
        userId: userId || 'anonymous',
        platform: 'taxilibre'
      }
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }
  } catch (error) {
    throw error
  }
}

/**
 * Confirm payment status
 */
const confirmPayment = async ({ paymentIntentId }) => {
  try {
    if (!paymentIntentId) {
      throw new Error('Payment Intent ID is required')
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    return {
      success: true,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle successful payment
 */
const handleSuccessfulPayment = async (paymentIntent) => {
  try {
    const { rideId, userId } = paymentIntent.metadata

    // Update ride status to 'paid'
    await Ride.update({
      status: 'completed',
      paymentStatus: 'paid',
      paymentIntentId: paymentIntent.id,
      completedAt: new Date()
    }, {
      where: { id: rideId }
    })

    // Update driver earnings
    const ride = await Ride.findByPk(rideId)
    if (ride && ride.driverId) {
      await Driver.update({
        totalEarnings: sequelize.literal(`totalEarnings + ${paymentIntent.amount / 100}`),
        rideCount: sequelize.literal('rideCount + 1')
      }, {
        where: { id: ride.driverId }
      })
    }

    return true
  } catch (error) {
    throw error
  }
}

/**
 * Handle failed payment
 */
const handleFailedPayment = async (paymentIntent) => {
  try {
    const { rideId, userId } = paymentIntent.metadata

    // Update ride status to 'payment_failed'
    await Ride.update({
      status: 'payment_failed',
      paymentStatus: 'failed',
      paymentIntentId: paymentIntent.id
    }, {
      where: { id: rideId }
    })

    return true
  } catch (error) {
    throw error
  }
}

module.exports = {
  stripe,
  createPaymentIntent,
  confirmPayment,
  handleSuccessfulPayment,
  handleFailedPayment
}
