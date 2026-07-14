const { AuditLog } = require('../models')
const { Op } = require('sequelize');

/**
 * Audit Logging Service
 */
class AuditLogService {
  /**
   * Log an audit event
   */
  async log (data) {
    try {
      await AuditLog.create({
        adminId: data.adminId || null,
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        changes: data.changes || {},
        metadata: data.metadata || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null
      })

      return { success: true }
    } catch (error) {
      // Don't throw error - audit logging shouldn't break the application
      return { success: false }
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent (data) {
    return await this.log({
      action: data.action, // login, logout, failed_login, password_change, etc.
      userId: data.userId,
      metadata: {
        method: data.method, // email, oauth, phone, etc.
        success: data.success,
        failureReason: data.failureReason
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }

  /**
   * Log user management events
   */
  async logUserEvent (data) {
    return await this.log({
      adminId: data.adminId,
      action: data.action, // user_created, user_updated, user_deleted, user_banned, etc.
      entityType: 'user',
      entityId: data.userId,
      changes: data.changes,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }

  /**
   * Log ride events
   */
  async logRideEvent (data) {
    return await this.log({
      userId: data.userId,
      action: data.action, // ride_created, ride_cancelled, ride_completed, etc.
      entityType: 'ride',
      entityId: data.rideId,
      changes: data.changes,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }

  /**
   * Log payment events
   */
  async logPaymentEvent (data) {
    return await this.log({
      userId: data.userId,
      action: data.action, // payment_created, payment_refunded, etc.
      entityType: 'payment',
      entityId: data.paymentId,
      changes: data.changes,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }

  /**
   * Log admin events
   */
  async logAdminEvent (data) {
    return await this.log({
      adminId: data.adminId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      changes: data.changes,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    })
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs (userId, options = {}) {
    const { limit = 50, offset = 0, action, entityType } = options

    const where = { userId }
    if (action) where.action = action
    if (entityType) where.entityType = entityType

    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    return logs
  }

  /**
   * Get audit logs for an admin
   */
  async getAdminLogs (adminId, options = {}) {
    const { limit = 50, offset = 0, action, entityType } = options

    const where = { adminId }
    if (action) where.action = action
    if (entityType) where.entityType = entityType

    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    return logs
  }

  /**
   * Get all audit logs (admin only)
   */
  async getAllLogs (options = {}) {
    const { limit = 100, offset = 0, action, entityType, startDate, endDate } = options

    const where = {}
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt[Op.gte] = startDate
      if (endDate) where.createdAt[Op.lte] = endDate
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: require('../models').User, as: 'admin', attributes: ['id', 'email', 'name'] },
        { model: require('../models').User, as: 'user', attributes: ['id', 'email', 'name'] }
      ]
    })

    return logs
  }

  /**
   * Get audit statistics
   */
  async getStatistics (options = {}) {
    const { startDate, endDate } = options

    const where = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt[Op.gte] = startDate
      if (endDate) where.createdAt[Op.lte] = endDate
    }

    const totalLogs = await AuditLog.count({ where })
    const logsByAction = await AuditLog.findAll({
      where,
      attributes: ['action', [require('sequelize').fn('COUNT', '*'), 'count']],
      group: ['action'],
      raw: true
    })
    const logsByEntityType = await AuditLog.findAll({
      where,
      attributes: ['entityType', [require('sequelize').fn('COUNT', '*'), 'count']],
      group: ['entityType'],
      raw: true
    })

    return {
      totalLogs,
      logsByAction,
      logsByEntityType
    }
  }
}

module.exports = new AuditLogService()
