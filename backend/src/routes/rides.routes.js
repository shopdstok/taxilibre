const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validate, rideValidators } = require('../middleware/validation.middleware');

// Appliquer l'authentification à toutes les routes ci-dessous
router.use(authenticateToken);

/**
 * @swagger
 * /rides:
 *   post:
 *     summary: Créer une nouvelle course
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupAddress
 *               - dropoffAddress
 *             properties:
 *               pickupAddress:
 *                 type: string
 *                 example: 10 rue de Rivoli, Paris
 *               pickupLatitude:
 *                 type: number
 *                 example: 48.8566
 *               pickupLongitude:
 *                 type: number
 *                 example: 2.3522
 *               dropoffAddress:
 *                 type: string
 *                 example: 5 avenue des Champs-Élysées, Paris
 *               dropoffLatitude:
 *                 type: number
 *                 example: 48.8698
 *               dropoffLongitude:
 *                 type: number
 *                 example: 2.3075
 *               vehicleType:
 *                 type: string
 *                 enum: [standard, comfort, van]
 *                 example: standard
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-07-06T14:30:00Z
 *     responses:
 *       201:
 *         description: Course créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', rideValidators.createRide, rideController.requestRide);

/**
 * @swagger
 * /rides:
 *   get:
 *     summary: Lister les courses de l'utilisateur connecté
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requested, accepted, in_progress, completed, cancelled]
 *         example: completed
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Liste des courses récupérée
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
 */
router.get('/', rideController.getUserRides);

/**
 * @swagger
 * /rides/{id}:
 *   get:
 *     summary: Obtenir les détails d'une course
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Détails de la course
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Course introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', rideController.getRide);

/**
 * @swagger
 * /rides/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'une course
 *     tags: [Rides]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 123e4567-e89b-12d3-a456-426614174000
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
 *                 enum: [accepted, in_progress, completed, cancelled]
 *                 example: accepted
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Transition de statut invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Action non autorisée pour ce rôle
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/status', rideController.updateRideStatus);

module.exports = router;