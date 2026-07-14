const { User, Driver, Wallet, WalletTransaction, PromoCode, LoyaltyPoints } = require('../models')
const { successResponse, errorResponse, AppError } = require('../middleware/errorMiddleware')
const { pricingService } = require('../services')
const { Op } = require('sequelize')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

/**
 * Enhanced wallet service for Uber/Bolt level features
 */
class WalletService {
  /**
   * Get user wallet balance
   */
  async getWalletBalance (userId) {
    try {
      const wallet = await Wallet.findOne({
        where: { userId, isActive: true }
      })

      if (!wallet) {
        // Create wallet if it doesn't exist
        const newWallet = await Wallet.create({
          userId,
          balance: 0,
          currency: 'EUR',
          isActive: true
        })
        return {
          balance: 0,
          currency: 'EUR',
          walletId: newWallet.id
        }
      }

      return {
        balance: parseFloat(wallet.balance.toFixed(2)),
        currency: wallet.currency,
        blockedAmount: parseFloat(wallet.blockedAmount.toFixed(2)),
        availableBalance: parseFloat((wallet.balance - wallet.blockedAmount).toFixed(2)),
        walletId: wallet.id
      }
    } catch (error) {
      throw new Error('Failed to get wallet balance')
    }
  }

  /**
   * Add funds to wallet
   */
  async addFunds (userId, amount, paymentMethodId, description = 'Wallet top-up') {
    try {
      const wallet = await Wallet.findOne({
        where: { userId, isActive: true }
      })

      if (!wallet) {
        throw new Error('Wallet not found')
      }

      // Process payment via Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'eur',
        payment_method: paymentMethodId,
        confirm: true,
        description: `TaxiLibre wallet top-up - €${amount}`
      })

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment failed')
      }

      // Update wallet balance
      await wallet.update({
        balance: wallet.balance + amount
      })

      // Record transaction
      const transaction = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'CREDIT',
        amount,
        description,
        referenceId: paymentIntent.id,
        status: 'COMPLETED',
        metadata: {
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntent.id
        }
      })

      // Add loyalty points (1 point per euro)
      await this.addLoyaltyPoints(userId, Math.floor(amount), 'wallet_top_up')

      return {
        success: true,
        newBalance: parseFloat((wallet.balance + amount).toFixed(2)),
        transaction: {
          id: transaction.id,
          amount,
          type: 'CREDIT',
          description,
          createdAt: transaction.createdAt
        }
      }
    } catch (error) {
      throw new Error('Failed to add funds')
    }
  }

  /**
   * Withdraw funds from wallet
   */
  async withdrawFunds (userId, amount, bankAccount, description = 'Wallet withdrawal') {
    try {
      const wallet = await Wallet.findOne({
        where: { userId, isActive: true }
      })

      if (!wallet) {
        throw new Error('Wallet not found')
      }

      if (wallet.balance < amount) {
        throw new Error('Insufficient balance')
      }

      // Block amount during processing
      await wallet.update({
        blockedAmount: wallet.blockedAmount + amount
      })

      // Process withdrawal (in production, integrate with banking API)
      // For now, simulate successful withdrawal
      const withdrawalId = `withdrawal_${Date.now()}`

      // Update wallet balance
      await wallet.update({
        balance: wallet.balance - amount,
        blockedAmount: wallet.blockedAmount - amount
      })

      // Record transaction
      const transaction = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'DEBIT',
        amount,
        description,
        referenceId: withdrawalId,
        status: 'COMPLETED',
        metadata: {
          bankAccount,
          withdrawalMethod: 'bank_transfer'
        }
      })

      return {
        success: true,
        newBalance: parseFloat((wallet.balance - amount).toFixed(2)),
        transaction: {
          id: transaction.id,
          amount,
          type: 'DEBIT',
          description,
          withdrawalId,
          createdAt: transaction.createdAt
        }
      }
    } catch (error) {
      throw new Error('Failed to withdraw funds')
    }
  }

  /**
   * Pay for ride using wallet
   */
  async payRideWithWallet (userId, rideId, amount) {
    try {
      const wallet = await Wallet.findOne({
        where: { userId, isActive: true }
      })

      if (!wallet) {
        throw new Error('Wallet not found')
      }

      if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance')
      }

      // Block amount temporarily
      await wallet.update({
        blockedAmount: wallet.blockedAmount + amount
      })

      // Record transaction
      const transaction = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'FREEZE',
        amount,
        description: `Payment for ride ${rideId}`,
        referenceId: rideId,
        status: 'PENDING',
        metadata: {
          rideId,
          paymentType: 'ride_payment'
        }
      })

      return {
        success: true,
        transactionId: transaction.id,
        blockedAmount: amount
      }
    } catch (error) {
      throw new Error('Failed to process wallet payment')
    }
  }

  /**
   * Complete ride payment (unfreeze funds)
   */
  async completeRidePayment (userId, rideId, amount) {
    try {
      const wallet = await Wallet.findOne({
        where: { userId, isActive: true }
      })

      if (!wallet) {
        throw new Error('Wallet not found')
      }

      // Update wallet balance (remove blocked amount)
      await wallet.update({
        balance: wallet.balance - amount,
        blockedAmount: wallet.blockedAmount - amount
      })

      // Update transaction from FREEZE to DEBIT
      await WalletTransaction.update(
        {
          type: 'DEBIT',
          status: 'COMPLETED',
          completedAt: new Date()
        },
        {
          where: {
            userId,
            referenceId: rideId,
            type: 'FREEZE',
            status: 'PENDING'
          }
        }
      )

      return {
        success: true,
        newBalance: parseFloat((wallet.balance - amount).toFixed(2))
      }
    } catch (error) {
      throw new Error('Failed to complete ride payment')
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory (userId, options = {}) {
    try {
      const { page = 1, limit = 20, type, status, dateFrom, dateTo } = options

      const wallet = await Wallet.findOne({
        where: { userId, isActive: true }
      })

      if (!wallet) {
        return { transactions: [], pagination: { total: 0, pages: 0 } }
      }

      const whereClause = { walletId: wallet.id }

      if (type) {
        whereClause.type = type
      }

      if (status) {
        whereClause.status = status
      }

      if (dateFrom || dateTo) {
        whereClause.createdAt = {}
        if (dateFrom) {
          whereClause.createdAt[Op.gte] = new Date(dateFrom)
        }
        if (dateTo) {
          whereClause.createdAt[Op.lte] = new Date(dateTo)
        }
      }

      const transactions = await WalletTransaction.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      })

      return {
        transactions: transactions.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: transactions.count,
          pages: Math.ceil(transactions.count / parseInt(limit))
        }
      }
    } catch (error) {
      throw new Error('Failed to get transaction history')
    }
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints (userId, points, reason, metadata = {}) {
    try {
      const existingPoints = await LoyaltyPoints.findOne({
        where: { userId }
      })

      if (existingPoints) {
        await existingPoints.update({
          totalPoints: existingPoints.totalPoints + points,
          availablePoints: existingPoints.availablePoints + points,
          lastEarnedAt: new Date()
        })
      } else {
        await LoyaltyPoints.create({
          userId,
          totalPoints: points,
          availablePoints: points,
          tier: 'BRONZE',
          lastEarnedAt: new Date()
        })
      }

      // Record points transaction
      await WalletTransaction.create({
        userId,
        type: 'LOYALTY_EARN',
        amount: points,
        description: `${reason} - ${points} points`,
        status: 'COMPLETED',
        metadata: {
          reason,
          points,
          ...metadata
        }
      })

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Redeem loyalty points
   */
  async redeemLoyaltyPoints (userId, points, reward) {
    try {
      const userPoints = await LoyaltyPoints.findOne({
        where: { userId }
      })

      if (!userPoints || userPoints.availablePoints < points) {
        throw new Error('Insufficient loyalty points')
      }

      // Deduct points
      await userPoints.update({
        availablePoints: userPoints.availablePoints - points,
        lastRedeemedAt: new Date()
      })

      // Apply reward (discount, free ride, etc.)
      let discountAmount = 0
      if (reward.type === 'discount') {
        discountAmount = reward.value
      } else if (reward.type === 'free_ride') {
        discountAmount = reward.maxValue
      }

      // Record redemption
      await WalletTransaction.create({
        userId,
        type: 'LOYALTY_REDEEM',
        amount: points,
        description: `Redeemed ${points} points for ${reward.description}`,
        status: 'COMPLETED',
        metadata: {
          reward,
          pointsRedeemed: points,
          discountAmount
        }
      })

      return {
        success: true,
        discountAmount,
        remainingPoints: userPoints.availablePoints - points
      }
    } catch (error) {
      throw new Error('Failed to redeem loyalty points')
    }
  }

  /**
   * Get loyalty tier and benefits
   */
  async getLoyaltyStatus (userId) {
    try {
      const userPoints = await LoyaltyPoints.findOne({
        where: { userId }
      })

      if (!userPoints) {
        return {
          tier: 'BRONZE',
          totalPoints: 0,
          availablePoints: 0,
          benefits: ['Standard support', 'Basic rewards']
        }
      }

      // Calculate tier based on total points
      let tier = 'BRONZE'
      let benefits = ['Standard support', 'Basic rewards']

      if (userPoints.totalPoints >= 15000) {
        tier = 'PLATINUM'
        benefits = ['Dedicated support', 'Free premium features', 'Exclusive promos', 'Priority matching']
      } else if (userPoints.totalPoints >= 5000) {
        tier = 'GOLD'
        benefits = ['Priority support', 'Free upgrades', 'Exclusive promos']
      } else if (userPoints.totalPoints >= 1000) {
        tier = 'SILVER'
        benefits = ['Priority support', 'Free cancellations']
      }

      return {
        tier,
        totalPoints: userPoints.totalPoints,
        availablePoints: userPoints.availablePoints,
        benefits,
        nextTier: this.getNextTier(tier),
        pointsToNextTier: this.getPointsToNextTier(userPoints.totalPoints, tier)
      }
    } catch (error) {
      throw new Error('Failed to get loyalty status')
    }
  }

  getNextTier (currentTier) {
    const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
    const currentIndex = tiers.indexOf(currentTier)
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null
  }

  getPointsToNextTier (currentPoints, currentTier) {
    const tierThresholds = {
      BRONZE: 1000,
      SILVER: 5000,
      GOLD: 15000,
      PLATINUM: null
    }

    const threshold = tierThresholds[currentTier]
    return threshold ? Math.max(0, threshold - currentPoints) : 0
  }
}

const walletService = new WalletService()

/**
 * Get wallet balance
 */
const getWalletBalance = async (req, res, next) => {
  try {
    const userId = req.userId
    const balance = await walletService.getWalletBalance(userId)

    return successResponse(res, 200, balance)
  } catch (error) {
    next(error)
  }
}

/**
 * Add funds to wallet
 */
const addFunds = async (req, res, next) => {
  try {
    const userId = req.userId
    const { amount, paymentMethodId, description } = req.body

    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400, 'INVALID_AMOUNT')
    }

    if (!paymentMethodId) {
      throw new AppError('Payment method is required', 400, 'PAYMENT_METHOD_REQUIRED')
    }

    const result = await walletService.addFunds(userId, amount, paymentMethodId, description)

    return successResponse(res, 200, result)
  } catch (error) {
    next(error)
  }
}

/**
 * Get transaction history
 */
const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.userId
    const { page, limit, type, status, dateFrom, dateTo } = req.query

    const history = await walletService.getTransactionHistory(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      type,
      status,
      dateFrom,
      dateTo
    })

    return successResponse(res, 200, history)
  } catch (error) {
    next(error)
  }
}

/**
 * Get loyalty status
 */
const getLoyaltyStatus = async (req, res, next) => {
  try {
    const userId = req.userId
    const status = await walletService.getLoyaltyStatus(userId)

    return successResponse(res, 200, status)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getWalletBalance,
  addFunds,
  getTransactionHistory,
  getLoyaltyStatus,
  walletService // For internal use by other controllers
}
