const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const bcrypt = require('bcryptjs')
const { UserMFA } = require('../models')
const { sendSMS } = require('./smsService')

class MFAService {
  /**
   * Generate TOTP secret and QR code for user
   */
  static async generateTOTPSecret (userId, email) {
    const secret = speakeasy.generateSecret({
      name: `TaxiLibre:${email}`,
      length: 32,
      issuer: 'TaxiLibre'
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    // Store secret temporarily (not enabled until verified)
    await UserMFA.upsert({
      userId,
      method: 'totp',
      secret: secret.base32,
      isEnabled: false
    })

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    }
  }

  /**
   * Verify TOTP token and enable MFA
   */
  static async verifyAndEnableTOTP (userId, token) {
    const mfaRecord = await UserMFA.findOne({
      where: { userId, method: 'totp' }
    })

    if (!mfaRecord || !mfaRecord.secret) {
      throw new Error('TOTP not configured for this user')
    }

    const verified = speakeasy.totp.verify({
      secret: mfaRecord.secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps drift
    })

    if (!verified) {
      return { success: false, message: 'Invalid verification code' }
    }

    // Enable MFA
    await mfaRecord.update({
      isEnabled: true,
      verifiedAt: new Date()
    })

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId)

    return {
      success: true,
      message: 'MFA enabled successfully',
      backupCodes
    }
  }

  /**
   * Verify TOTP during login
   */
  static async verifyTOTP (userId, token) {
    const mfaRecord = await UserMFA.findOne({
      where: { userId, method: 'totp', isEnabled: true }
    })

    if (!mfaRecord) {
      return { success: false, message: 'MFA not enabled' }
    }

    const verified = speakeasy.totp.verify({
      secret: mfaRecord.secret,
      encoding: 'base32',
      token,
      window: 2
    })

    if (verified) {
      await mfaRecord.update({ lastUsedAt: new Date() })
      return { success: true }
    }

    return { success: false, message: 'Invalid code' }
  }

  /**
   * Generate backup codes for account recovery
   */
  static async generateBackupCodes (userId) {
    const codes = []
    const hashedCodes = []

    for (let i = 0; i < 10; i++) {
      // Generate 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      codes.push(code)
      hashedCodes.push(await bcrypt.hash(code, 10))
    }

    // Store hashed codes
    await UserMFA.upsert({
      userId,
      method: 'backup_codes',
      backupCodes: hashedCodes,
      isEnabled: true
    })

    return codes // Return plain codes to show user once
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode (userId, code) {
    const mfaRecord = await UserMFA.findOne({
      where: { userId, method: 'backup_codes' }
    })

    if (!mfaRecord || !mfaRecord.backupCodes) {
      return { success: false }
    }

    // Check each hashed code
    for (let i = 0; i < mfaRecord.backupCodes.length; i++) {
      const match = await bcrypt.compare(code, mfaRecord.backupCodes[i])
      if (match) {
        // Remove used code
        const updatedCodes = [...mfaRecord.backupCodes]
        updatedCodes.splice(i, 1)
        await mfaRecord.update({ backupCodes: updatedCodes })

        return { success: true }
      }
    }

    return { success: false, message: 'Invalid backup code' }
  }

  /**
   * Send SMS verification code
   */
  static async sendSMSCode (phoneNumber, code) {
    const message = `Your TaxiLibre verification code is: ${code}. Valid for 10 minutes.`
    return await sendSMS(phoneNumber, message)
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA (userId) {
    await UserMFA.destroy({
      where: { userId }
    })
    return { success: true }
  }

  /**
   * Check if MFA is enabled for user
   */
  static async isMFAEnabled (userId) {
    const mfaRecord = await UserMFA.findOne({
      where: { userId, isEnabled: true }
    })
    return !!mfaRecord
  }
}

module.exports = MFAService
