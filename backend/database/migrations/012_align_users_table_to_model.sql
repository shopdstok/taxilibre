-- Migration 012 : Aligner public.users avec le modèle Sequelize User
-- La table public.users avait été créée à l'image de auth.users (Supabase)
-- (colonnes: password, name, avatar) au lieu du schéma attendu par le modèle
-- (password_hash, first_name, last_name, is_verified, avatar_url).
-- Conséquence : User.findOne() => SequelizeDatabaseError "column password_hash does not exist"
-- => login 500. Cette migration est idempotente (ADD COLUMN IF NOT EXISTS) et
-- backfill les données existantes. Aucune donnée n'est perdue.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name  VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name   VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- Backfill password_hash depuis l'ancienne colonne password (hash bcrypt préservé)
UPDATE users
SET password_hash = password
WHERE password_hash IS NULL
  AND password IS NOT NULL;

-- Backfill first_name / last_name depuis l'ancienne colonne name
UPDATE users
SET first_name = split_part(name, ' ', 1)
WHERE first_name = ''
  AND name IS NOT NULL
  AND name <> '';

UPDATE users
SET last_name = CASE
  WHEN position(' ' in name) > 0
       THEN substring(name FROM position(' ' in name) + 1)
  ELSE first_name
END
WHERE last_name = ''
  AND name IS NOT NULL
  AND name <> '';

-- Backfill avatar_url depuis l'ancienne colonne avatar
UPDATE users
SET avatar_url = avatar
WHERE avatar_url IS NULL
  AND avatar IS NOT NULL;

-- Marquer les utilisateurs existants comme vérifiés (données de prod/seed)
UPDATE users
SET is_verified = true
WHERE is_verified = false;

-- Index attendu par le modèle
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
