const { User } = require('../models')
const { successResponse, errorResponse, AppError } = require('../middleware/errorMiddleware')

/**
 * Middleware pour vérifier si l'utilisateur est un admin autorisé
 * Seul fh.lebazar@gmail.com peut accéder aux routes admin
 */
const checkAdmin = async (req, res, next) => {
  try {
    // Récupérer l'utilisateur depuis le token JWT (déjà vérifié par authenticateToken)
    const user = await User.findByPk(req.userId)

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Vérifier que c'est bien l'admin autorisé
    if (user.role !== 'admin' || user.email !== 'fh.lebazar@gmail.com') {
      throw new AppError('Admin access denied', 403, 'ADMIN_ACCESS_DENIED')
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { checkAdmin }
