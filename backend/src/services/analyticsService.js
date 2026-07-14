const { sequelize } = require('../config/database')
const { User, Ride, Driver, Payment, Review } = require('../models')
let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    get: async () => null,
    setex: async () => {},
    incr: async () => 1,
    getAsync: async () => null,
    setexAsync: async () => {}
  }
}

/**
 * Analytics Service for Admin Dashboard
 * Provides KPIs, metrics, and business intelligence
 */
class AnalyticsService {
  // ==================== DASHBOARD KPIs ====================

  /**
   * Get main dashboard metrics
   */
  static async getDashboardKPIs (period = 'today') {
    const dateFilter = this.getPeriodFilter(period)

    const [
      totalUsers,
      totalDrivers,
      totalRides,
      revenue,
      activeRides,
      pendingDrivers
    ] = await Promise.all([
      User.count(),
      Driver.count(),
      Ride.count({ where: { ...dateFilter, status: 'ride_completed' } }),
      this.calculateRevenue(dateFilter),
      Ride.count({ where: { status: ['requested', 'accepted', 'driver_arriving', 'ride_started'] } }),
      Driver.count({ where: { verificationStatus: 'pending' } })
    ])

    return {
      totalUsers,
      totalDrivers,
      totalRides,
      revenue,
      activeRides,
      pendingDrivers,
      period
    }
  }

