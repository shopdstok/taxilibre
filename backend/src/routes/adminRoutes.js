const express = require('express')
const router = express.Router()
const { authenticateToken, authorize } = require('../middleware/authMiddleware')

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Admin (fh.lebazar@gmail.com uniquement)
 */
router.get('/dashboard', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { User, Ride, Driver, Payment } = require('../models')
    const { Op, fn, col } = require('sequelize')
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6) // last 7 days including today

    // Basic totals
    const [totalUsers, totalDrivers, totalRides] = await Promise.all([
      User.count(),
      Driver.count(),
      Ride.count()
    ])

    // Driver verification breakdown
    const [pendingDrivers, approvedDrivers, rejectedDrivers] = await Promise.all([
      Driver.count({ where: { verificationStatus: 'pending' } }),
      Driver.count({ where: { verificationStatus: 'approved' } }),
      Driver.count({ where: { verificationStatus: 'rejected' } })
    ])

    // Today's ride status counts
    const [ongoingRidesToday, completedRidesToday, cancelledRidesToday] = await Promise.all([
      Ride.count({ where: { status: 'ongoing', createdAt: { [Op.between]: [startOfDay, endOfDay] } } }),
      Ride.count({ where: { status: 'completed', createdAt: { [Op.between]: [startOfDay, endOfDay] } } }),
      Ride.count({ where: { status: 'cancelled', createdAt: { [Op.between]: [startOfDay, endOfDay] } } })
    ])

    // Revenue today
    const revenueToday = await Payment.sum('amount', {
      where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } }
    }) || 0

    // Revenue last 7 days (daily)
    const revenueLast7DaysRaw = await Payment.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('SUM', col('amount')), 'total']
      ],
      where: {
        createdAt: { [Op.between]: [sevenDaysAgo, endOfDay] }
      },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']]
    })
    const revenueLast7Days = revenueLast7DaysRaw.map(row => ({
      date: row.get('date'),
      amount: parseFloat(row.get('total') || 0)
    }))

    // Signups last 7 days (users)
    const signupsLast7DaysRaw = await User.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.between]: [sevenDaysAgo, endOfDay] }
      },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']]
    })
    const signupsLast7Days = signupsLast7DaysRaw.map(row => ({
      date: row.get('date'),
      count: parseInt(row.get('count') || 0, 10)
    }))

    // Rides last 7 days
    const ridesLast7DaysRaw = await Ride.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.between]: [sevenDaysAgo, endOfDay] }
      },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']]
    })
    const ridesLast7Days = ridesLast7DaysRaw.map(row => ({
      date: row.get('date'),
      count: parseInt(row.get('count') || 0, 10)
    }))

    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          drivers: totalDrivers,
          rides: totalRides,
          revenue: await Payment.sum('amount') || 0
        },
        today: {
          users: await User.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
          drivers: await Driver.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
          rides: await Ride.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
          revenue: revenueToday
        },
        drivers: {
          pending: pendingDrivers,
          approved: approvedDrivers,
          rejected: rejectedDrivers
        },
        ridesToday: {
          ongoing: ongoingRidesToday,
          completed: completedRidesToday,
          cancelled: cancelledRidesToday
        },
        charts: {
          revenueLast7Days,
          signupsLast7Days,
          ridesLast7Days
        }
      }
    })
  } catch (error) {
    next(error)
  }
})
router.get('/drivers', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { Driver, User } = require('../models')

    const drivers = await Driver.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email', 'phone'] }]
    })

    res.json({
      success: true,
      data: drivers
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get admin statistics
 * @access  Admin (fh.lebazar@gmail.com uniquement)
 */
router.get('/stats', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { User, Ride, Driver, Payment } = require('../models')

    const [totalUsers, totalDrivers, totalRides, totalRevenue] = await Promise.all([
      User.count(),
      Driver.count(),
      Ride.count(),
      Payment.sum('amount')
    ])

    res.json({
      success: true,
      data: {
        users: totalUsers,
        drivers: totalDrivers,
        rides: totalRides,
        revenue: totalRevenue || 0
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route   PUT /api/v1/admin/drivers/:id/approve
 * @desc    Approve a driver
 * @access  Admin (fh.lebazar@gmail.com únicamente)
 */
router.put('/drivers/:id/approve', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { Driver } = require('../models')

    const driver = await Driver.findByPk(req.params.id)
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' })
    }

    driver.verificationStatus = 'approved'
    driver.approvedAt = new Date()
    await driver.save()

    res.json({
      success: true,
      message: 'Driver approved',
      data: driver
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route   PUT /api/v1/admin/drivers/:id/reject
 * @desc    Reject a driver
 * @access  Admin (fh.lebazar@gmail.com únicamente)
 */
router.put('/drivers/:id/reject', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { Driver } = require('../models')
    const { reason } = req.body

    const driver = await Driver.findByPk(req.params.id)
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' })
    }

    driver.verificationStatus = 'rejected'
    driver.rejectionReason = reason || 'Rejected by admin'
    await driver.save()

    res.json({
      success: true,
      message: 'Driver rejected',
      data: driver
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
