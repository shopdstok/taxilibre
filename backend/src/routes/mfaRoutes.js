const express = require('express')
const router = express.Router()
const MFAController = require('../controllers/mfaController')
const { authenticateToken } = require('../middleware/authMiddleware')

// All MFA routes require authentication except verify-login and backup-code/verify
router.post('/setup', authenticateToken, MFAController.setupTOTP)
router.post('/verify', authenticateToken, MFAController.verifyAndEnable)
router.get('/status', authenticateToken, MFAController.getStatus)
router.post('/disable', authenticateToken, MFAController.disable)
// Verify TOTP for login (public)
router.post('/verify-login', MFAController.verifyLogin)
// Regenerate backup codes (requires auth)
router.post('/backup-codes', authenticateToken, MFAController.regenerateBackupCodes)
// Use backup code (public)
router.post('/backup-code/verify', MFAController.useBackupCode)

module.exports = router
