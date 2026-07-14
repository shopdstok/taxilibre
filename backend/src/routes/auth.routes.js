const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { validate, authValidators } = require('../middleware/validation.middleware')
const rateLimit = require('express-rate-limit')
let authLimiter
if (process.env.NODE_ENV === 'test') {
  authLimiter = (req, res, next) => next()
} else {
  authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
  })
}
const { authenticateToken } = require('../middleware/authMiddleware')

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, phone, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [passenger, driver, admin]
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *       400:
 *         description: Données invalides
 */
router.post('/register', authLimiter, validate(authValidators.register), authController.register)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne accessToken et refreshToken
 *       401:
 *         description: Identifiants invalides
 */
router.post('/login', authLimiter, validate(authValidators.login), authController.login)

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Rafraîchir le token d'accès
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveaux tokens générés
 *       401:
 *         description: Refresh token invalide ou expiré
 */
router.post('/refresh-token', authLimiter, authController.refreshToken)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnexion (révoque le refresh token)
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       400:
 *         description: Refresh token manquant
 */
router.post('/logout', authLimiter, authController.logout)

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Déconnexion de tous les appareils
 *     tags: [Authentification]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tous les refresh tokens révoqués
 *       401:
 *         description: Non authentifié
 */
router.post('/logout-all', authLimiter, authenticateToken, authController.logoutAll)

// Password reset
router.post('/forgot-password', authLimiter, validate(authValidators.forgotPassword), authController.requestPasswordReset)
router.post('/reset-password', authLimiter, validate(authValidators.resetPassword), authController.resetPassword)

// OTP verification
router.post('/send-phone-otp', authLimiter, validate(authValidators.sendOTP), authController.sendPhoneOTP)
router.post('/verify-phone-otp', authLimiter, validate(authValidators.verifyOTP), authController.verifyPhoneOTP)
router.post('/send-email-otp', authLimiter, validate(authValidators.sendOTP), authController.sendEmailOTP)
router.post('/verify-email-otp', authLimiter, validate(authValidators.verifyOTP), authController.verifyEmailOTP)

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *       401:
 *         description: Non authentifié
 */
router.get('/profile', authenticateToken, authController.getProfile)
router.put('/profile', authenticateToken, validate(authValidators.updateProfile), authController.updateProfile)

// OAuth routes (mounted separately in app.js)
router.get('/:provider', authenticateToken, authController.oauthRedirect)
router.get('/:provider/callback', authController.oauthCallback)

module.exports = router