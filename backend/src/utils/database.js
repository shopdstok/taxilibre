/**
 * Database initialization and seeding
 */

const { sequelize } = require('../config/database')
const { User, Driver, Vehicle } = require('../models')
const bcrypt = require('bcryptjs')

const initializeDatabase = async () => {
  try {
    // Sync all models
    await sequelize.sync({ force: false, alter: true })

    // Seed admin user if not exists
    const adminExists = await User.findOne({
      where: { email: process.env.ADMIN_EMAIL || 'admin@taxilibre.com' }
    })

    if (!adminExists) {
      const adminPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123456',
        12
      )

      await User.create({
        email: process.env.ADMIN_EMAIL || 'admin@taxilibre.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        emailVerifiedAt: new Date()
      })

    }

    return true
  } catch (error) {
    throw error
  }
}

module.exports = { initializeDatabase }