  /**
   * Get revenue analytics
   */
  static async calculateRevenue (dateFilter) {
    const result = await Payment.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        status: 'paid',
        ...dateFilter
      },
      raw: true
    })

    return {
      total: parseFloat(result?.total || 0),
      count: parseInt(result?.count || 0)
    }
  }

  /**
   * Get rides time series data
   */
  static async getRidesTimeSeries (period = '7d') {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30
    const data = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const [requested, completed, cancelled, revenue] = await Promise.all([
        Ride.count({
          where: {
            requestedAt: {
              [sequelize.Op.gte]: `${dateStr} 00:00:00`,
              [sequelize.Op.lte]: `${dateStr} 23:59:59`
            }
          }
        }),
        Ride.count({
          where: {
            status: 'ride_completed',
            rideEndTime: {
              [sequelize.Op.gte]: `${dateStr} 00:00:00`,
              [sequelize.Op.lte]: `${dateStr} 23:59:59`
            }
          }
        }),
        Ride.count({
          where: {
            status: 'cancelled',
            cancellationTime: {
              [sequelize.Op.gte]: `${dateStr} 00:00:00`,
              [sequelize.Op.lte]: `${dateStr} 23:59:59`
            }
          }
        }),
        Payment.sum('amount', {
          where: {
            status: 'paid',
            createdAt: {
              [sequelize.Op.gte]: `${dateStr} 00:00:00`,
              [sequelize.Op.lte]: `${dateStr} 23:59:59`
            }
          }
        })
      ])

      data.push({
        date: dateStr,
        requested,
        completed,
        cancelled,
        revenue: parseFloat(revenue || 0)
      })
    }

    return data
  }

  /**
   * Get top drivers by various metrics
   */
  static async getTopDrivers (limit = 10, metric = 'earnings') {
    const whereClause = { status: 'ride_completed' }

    if (metric === 'earnings') {
      const drivers = await sequelize.query(`
        SELECT 
          d.id,
          d.rating,
          d.current_latitude,
          d.current_longitude,
          u.name,
          u.email,
          u.avatar,
          COUNT(r.id) as total_rides,
          SUM(r.final_price) as total_earnings,
          AVG(r.driver_rating) as avg_rating
        FROM drivers d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN rides r ON r.driver_id = d.id AND r.status = 'ride_completed'
        WHERE d.verification_status = 'approved'
        GROUP BY d.id, u.name, u.email, u.avatar
        ORDER BY total_earnings DESC NULLS LAST
        LIMIT ${limit}
      `, { type: sequelize.QueryTypes.SELECT })

      return drivers
    }

    if (metric === 'rides') {
      const drivers = await sequelize.query(`
        SELECT 
          d.id,
          u.name,
          u.email,
          COUNT(r.id) as total_rides,
          AVG(r.driver_rating) as avg_rating
        FROM drivers d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN rides r ON r.driver_id = d.id AND r.status = 'ride_completed'
        WHERE d.verification_status = 'approved'
        GROUP BY d.id, u.name, u.email
        ORDER BY total_rides DESC NULLS LAST
        LIMIT ${limit}
      `, { type: sequelize.QueryTypes.SELECT })

      return drivers
    }

    return []
  }

  /**
   * Get heatmap data for rides
   */
  static async getRideHeatmap (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const rides = await Ride.findAll({
      where: {
        requestedAt: { [sequelize.Op.gte]: since }
      },
      attributes: ['pickupLatitude', 'pickupLongitude', 'status'],
      raw: true
    })

    return rides.map(r => ({
      lat: parseFloat(r.pickupLatitude),
      lng: parseFloat(r.pickupLongitude),
      status: r.status
    }))
  }

  /**
   * Get real-time statistics
   */
  static async getRealTimeStats () {
    const [
      onlineDrivers,
      activeRides,
      pendingRequests,
      avgMatchTime
    ] = await Promise.all([
      Driver.count({ where: { status: 'online' } }),
      Ride.count({
        where: {
          status: ['accepted', 'driver_arriving', 'driver_arrived', 'ride_started']
        }
      }),
      Ride.count({ where: { status: 'requested' } }),
      this.calculateAvgMatchTime()
    ])

    return {
      onlineDrivers,
      activeRides,
      pendingRequests,
      avgMatchTime,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Calculate average time to match driver
   */
  static async calculateAvgMatchTime () {
    const result = await sequelize.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (accepted_at - requested_at))) as avg_seconds
      FROM rides
      WHERE status IN ('accepted', 'driver_arriving', 'driver_arrived', 'ride_started', 'ride_completed')
      AND accepted_at IS NOT NULL
      AND requested_at >= NOW() - INTERVAL '24 hours'
    `, { type: sequelize.QueryTypes.SELECT })

    return Math.round(result[0]?.avg_seconds || 0)
  }

  /**
   * Get vehicle type distribution
   */
  static async getVehicleTypeStats () {
    const stats = await sequelize.query(`
      SELECT 
        v.type,
        COUNT(v.id) as total,
        COUNT(CASE WHEN d.status = 'online' THEN 1 END) as online
      FROM vehicles v
      JOIN drivers d ON d.id = v.driver_id
      WHERE v.is_active = true
      GROUP BY v.type
    `, { type: sequelize.QueryTypes.SELECT })

    return stats
  }

  /**
   * Get cancellation reasons
   */
  static async getCancellationReasons (period = '7d') {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30

    const reasons = await sequelize.query(`
      SELECT 
        COALESCE(cancellation_reason, 'No reason') as reason,
        cancelled_by,
        COUNT(*) as count
      FROM rides
      WHERE status = 'cancelled'
      AND cancellation_time >= NOW() - INTERVAL '${days} days'
      GROUP BY cancellation_reason, cancelled_by
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT })

    return reasons
  }

  /**
   * Get user growth over time
   */
  static async getUserGrowth (period = '30d') {
    const days = period === '7d' ? 7 : 30

    const growth = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users,
        role
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at), role
      ORDER BY date DESC
    `, { type: sequelize.QueryTypes.SELECT })

    return growth
  }

  // ==================== PRIVATE HELPERS ====================

  static getPeriodFilter (period) {
    const now = new Date()

    switch (period) {
      case 'today':
        return {
          createdAt: {
            [sequelize.Op.gte]: new Date(now.setHours(0, 0, 0, 0))
          }
        }
      case 'week':
        return {
          createdAt: {
            [sequelize.Op.gte]: new Date(now - 7 * 24 * 60 * 60 * 1000)
          }
        }
      case 'month':
        return {
          createdAt: {
            [sequelize.Op.gte]: new Date(now - 30 * 24 * 60 * 60 * 1000)
          }
        }
      default:
        return {}
    }
  }
}

module.exports = AnalyticsService
