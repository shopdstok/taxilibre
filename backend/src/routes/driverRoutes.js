const express = require('express')
const router = express.Router()
const driverController = require('../controllers/driverController')
const { authenticateToken, requireDriver } = require('../middleware/authMiddleware')

router.use(authenticateToken, requireDriver)

/**
 * @swagger
 * /drivers/status:
 *   put:
 *     summary: Changer le statut du chauffeur (en ligne / hors ligne)
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline]
 *                 example: online
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Réservé aux chauffeurs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/status', driverController.updateStatus)

/**
 * @swagger
 * /drivers/me:
 *   get:
 *     summary: Récupérer le profil du chauffeur connecté
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profil chauffeur récupéré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Réservé aux chauffeurs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', driverController.getProfile)

module.exports = router