const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const { logger } = require('./services/loggingService');
const seedAdmin = require('../scripts/seedAdmin');
const { sequelize } = require('./models');
const path = require('path');
const fs = require('fs');

// ─── Configuration du port et host ───────────────────────────────────────────
let PORT = process.env.PORT || 3003;
let HOST = process.env.HOST || '0.0.0.0';

// Override si PORT/HOST correspondent aux valeurs Redis par erreur
if (process.env.REDIS_PORT && process.env.PORT === process.env.REDIS_PORT) {
  console.warn(`Detected PORT matching REDIS_PORT (${process.env.REDIS_PORT}), overriding to default`);
  PORT = 3003;
}
if (process.env.REDIS_HOST && process.env.HOST === process.env.REDIS_HOST) {
  console.warn(`Detected HOST matching REDIS_HOST (${process.env.REDIS_HOST}), overriding to 0.0.0.0`);
  HOST = '0.0.0.0';
}

// ─── Création du serveur HTTP ─────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Initialisation de Socket.IO ─────────────────────────────────────────────
const io = initSocket(server);

// ─── Splitter SQL qui respecte les blocs dollar-quoted ($$ ... $$) ───────────
function splitSqlIntoStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarDelimiter = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    // Détection des délimiteurs de type $$ ou $tag$
    if (char === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const delimiter = match[0];
        current += delimiter; // ✅ on garde le $$ dans le SQL

        if (!inDollarQuote) {
          // Ouverture du bloc dollar-quoted
          inDollarQuote = true;
          dollarDelimiter = delimiter;
        } else if (delimiter === dollarDelimiter) {
          // Fermeture du bloc dollar-quoted
          inDollarQuote = false;
          dollarDelimiter = '';
        }

        i += delimiter.length - 1; // avancer l'index
        continue;
      }
    }

    // Le point-virgule termine un statement SAUF dans un bloc dollar-quoted
    if (char === ';' && !inDollarQuote) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  // Dernier statement sans point-virgule final
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(Boolean);
}

// ─── Exécution des migrations SQL ────────────────────────────────────────────
const runMigrations = async () => {
  const migrationsDirPath = path.join(__dirname, '..', 'database', 'migrations');

  // Vérifier que le dossier existe
  if (!fs.existsSync(migrationsDirPath)) {
    logger.warn(`Dossier migrations introuvable : ${migrationsDirPath}`);
    return;
  }

  try {
    const files = fs.readdirSync(migrationsDirPath);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // tri numérique/alphabétique pour respecter l'ordre

    if (sqlFiles.length === 0) {
      logger.warn('Aucun fichier SQL de migration trouvé');
      return;
    }

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDirPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      logger.info(`Exécution de la migration : ${file}`);

      // Découper le SQL en statements individuels
      const statements = splitSqlIntoStatements(sql);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await sequelize.query(statement, {
              transaction: null,
              logging: msg => logger.debug(msg),
            });
          } catch (stmtError) {
            logger.error(`Erreur dans le fichier ${file} :\n${statement}\n`, stmtError);
            throw stmtError;
          }
        }
      }

      logger.info(`✅ Migration exécutée avec succès : ${file}`);
    }
  } catch (error) {
    logger.error('Erreur lors des migrations :', error);
    throw error;
  }
};

// ─── Démarrage du serveur 