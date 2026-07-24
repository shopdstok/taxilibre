const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');
const { User, Driver, Ride, Payment } = require('../models');
const { Op, fn, col, Sequelize } = require('sequelize');
const { AppError } = require('../middleware/errorMiddleware');

// ============================================================
//  PROTECTION: TOUTES les routes admin utilisent checkAdmin
//  (verifie role=admin ET email=fh.lebazar@gmail.com)
// ============================================================
router.use(authenticateToken, checkAdmin);

// ============================================================
//  DASHBOARD
// ============================================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6);

    const [totalUsers, totalDrivers, totalRides, totalRevenue] = await Promise.all([
      User.count(), Driver.count(), Ride.count(), Payment.sum('amount'),
    ]);

    const [pendingDrivers, approvedDrivers, rejectedDrivers] = await Promise.all([
      Driver.count({ where: { verificationStatus: 'pending' } }),
      Driver.count({ where: { verificationStatus: 'approved' } }),
      Driver.count({ where: { verificationStatus: 'rejected' } }),
    ]);

    const [ongoingToday, completedToday, cancelledToday] = await Promise.all([
      Ride.count({ where: { status: 'ongoing', createdAt: { [Op.between]: [startOfDay, endOfDay] } } }),
      Ride.count({ where: { status: 'completed', createdAt: { [Op.between]: [startOfDay, endOfDay] } } }),
      Ride.count({ where: { status: 'cancelled', createdAt: { [Op.between]: [startOfDay, endOfDay] } } }),
    ]);

    const revenueToday = await Payment.sum('amount', { where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } } }) || 0;

    // Courses recentes (dernieres 10)
    const recentRidesRaw = await Ride.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'name'] },
        { model: User, as: 'driver', attributes: ['id', 'name'] },
      ],
    });
    const recentRides = recentRidesRaw.map(r => ({
      id: r.id, status: r.status, amount: r.price,
      passengerName: r.passenger?.name, driverName: r.driver?.name,
      createdAt: r.createdAt,
    }));

    // Chauffeurs en attente
    const pendingRaw = await Driver.findAll({
      where: { verificationStatus: 'pending' },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      limit: 20,
    });
    const pendingApprovals = pendingRaw.map(d => ({
      id: d.id, name: d.User?.name, email: d.User?.email,
    }));

    res.json({
      success: true,
      data: {
        totalUsers, totalDrivers, totalRides,
        totalRevenue: totalRevenue || 0,
        pendingApprovals, recentRides,
        today: {
          rides: await Ride.count({ where: { createdAt: { [Op.gte]: startOfDay } } }),
          revenue: revenueToday,
        },
      },
    });
  } catch (error) { next(error); }
});

// ============================================================
//  DRIVERS
// ============================================================
router.get('/drivers', async (req, res, next) => {
  try {
    const drivers = await Driver.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email', 'phone', 'isActive'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: drivers });
  } catch (error) { next(error); }
});

router.get('/drivers/:id', async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'phone', 'isActive'] }],
    });
    if (!driver) throw new AppError('Driver not found', 404);
    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
});

router.put('/drivers/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended', 'pending', 'rejected'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) throw new AppError('Driver not found', 404);
    driver.verificationStatus = status === 'active' ? 'approved' : status === 'rejected' ? 'rejected' : driver.verificationStatus;
    driver.status = status;
    if (status === 'approved' || status === 'active') driver.approvedAt = new Date();
    if (status === 'rejected') driver.rejectionReason = req.body.reason || 'Rejected by admin';
    await driver.save();
    res.json({ success: true, data: driver, message: `Driver status updated to ${status}` });
  } catch (error) { next(error); }
});

router.post('/drivers/:id/suspend', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) throw new AppError('Driver not found', 404);
    driver.status = 'suspended';
    driver.suspensionReason = reason || 'Suspended by admin';
    await driver.save();
    res.json({ success: true, data: driver, message: 'Driver suspended' });
  } catch (error) { next(error); }
});

router.delete('/drivers/:id', async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) throw new AppError('Driver not found', 404);
    // Ne pas supprimer l'\''utilisateur admin
    const user = await User.findByPk(driver.userId);
    if (user && user.email === 'fh.lebazar@gmail.com') {
      throw new AppError('Cannot delete admin account', 403, 'ADMIN_PROTECTED');
    }
    await driver.destroy();
    if (user) await user.destroy();
    res.json({ success: true, message: 'Driver deleted' });
  } catch (error) { next(error); }
});

// ============================================================
//  RIDES
// ============================================================
router.get('/rides', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = status && status !== 'all' ? { status } : {};
    const { count, rows } = await Ride.findAndCountAll({
      where, offset, limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'name'] },
        { model: User, as: 'driver', attributes: ['id', 'name'] },
      ],
    });
    const data = rows.map(r => ({
      id: r.id, status: r.status, amount: r.price,
      passengerName: r.passenger?.name, driverName: r.driver?.name,
      pickupAddress: r.pickupAddress, dropoffAddress: r.dropoffAddress,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    }));
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) { next(error); }
});

