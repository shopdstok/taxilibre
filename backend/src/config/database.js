const { Sequelize } = require('sequelize')
const pg = require('pg')
const path = require('path')
require('dotenv').config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  override: false
})
const { logger } = require('../services/loggingService')
const { getStore } = require('../utils/asyncStorage')

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

// ─── Validation des variables d'environnement ─────────────────────────────────
const validateEnv = () => {
  if (isTest) return true

  // Si DATABASE_URL est définie, c'est suffisant (cas Render)
  if (process.env.DATABASE_URL) {
    logger.info('✅ DATABASE_URL détectée, utilisation directe')
    return true
  }

  // Sinon on vérifie les variables individuelles
  const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME']
  const missingVars = requiredVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    logger.error(`❌ Variables manquantes : ${missingVars.join(', ')}`)
    logger.error('Définissez DATABASE_URL ou les variables DB_* individuelles')
    return false
  }

  return true
}

// ─── Vérification du fichier .env ────────────────────────────────────────────
const checkEnvFile = () => {
  const fs = require('fs')
  const envPath = path.resolve(__dirname, '..', '..', '.env')
  if (!fs.existsSync(envPath)) {
    logger.warn(`⚠️  Fichier .env introuvable à ${envPath}`)
  }
}

if (!isTest) {
  checkEnvFile()
  if (!validateEnv()) {
    logger.warn('⚠️  Démarrage avec des variables manquantes — la connexion va probablement échouer')
  }
}

// ─── Construction de l'URL de connexion ──────────────────────────────────────
const getDatabaseUrl = () => {
  // Priorité 1 : DATABASE_URL (Render, Heroku, etc.)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // Priorité 2 : variables individuales
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env

  if (!DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT || !DB_NAME) {
    logger.error('❌ Impossible de construire DATABASE_URL : variables DB_* manquantes')
    process.exit(1) // inutile de continuer
  }

  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
}

// ─── Configuration SSL ────────────────────────────────────────────────────────
const dialectOptions = isProduction
  ? {
      // Check if we are connecting to a localhost or remote host
      host: process.env.DB_HOST || '',
      ssl:
        process.env.DB_HOST === 'localhost' ||
        process.env.DB_HOST === '127.0.0.1' ||
        process.env.DB_HOST?.startsWith('::1')
          ? false
          : {
              require: true,
              rejectUnauthorized: false
            },
      connectTimeout: 10000
    }
  : {
      connectTimeout: 10000
    }

// ─── Configuration du pool ────────────────────────────────────────────────────
const poolConfig = {
  max: isProduction ? 10 : 5,
  min: 0,
  acquire: 30000,
  idle: isProduction ? 5000 : 10000
}

// ─── Création de l'instance Sequelize ─────────────────────────────────────────
let sequelize

if (isTest) {
  // SQLite en mémoire pour les tests
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  })
} else {
  const databaseUrl = getDatabaseUrl()

  logger.info(`🔌 Connexion à la base : ${databaseUrl.replace(/:\/\/.*@/, '://***@')}`) // masque le mot de passe

  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: isProduction ? false : (msg) => logger.debug(msg),
    pool: poolConfig,
    dialectOptions
  })

  // ─── Configuration des variables de session pour RLS ────────────────────────
  // On utilise AsyncLocalStorage pour stocker l'utilisateur courant de la requête
  // et on définit les variables de session PostgreSQL à chaque acquisition de connexion
  if (sequelize.pool) {
    sequelize.pool.on('acquire', (connection) => {
      const store = getStore()
      const userId = store?.userId ?? ''
      const userRole = store?.userRole ?? ''

      // Utilisation de requêtes paramétrées pour éviter l'injection SQL
      connection.query(
        'SELECT set_config($1, $2, true)',
        ['app.user_id', userId],
        (err) => {
          if (err) {
            logger.error('Erreur lors de la définition de app.user_id:', err)
          }
        }
      )
      connection.query(
        'SELECT set_config($1, $2, true)',
        ['app.user_role', userRole],
        (err) => {
          if (err) {
            logger.error('Erreur lors de la définition de app.user_role:', err)
          }
        }
      )
    })
  }
}

// ─── Test de connexion ────────────────────────────────────────────────────────
const testConnection = async () => {
  try {
    await sequelize.authenticate()
    logger.info('✅ Connexion à la base de données réussie')
    return true
  } catch (error) {
    logger.error('❌ Impossible de se connecter à la base de données :', error.message)
    return false
  }
}

// ─── Synchronisation des modèles ──────────────────────────────────────────────
const syncModels = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: !force })
    logger.info('✅ Modèles synchronisés')
    return true
  } catch (error) {
    logger.error('❌ Erreur de synchronisation des modèles :', error.message)
    return false
  }
}

// ─── Fermeture de la connexion ────────────────────────────────────────────────
const closeConnection = async () => {
  try {
    await sequelize.close()
    logger.info('✅ Connexion à la base fermée')
  } catch (error) {
    logger.warn('⚠️  Erreur lors de la fermeture de la connexion :', error.message)
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncModels,
  closeConnection
}
