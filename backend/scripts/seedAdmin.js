'use strict';

/**
 * Seed Script: Admin Unique TaxiLibre
 * Production-ready - Ne bloque jamais le démarrage du serveur
 */

const path = require('path');
const bcrypt = require('bcryptjs');

// ⚠️ MODIFIABLE UNIQUEMENT PAR LE PROPRIÉTAIRE
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'fh.lebazar@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Frabi3123#@';
const ADMIN_FIRSTNAME = 'Admin';
const ADMIN_LASTNAME  = 'TaxiLibre';

async function seedAdmin() {
  let sequelize;

  try {
    // Import dynamique pour éviter les erreurs circulaires
    ({ sequelize } = require('../src/config/database'));

    // Vérifier la connexion
    await sequelize.authenticate();
    console.log('[SEED] Database connected');

    // ─── Vérifier si admin existe déjà ───────────────────────────────────────
    const [existing] = await sequelize.query(
      `SELECT id, role, is_active FROM users WHERE email = :email LIMIT 1`,
      {
        replacements: { email: ADMIN_EMAIL },
        type: 'SELECT',
      }
    );

    if (existing) {
      // Mettre à jour le rôle et l'état si nécessaire
      if (existing.role !== 'admin' || !existing.is_active) {
        await sequelize.query(
          `UPDATE users
           SET role = 'admin', is_active = true, updated_at = NOW()
           WHERE email = :email`,
          { replacements: { email: ADMIN_EMAIL } }
        );
        console.log(`[SEED] ✅ Admin mis à jour : ${ADMIN_EMAIL}`);
      } else {
        console.log(`[SEED] ✅ Admin déjà existant et actif : ${ADMIN_EMAIL}`);
      }
      return;
    }

    // ─── Créer l'admin ────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await sequelize.query(
      `INSERT INTO users (
          email,
          password_hash,
          first_name,
          last_name,
          role,
          is_active,
          is_verified,
          email_verified_at,
          created_at,
          updated_at
       ) VALUES (
          :email,
          :passwordHash,
          :firstName,
          :lastName,
          'admin',
          true,
          true,
          NOW(),
          NOW(),
          NOW()
       )
       ON CONFLICT (email) DO UPDATE
         SET role       = 'admin',
             is_active  = true,
             updated_at = NOW()`,
      {
        replacements: {
          email:        ADMIN_EMAIL,
          passwordHash: passwordHash,
          firstName:    ADMIN_FIRSTNAME,
          lastName:     ADMIN_LASTNAME,
        },
      }
    );

    console.log(`[SEED] ✅ Admin créé avec succès : ${ADMIN_EMAIL}`);
    console.log('[SEED]    Role: admin | Status: actif | Email vérifié');

  } catch (err) {
    // Ne jamais bloquer le démarrage
    console.warn(`[SEED] ⚠️  Ignoré : ${err.message}`);
  }
}

module.exports = seedAdmin;

// Exécution directe : node scripts/seedAdmin.js
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log('[SEED] Terminé');
      process.exit(0);
    })
    .catch(err => {
      console.error('[SEED] Échec :', err.message);
      process.exit(1);
    });
}