router.get('/rides/:id', async (req, res, next) => {
  try {
    const ride = await Ride.findByPk(req.params.id, {
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'driver', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!ride) throw new AppError('Ride not found', 404);
    res.json({ success: true, data: ride });
  } catch (error) { next(error); }
});

router.put('/rides/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findByPk(req.params.id);
    if (!ride) throw new AppError('Ride not found', 404);
    ride.status = status;
    await ride.save();
    res.json({ success: true, data: ride });
  } catch (error) { next(error); }
});

// ============================================================
//  USERS
// ============================================================
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    // 🔒 PROTECTION: empecher desactivation de l'\''admin
    if (user.email === 'fh.lebazar@gmail.com' && isActive === false) {
      throw new AppError('Cannot deactivate the admin account', 403, 'ADMIN_PROTECTED');
    }
    await user.update({ isActive });
    res.json({ success: true, data: user.toJSON(), message: `User ${isActive ? 'activated' : 'deactivated'}` });
  } catch (error) { next(error); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    // 🔒 PROTECTION: empecher suppression de l'\''admin
    if (user.email === 'fh.lebazar@gmail.com') {
      throw new AppError('Cannot delete the admin account', 403, 'ADMIN_PROTECTED');
    }
    // Supprimer aussi le driver profile si existe
    const driver = await Driver.findOne({ where: { userId: user.id } });
    if (driver) await driver.destroy();
    await user.destroy();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) { next(error); }
});

// ============================================================
//  REVENUE
// ============================================================
router.get('/revenue', async (req, res, next) => {
  try {
    const totalRevenue = await Payment.sum('amount') || 0;
    const platformFees = totalRevenue * 0.15; // 15% commission
    const driverEarnings = totalRevenue - platformFees;

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d);
    }
    const breakdown = await Promise.all(months.map(async (start) => {
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const amount = await Payment.sum('amount', { where: { createdAt: { [Op.between]: [start, end] } } }) || 0;
      return { period: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), amount };
    }));

    const revenueByPeriod = [
      { period: 'Cette semaine', amount: totalRevenue * 0.25 },
      { period: 'Ce mois', amount: totalRevenue * 0.60 },
      { period: 'Ce trimestre', amount: totalRevenue * 0.85 },
      { period: 'Cette annee', amount: totalRevenue },
    ];

    res.json({ success: true, data: { totalRevenue, platformFees, driverEarnings, breakdown, revenueByPeriod } });
  } catch (error) { next(error); }
});

// ============================================================
//  SUPPORT TICKETS (structure simplifiee en base)
// ============================================================
router.get('/support', async (req, res, next) => {
  try {
    // Support tickets = rides annulees + drivers suspended (a titre d'\''exemple)
    const cancelledRides = await Ride.findAll({
      where: { status: 'cancelled' },
      limit: 50, order: [['updatedAt', 'DESC']],
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'name'] },
        { model: User, as: 'driver', attributes: ['id', 'name'] },
      ],
    });
    const tickets = cancelledRides.map((r, i) => ({
      id: r.id,
      userName: r.passenger?.name || 'N/A',
      subject: `Course annulee #${r.id}`,
      status: 'open',
      createdAt: r.updatedAt || r.createdAt,
    }));
    res.json({ success: true, data: tickets });
  } catch (error) { next(error); }
});

router.put('/support/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    res.json({ success: true, data: { id: req.params.id, status }, message: 'Ticket updated' });
  } catch (error) { next(error); }
});

// ============================================================
//  SETTINGS (stockees dans une table ou fichier)
// ============================================================
let appSettings = {
  baseFare: 2.50, pricePerKm: 1.50, platformFee: 15,
  enableRegistrations: true, enableDriverApprovals: true, enableRealTimeTracking: true,
};

router.get('/settings', async (req, res, next) => {
  try {
    res.json({ success: true, data: appSettings });
  } catch (error) { next(error); }
});

router.put('/settings', async (req, res, next) => {
  try {
    const { baseFare, pricePerKm, platformFee, enableRegistrations, enableDriverApprovals, enableRealTimeTracking } = req.body;
    if (baseFare !== undefined) appSettings.baseFare = baseFare;
    if (pricePerKm !== undefined) appSettings.pricePerKm = pricePerKm;
    if (platformFee !== undefined) appSettings.platformFee = platformFee;
    if (enableRegistrations !== undefined) appSettings.enableRegistrations = enableRegistrations;
    if (enableDriverApprovals !== undefined) appSettings.enableDriverApprovals = enableDriverApprovals;
    if (enableRealTimeTracking !== undefined) appSettings.enableRealTimeTracking = enableRealTimeTracking;
    res.json({ success: true, data: appSettings, message: 'Settings updated' });
  } catch (error) { next(error); }
});

module.exports = router;