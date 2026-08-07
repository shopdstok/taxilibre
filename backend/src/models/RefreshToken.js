// RefreshToken Model - Persisted (hashed) refresh tokens.
// Spec : userId, tokenHash, expiresAt. Restaura le modele supprime pendant le
// rework des modeles. Compatible avec refreshTokenService (colonne token)
// + tokenHash present pour durcissement futur (rotation RS256, Spec).
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  // Identifiant de jeton (brut pour retro-compat refreshTokenService).
  // Migrer vers un hash (tokenHash) en Phase 1.3 (RS256 hardening).
  token: {
    type: DataTypes.STRING(512),
    allowNull: false,
    unique: true,
    field: 'token'
  },
  tokenHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'token_hash'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_revoked'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['userId'] },
    { unique: true, fields: ['token'] }
  ]
});

// Associations definies dans models/index.js (db.RefreshToken.belongsTo User).
RefreshToken.associate = () => {};

module.exports = RefreshToken;
