const crypto = require('crypto');
const { RefreshToken } = require('../models');

/**
 * Generate a refresh token for a user
 * @param {number} userId - The user ID
 * @returns {Promise<string>} The refresh token
 */
async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await RefreshToken.create({
    token,
    userId,
    expiresAt
  });

  return token;
}

/**
 * Verify a refresh token and return the associated user ID
 * @param {string} token - The refresh token
 * @returns {Promise<number|null>} The user ID if valid, null otherwise
 */
async function verifyRefreshToken(token) {
  const refreshToken = await RefreshToken.findOne({
    where: { token },
    include: [{ model: require('../models').User, attributes: [] }] // Ensure user exists
  });

  if (!refreshToken) {
    return null;
  }

  // Check if expired
  if (refreshToken.expiresAt < new Date()) {
    await refreshToken.destroy();
    return null;
  }

  return refreshToken.userId;
}

/**
 * Revoke a specific refresh token
 * @param {string} token - The refresh token to revoke
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(token) {
  await RefreshToken.destroy({
    where: { token }
  });
}

/**
 * Revoke all refresh tokens for a user
 * @param {number} userId - The user ID
 * @returns {Promise<void>}
 */
async function revokeAllUserTokens(userId) {
  await RefreshToken.destroy({
    where: { userId }
  });
}

module.exports = {
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens
};
