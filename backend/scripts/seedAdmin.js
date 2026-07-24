/**
 * Seed Script: Admin Unique TaxiLibre
 *
 * Cree le compte admin fh.lebazar@gmail.com SI il n'\''existe pas.
 * Ce script est appele au demarrage du serveur.
 *
 * SECURITE:
 * - Mot de passe hache avec bcryptjs (12 rounds)
 * - Un seul admin autorise: fh.lebazar@gmail.com
 * - Le compte ne peut pas etre supprime ni desactive via l'\''API
 * - Seul le proprietaire peut modifier le mot de passe dans ce fichier
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: false });
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

// ⚠️ MODIFIABLE UNIQUEMENT PAR LE PROPRIETAIRE
const ADMIN_EMAIL = 'fh.lebazar@gmail.com';
const ADMIN_PASSWORD = 'Frabi3123#@';
const ADMIN_NAME = 'Admin TaxiLibre';
const ADMIN_ROLE = 'admin';

async function seedAdmin() {
  try {
    // Verifier la connexion a la base
    await sequelize.authenticate();
    console.log('[SEED] Database connected');

    // Synchroniser les modeles (cree les tables si necessaire)
    await sequelize.sync({ alter: true });
    console.log('[SEED] Models synchronized');

    // Verifier si l'\''admin existe deja
    const existingAdmin = await User.findOne({ where: { email: ADMIN_EMAIL } });

    if (existingAdmin) {
      // L'\''admin existe: verifier/mettre a jour le role et l'\''etat
      if (existingAdmin.role !== 'admin' || !existingAdmin.isActive) {
        await existingAdmin.update({ role: 'admin', isActive: true });
        console.log(`[SEED] Admin ${ADMIN_EMAIL} updated (role=admin, isActive=true)`);
      } else {
        console.log(`[SEED] Admin ${ADMIN_EMAIL} already exists and is active`);
      }
      return existingAdmin;
    }

    // Creer l'\''admin
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: ADMIN_ROLE,
      isActive: true,
      emailVerifiedAt: new Date(), // Admin pre-verifie
    });

    console.log(`[SEED] Admin cree avec succes: ${ADMIN_EMAIL}`);
    console.log('[SEED] Role: admin | Status: actif | Email verifie');
    return admin;
  } catch (error) {
    console.error('[SEED] Erreur lors de la creation de l admin:', error.message);
    // Ne pas bloquer le demarrage si le seed echoue
    // (la base n'\''est peut-etre pas encore disponible)
    return null;
  }
}

// Export pour utilisation dans server.js
module.exports = seedAdmin;

// Permet aussi l'\''execution directe: node scripts/seedAdmin.js
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log('[SEED] Termine');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SEED] Echec:', err);
      process.exit(1);
    });
}