const MFAService = require('../services/mfaService')
const { UserMFA } = require('../models')

class MFAController {
  /**
   * Setup TOTP MFA for user
   */
  static async setupTOTP (req, res) {
    try {
      const userId = req.user.id
      const email = req.user.email

      const setup = await MFAService.generateTOTPSecret(userId, email)

      res.json({
        success: true,
        data: {
          qrCode: setup.qrCode,
          manualEntryKey: setup.manualEntryKey,
          message: 'Scan QR code with Google Authenticator or similar app'
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Verify and enable TOTP
   */
  static async verifyAndEnable (req, res) {
    try {
      const { token } = req.body
      const userId = req.user.id

      const result = await MFAService.verifyTOTP(userId, token)

      if (result.success) {
        await MFAService.enableMFA(userId)
        res.json({
          success: true,
          message: 'MFA enabled successfully'
        })
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Verify TOTP during login (before JWT issued)
   */
  static async verifyLogin (req, res) {
    try {
      const { userId, token } = req.body

      const result = await MFAService.verifyTOTP(userId, token)

      if (result.success) {
        res.json({
          success: true,
          message: 'MFA verified successfully'
        })
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Use backup code
   */
  static async useBackupCode (req, res) {
    try {
      const { userId, code } = req.body

      const result = await MFAService.verifyBackupCode(userId, code)

      if (result.success) {
        res.json({ success: true, message: 'Backup code accepted' })
      } else {
        res.status(400).json({
          success: false,
          error: result.message
        })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Disable MFA
   */
  static async disable (req, res) {
    try {
      const userId = req.user.id
      const { password } = req.body

      // Verify password first
      const user = await require('../models').User.findByPk(userId)
      const validPassword = await user.comparePassword(password)

      if (!validPassword) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password'
        })
      }

      await MFAService.disableMFA(userId)

      res.json({
        success: true,
        message: 'MFA disabled successfully'
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Get MFA status
   */
  static async getStatus (req, res) {
    try {
      const userId = req.user.id
      const mfaSettings = await MFAService.getMFASettings(userId)

      res.json({
        success: true,
        data: {
          methods: mfaSettings,
          message: 'MFA settings retrieved successfully'
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes (req, res) {
    try {
      const userId = req.user.id
      const { token } = req.body

      // Verify current TOTP
      const verified = await MFAService.verifyTOTP(userId, token)

      if (!verified.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        })
      }

      const backupCodes = await MFAService.generateBackupCodes(userId)

      res.json({
        success: true,
        data: {
          backupCodes,
          warning: 'Save these codes safely! Old codes are no longer valid.'
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

module.exports = MFAController
