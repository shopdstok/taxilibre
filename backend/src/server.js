'use strict';

const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const { logger } = require('./services/loggingService');
const { sequelize } = require('./models');
const path = require('path');
const fs = require('fs');

// ─── Configuration du port et host ───────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3003;
const HOST = '0.0.0.0'; // Toujours 0.0.0.0 pour Render

// ─── Création du serveur HTTP ─────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Initialisation de Socket.IO ─────────────────────────────────────────────
let io;
try {
  io = initSocket(server);
  logger.info('✅ Socket.IO initialisé');
} catch (err) {
  logger.error('❌ Erreur initialisation Socket.IO :', err);
}

// ─── Splitter SQL (blocs dollar-quoted $$ ... $$) ────────────────────────────
function splitSqlIntoStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarDelimiter = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (char === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const delimiter = match[0];
        current += delimiter;

        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarDelimiter = delimiter;
        } else if (delimiter === dollarDelimiter) {
          inDollarQuote = false;
          dollarDelimiter = '';
        }

        i += delimiter.length - 1;
        continue;
      }
    }

    if (char === ';' && !inDollarQuote) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(Boolean);
}

// ─── Exécution des migrations SQL ────────────────────────────────────────────
const runMigrations = async () => {
  const migrationsDirPath = path.join(__dirname, '..', 'database', 'migrations');

  if (!fs.existsSync(migrationsDirPath)) {
    logger.warn(`⚠️  Dossier migrations introuvable : ${migrationsDirPath}`);
    return;
  }

  const files = fs.readdirSync(migrationsDirPath);
  const sqlFiles = files
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    logger.warn('⚠️  Aucun fichier SQL de migration trouvé');
    return;
  }

  logger.info(`📦 ${sqlFiles.length} fichier(s) de migration détecté(s)`);

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDirPath, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    logger.info(`⏳ Migration en cours : ${file}`);

    const statements = splitSqlIntoStatements(sql);

    for (const statement of statements) {
      if (!statement.trim()) continue;
      try {
        await sequelize.query(statement, {
          transaction: null,
          logging: msg => logger.debug(msg),
        });
      } catch (stmtError) {
        // Ignorer les erreurs "already exists" (idempotence)
        const ignoredErrors = [
          '42P07', // duplicate_table
          '42701', // duplicate_column
          '42710', // duplicate_object
          '23505', // unique_violation
        ];
        if (ignoredErrors.includes(stmtError.parent?.code)) {
          logger.warn(`⚠️  Ignoré (déjà existant) dans ${file} : ${stmtError.message}`);
          continue;
        }
        logger.error(`❌ Erreur dans ${file} :\n${statement}`);
        throw stmtError;
      }
    }

    logger.info(`✅ Migration réussie : ${file}`);
  }
};

// ─── Seed Admin ───────────────────────────────────────────────────────────────
const runSeedAdmin = async () => {
  try {
    const seedAdmin = require('../scripts/seedAdmin');
    await seedAdmin();
    logger.info('✅ Seed admin exécuté avec succès');
  } catch (err) {
    // Ne pas bloquer le démarrage si le seed échoue
    logger.warn(`⚠️  Seed admin ignoré : ${err.message}`);
  }
};

// ─── Vérification de la connexion DB ─────────────────────────────────────────
const checkDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion PostgreSQL établie avec succès');
    return true;
  } catch (err) {
    logger.error(`❌ Impossible de se connecter à PostgreSQL : ${err.message}`);
    return false;
  }
};

// ─── Démarrage principal ──────────────────────────────────────────────────────
const startServer = async () => {
  try {
    logger.info('🚀 Démarrage de TaxiLibre Backend...');
    logger.info(`📍 Environnement : ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📡 Port cible    : ${PORT}`);
    logger.info(`🌐 Host cible    : ${HOST}`);

    // 1. Vérifier la connexion DB
    const dbOk = await checkDatabaseConnection();
    if (!dbOk) {
      logger.error('❌ Arrêt : base de données inaccessible');
      process.exit(1);
    }

    // 2. Synchronisation Sequelize (sans force en prod)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      logger.info('✅ Sequelize sync effectué (dev)');
    }

    // 3. Migrations SQL
    await runMigrations();

    // 4. Seed admin
    await runSeedAdmin();

    // 5. Démarrage du serveur HTTP sur 0.0.0.0
    await new Promise((resolve, reject) => {
      server.listen(PORT, HOST, () => {
        logger.info('═══════════════════════════════════════');
        logger.info('  ✅ TAXILIBRE BACKEND EN LIGNE');
        logger.info(`  📡 http://${HOST}:${PORT}`);
        logger.info(`  🌍 NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
        logger.info('═══════════════════════════════════════');
        resolve();
      });
      server.once('error', reject);
    });

  } catch (err) {
    logger.error('❌ Erreur critique au démarrage :', err);
    process.exit(1);
  }
};

// ─── Gestion propre de l'arrêt (Graceful Shutdown) ───────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`\n🛑 Signal ${signal} reçu — arrêt propre en cours...`);

  // 1. Arrêter d'accepter de nouvelles connexions HTTP
  server.close(async () => {
    logger.info('✅ Serveur HTTP fermé');

    // 2. Fermer la connexion DB
    try {
      await sequelize.close();
      logger.info('✅ Connexion PostgreSQL fermée');
    } catch (err) {
      logger.error('❌ Erreur fermeture PostgreSQL :', err.message);
    }

    // 3. Fermer Redis si disponible
    try {
      const { redisClient } = require('./config/redis');
      if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        logger.info('✅ Connexion Redis fermée');
      }
    } catch (err) {
      logger.warn('⚠️  Redis déjà fermé ou introuvable');
    }

    logger.info('👋 TaxiLibre Backend arrêté proprement');
    process.exit(0);
  });

  // Forcer l'arrêt après 15 secondes
  setTimeout(() => {
    logger.error('⏰ Timeout graceful shutdown — arrêt forcé');
    process.exit(1);
  }, 15000);
};

// ─── Signaux système ──────────────────────────────────────────────────────────
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Render envoie SIGTERM
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));  // Ctrl+C local

// ─── Erreurs non gérées ───────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('❌ Erreur non gérée (uncaughtException) :', {
    message: err.message,
    stack: err.stack,
    code: err.code,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promise non gérée (unhandledRejection) :', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  process.exit(1);
});

// ─── Lancement ────────────────────────────────────────────────────────────────
startServer();

module.exports = { server, io };