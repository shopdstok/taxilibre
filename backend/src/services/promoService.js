const { PromoCode } = require('../models')
let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    get: async () => null
  }
}
const { Op } = require('sequelize')

/**
 * Promo Code Service
 */
class PromoService {
  /**
   * Validate promo code
   */
  async validatePromoCode (code, basePrice) {
    try {
      if (!code) {
        return { valid: false, discount: 0, discountType: null }
      }

      const cacheKey = `promo:${code.toUpperCase()}`
      const cachedPromo = await redis.get(cacheKey)

      let promo
      if (cachedPromo) {
        promo = JSON.parse(cachedPromo)
      } else {
        promo = await PromoCode.findOne({
          where: {
            code: code.toUpperCase(),
            isActive: true,
            startDate: { [Op.lte]: new Date() },
            endDate: { [Op.gte]: new Date() }
          }
        })

        if (promo) {
          await redis.setex(cacheKey, 300, JSON.stringify(promo))
        }
      }

      if (!promo) {
        return { valid: false, discount: 0, discountType: null, message: 'Invalid promo code' }
      }

      // Check usage limit
      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        return { valid: false, discount: 0, discountType: null, message: 'Promo code usage limit reached' }
      }

      // Check minimum order amount
      if (promo.minAmount && basePrice < promo.minAmount) {
        return { valid: false, discount: 0, discountType: null, message: `Minimum order amount is ${promo.minAmount}` }
      }

      // Calculate discount
      let discount = 0
      if (promo.type === 'percentage') {
        discount = basePrice * (promo.discount / 100)
        if (promo.maxDiscount) {
          discount = Math.min(discount, promo.maxDiscount)
        }
      } else if (promo.type === 'fixed') {
        discount = promo.discount
      } else if (promo.type === 'free_ride') {
        discount = Math.min(basePrice, promo.maxValue || basePrice)
      }

      return {
        valid: true,
        discount: Math.round(discount * 100) / 100,
        discountType: promo.type,
        message: 'Promo code applied successfully'
      }
    } catch (error) {
      throw new Error(`Failed to validate promo code: ${error.message}`)
    }
  }

  /**
   * Apply promo code to a ride
   */
  async applyPromoCode (rideId, promoCode, userId) {
    try {
      const promo = await PromoCode.findOne({
        where: {
          code: promoCode.toUpperCase(),
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      })

      if (!promo) {
        throw new Error('Invalid promo code')
      }

      // Check if user has already used this promo
      if (promo.oneTimeUse) {
        const { Ride } = require('../models')
        const existingUse = await Ride.findOne({
          where: {
            passengerId: userId,
            discountCode: promoCode.toUpperCase()
          }
        })

        if (existingUse) {
          throw new Error('You have already used this promo code')
        }
      }

      // Update promo usage count
      await promo.update({
        usedCount: promo.usedCount + 1
      })

      return { success: true, promo }
    } catch (error) {
      throw new Error(`Failed to apply promo code: ${error.message}`)
    }
  }

  /**
   * Create promo code (admin only)
   */
  async createPromoCode (data) {
    try {
      const promo = await PromoCode.create({
        code: data.code.toUpperCase(),
        type: data.type || 'percentage',
        discount: data.discount,
        maxDiscount: data.maxDiscount || null,
        minAmount: data.minAmount || null,
        maxUses: data.maxUses || null,
        oneTimeUse: data.oneTimeUse || false,
        startDate: data.startDate || new Date(),
        endDate: data.endDate,
        isActive: data.isActive !== false,
        description: data.description || null
      })

      // Clear cache
      const cacheKey = `promo:${promo.code}`
      await redis.del(cacheKey)

      return promo
    } catch (error) {
      throw new Error(`Failed to create promo code: ${error.message}`)
    }
  }

  /**
   * Get all promo codes (admin)
   */
  async getAllPromoCodes (options = {}) {
    const { limit = 50, offset = 0, isActive } = options

    const where = {}
    if (isActive !== undefined) where.isActive = isActive

    const promos = await PromoCode.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    return promos
  }

  /**
   * Update promo code (admin)
   */
  async updatePromoCode (id, data) {
    try {
      const promo = await PromoCode.findByPk(id)

      if (!promo) {
        throw new Error('Promo code not found')
      }

      await promo.update(data)

      // Clear cache
      const cacheKey = `promo:${promo.code}`
      await redis.del(cacheKey)

      return promo
    } catch (error) {
      throw new Error(`Failed to update promo code: ${error.message}`)
    }
  }

  /**
   * Delete promo code (admin)
   */
  async deletePromoCode (id) {
    try {
      const promo = await PromoCode.findByPk(id)

      if (!promo) {
        throw new Error('Promo code not found')
      }

      // Clear cache
      const cacheKey = `promo:${promo.code}`
      await redis.del(cacheKey)

      await promo.destroy()

      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete promo code: ${error.message}`)
    }
  }
}

module.exports = new PromoService()
