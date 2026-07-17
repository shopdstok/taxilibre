require('dotenv').config({ override: false })

const { logger } = require('../services/loggingService')

const stripeKey = process.env.STRIPE_SECRET_KEY
logger.info(`Stripe key being used: ${stripeKey ? stripeKey.substring(0, 10) + '...' : 'undefined'}`)
const stripe = require('stripe')(stripeKey)

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY

/**
 * Create a payment intent for a ride
 */
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      capture_method: 'automatic',
      metadata: {
        ...metadata,
        platform: 'taxilibre'
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    })

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Confirm a payment intent
 */
const confirmPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId)
    return {
      success: true,
      data: paymentIntent
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Retrieve a payment intent
 */
const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return {
      success: true,
      data: paymentIntent
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Create a refund
 */
const createRefund = async (paymentIntentId, amount = null, reason = null) => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId
    }

    if (amount) {
      refundParams.amount = Math.round(amount * 100) // Convert to cents
    }

    if (reason) {
      refundParams.reason = reason
    }

    const refund = await stripe.refunds.create(refundParams)

    return {
      success: true,
      data: refund
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Create a customer
 */
const createCustomer = async (email, name = null, metadata = {}) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        platform: 'taxilibre'
      }
    })

    return {
      success: true,
      data: customer
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Retrieve a customer
 */
const retrieveCustomer = async (customerId) => {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return {
      success: true,
      data: customer
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Create payment method for customer
 */
const createPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    })

    return {
      success: true,
      data: paymentMethod
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * List customer payment methods
 */
const listPaymentMethods = async (customerId, type = 'card') => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type
    })

    return {
      success: true,
      data: paymentMethods.data
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Handle webhook events
 */
const constructWebhookEvent = (payload, sig) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET)
    return event
  } catch (error) {
    return null
  }
}

/**
 * Get supported payment methods
 */
const getSupportedPaymentMethods = () => {
  return ['card', 'apple_pay', 'google_pay']
}

/**
 * Get supported currencies
 */
const getSupportedCurrencies = () => {
  return ['usd', 'eur', 'gbp', 'cad', 'aud']
}

module.exports = {
  stripe,
  createPaymentIntent,
  confirmPaymentIntent,
  retrievePaymentIntent,
  createRefund,
  createCustomer,
  retrieveCustomer,
  createPaymentMethod,
  listPaymentMethods,
  constructWebhookEvent,
  getSupportedPaymentMethods,
  getSupportedCurrencies,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET
}
