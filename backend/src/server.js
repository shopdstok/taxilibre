'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

const app = require('./app');
// Le serveur démarre même si la base de données n'est pas encore prête.
// /health répond toujours ; /ready répond 503 tant que la DB n'est pas connectée.
app.set('dbReady', false);
const { initSocket } = require('./socket');
const { logger } = require('./services/loggingService');
const { sequelize } = require('./models');

// ─────────────────────────────────────────────────────────────
// CONFIG PORT (Render utilise process.env.PORT)
// ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3003;
const HOST = '0.0.0.0';

// ─────────────────────────────────────────────────────────────
// HTTP SERVER
// ─────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────────────────────────────
let io;
try {
  io = initSocket(server);
  logger.info('✅ Socket.IO initialisé');
} catch (err) {
  logger.error('❌ Erreur initialisation Socket.IO :', err);
}

// ─────────────────────────────────────────────────────────────
// SQL SPLITTER (support $$ blocks)
// ─────────────────────────────────────────────────────────────
function splitSqlIntoStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let delimiter = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (char === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const d = match[0];
        current += d;

        if (!inDollarQuote) {
          inDollarQuote = true;
          delimiter = d;
        } else if (d === delimiter) {
          inDollarQuote = false;
          delimiter = '';
        }

        i += d.length - 1;
        continue;
      }
    }

    if (char === ';' && !inDollarQuote) {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current.trim());

  return statements.filter(Boolean);
}

// ─────────────────────────────────────────────────────────────
// MIGRATIONS (NE BLOQUE PLUS LE SERVEUR)
// ─────────────────────────────────────────────────────────────
const runMigrations = async () => {
  const dir = path.join(__dirname, '..', 'database', 'migrations');

  if (!fs.existsSync(dir)) {
    logger.warn('⚠️  Aucun dossier migrations trouvé');
    return;
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  logger.info(`📦 ${files.length} fichier(s) de migration détecté(s)`);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    logger.info(`⏳ Migration : ${file}`);

    const statements = splitSqlIntoStatements(sql);

    for (const statement of statements) {
      if (!statement.trim()) continue;

      try {
        await sequelize.query(statement, { logging: false });
      } catch (err) {
        const code = err.parent?.code || 'UNKNOWN';

        // ✅ erreurs non bloquantes
        const nonBlocking = [
          '42P07', // duplicate_table
          '42701', // duplicate_column
          '42710', // duplicate_object
          '42703', // column does not exist
          '23505', // unique_violation
          '22P02', // enum error
          '42601', // syntax
          '42P01'  // table does not exist
        ];

        if (nonBlocking.includes(code)) {
          logger.warn(`⚠️  Migration ignorée [${code}] : ${err.message}`);
          continue;
        }

        logger.error(`❌ Migration erreur critique [${code}] : ${err.message}`);
      }
    }

    logger.info(`✅ Migration traitée : ${file}`);
  }
};

// ─────────────────────────────────────────────────────────────
// SEED ADMIN
// ─────────────────────────────────────────────────────────────
const runSeedAdmin = async () => {
  try {
    const seedAdmin = require('../scripts/seedAdmin');
    await seedAdmin();
    logger.info('✅ Seed admin exécuté');
  } catch (err) {
    logger.warn('⚠️  Seed ignoré :', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// DATABASE INIT (non-bloquant, avec retry) — lancé APRÈS listen
// ─────────────────────────────────────────────────────────────
const initDatabase = async () => {
  const MAX_ATTEMPTS = 12;
  const DELAY_MS = 5000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`🔌 [DB ${attempt}/${MAX_ATTEMPTS}] Connexion PostgreSQL...`);
      await sequelize.authenticate();
      logger.info('✅ PostgreSQL connecté');

      await runMigrations();
      await runSeedAdmin();

      app.set('dbReady', true);
      logger.info('✅ Base de données prête — API pleinement opérationnelle');
      return;
    } catch (err) {
      logger.error(`❌ [DB ${attempt}/${MAX_ATTEMPTS}] Échec : ${err.message}`);
      if (attempt < MAX_ATTEMPTS) {
        logger.info(`⏳ Nouvelle tentative dans ${DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }
  }

  logger.error('⛔ Base de données injoignable après plusieurs tentatives. Le serveur reste en ligne (/health=OK) mais les routes DB renverront des erreurs.');
  app.set('dbReady', false);
};

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    logger.info('🚀 Démarrage TaxiLibre...');
    logger.info(`📡 PORT = ${PORT}`);

    // ✅ On écoute IMMÉDIATEMENT : Render passe en "live" et /health répond
    // même si la base de données est temporairement injoignable.
    server.listen(PORT, HOST, () => {
      logger.info('══════════════════════════════');
      logger.info(`✅ Backend en ligne (HTTP)`);
      logger.info(`🌍 http://${HOST}:${PORT}`);
      logger.info('══════════════════════════════');
    });

    server.on('error', (err) => {
      logger.error('❌ Erreur HTTP server :', err);
      process.exit(1);
    });

    // ✅ Initialisation de la DB en arrière-plan, SANS bloquer le serveur.
    initDatabase().catch((err) => {
      logger.error('❌ initDatabase non géré :', err);
    });
  } catch (err) {
    logger.error('❌ Erreur critique au démarrage :', err);
    process.exit(1);
  }
};

// ─────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`🛑 ${signal} reçu`);

  server.close(async () => {
    await sequelize.close();
    logger.info('✅ DB fermée');
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 15000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Redis est optionnel : ne jamais planter le processus sur une erreur Redis.
const isRedisConnectionRefused = (err) => {
  if (!err) return false;
  if (err.code === 'ECONNREFUSED' && (err.port === 6379 || String(err.address || '').includes('redis'))) return true;
  if (err.code === 'ENOTFOUND' && String(err.hostname || err.address || '').includes('redis')) return true;
  const msg = String(err.message || err);
  return msg.includes('redis') && (msg.includes('ECONNREFUSED') || msg.includes('connect'));
};

process.on('uncaughtException', (err) => {
  if (isRedisConnectionRefused(err)) {
    logger.warn('⚠️  Redis ignoré (non utilisé) — uncaughtException:', err.message);
    return;
  }
  logger.error('❌ uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  if (isRedisConnectionRefused(err)) {
    logger.warn('⚠️  Redis ignoré (non utilisé) — unhandledRejection:', err.message);
    return;
  }
  logger.error('❌ unhandledRejection:', err);
  process.exit(1);
});

startServer();

module.exports = { server, io };
