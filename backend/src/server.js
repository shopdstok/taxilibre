'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

const app = require('./app');
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
// START SERVER
// ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    logger.info('🚀 Démarrage TaxiLibre...');
    logger.info(`📡 PORT = ${PORT}`);

    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connecté');

    await runMigrations();
    await runSeedAdmin();

    server.listen(PORT, HOST, () => {
      logger.info('══════════════════════════════');
      logger.info(`✅ Backend en ligne`);
      logger.info(`🌍 http://${HOST}:${PORT}`);
      logger.info('══════════════════════════════');
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

process.on('uncaughtException', err => {
  logger.error('❌ uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', err => {
  logger.error('❌ unhandledRejection:', err);
  process.exit(1);
});

startServer();

module.exports = { server, io };