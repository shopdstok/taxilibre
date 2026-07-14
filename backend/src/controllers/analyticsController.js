const AnalyticsService = require('../services/analyticsService')
const { sendSuccess, sendError } = require('../utils/response')

class AnalyticsController {
  /**
   * Get main dashboard KPIs
   */
  static async getDashboard (req, res) {
    try {
      const { period = 'today' } = req.query

      const kpis = await AnalyticsService.getDashboardKPIs(period)

      return sendSuccess(res, kpis, 'Dashboard KPIs retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get rides time series
   */
  static async getRidesTimeSeries (req, res) {
    try {
      const { period = '7d' } = req.query

      const data = await AnalyticsService.getRidesTimeSeries(period)

      return sendSuccess(res, data, 'Rides time series retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get top drivers
   */
  static async getTopDrivers (req, res) {
    try {
      const { limit = 10, metric = 'earnings' } = req.query

      const drivers = await AnalyticsService.getTopDrivers(
        parseInt(limit),
        metric
      )

      return sendSuccess(res, drivers, 'Top drivers retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get ride heatmap data
   */
  static async getRideHeatmap (req, res) {
    try {
      const { hours = 24 } = req.query

      const heatmap = await AnalyticsService.getRideHeatmap(parseInt(hours))

      return sendSuccess(res, { points: heatmap, total: heatmap.length }, 'Ride heatmap retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get real-time statistics
   */
  static async getRealTimeStats (req, res) {
    try {
      const stats = await AnalyticsService.getRealTimeStats()

      return sendSuccess(res, stats, 'Real-time statistics retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get vehicle type statistics
   */
  static async getVehicleStats (req, res) {
    try {
      const stats = await AnalyticsService.getVehicleTypeStats()

      return sendSuccess(res, stats, 'Vehicle type statistics retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get cancellation reasons
   */
  static async getCancellationReasons (req, res) {
    try {
      const { period = '7d' } = req.query

      const reasons = await AnalyticsService.getCancellationReasons(period)

      return sendSuccess(res, reasons, 'Cancellation reasons retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get user growth
   */
  static async getUserGrowth (req, res) {
    try {
      const { period = '30d' } = req.query

      const growth = await AnalyticsService.getUserGrowth(period)

      return sendSuccess(res, growth, 'User growth retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get revenue analytics
   */
  static async getRevenue (req, res) {
    try {
      const { period = 'today' } = req.query

      const revenue = await AnalyticsService.calculateRevenue(
        period === 'today' ? { createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } } : {}
      )

      return sendSuccess(res, revenue, 'Revenue analytics retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }
}

module.exports = AnalyticsController
