-- Migration: Fix drivers table to match Sequelize model
-- Production-ready, idempotent

-- status ENUM
DO $$ BEGIN
    CREATE TYPE driver_status AS ENUM (
        'offline','online','busy','inactive','suspended'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- verification_status ENUM
DO $$ BEGIN
    CREATE TYPE driver_verification_status AS ENUM (
        'pending','approved','rejected','document_required'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Colonnes manquantes dans drivers
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='status') THEN
        ALTER TABLE drivers ADD COLUMN status VARCHAR(20) DEFAULT 'offline';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='verification_status') THEN
        ALTER TABLE drivers ADD COLUMN verification_status VARCHAR(30) DEFAULT 'pending';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='is_background_check_passed') THEN
        ALTER TABLE drivers ADD COLUMN is_background_check_passed BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='rejection_reason') THEN
        ALTER TABLE drivers ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='approved_at') THEN
        ALTER TABLE drivers ADD COLUMN approved_at TIMESTAMP;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='last_status_update') THEN
        ALTER TABLE drivers ADD COLUMN last_status_update TIMESTAMP;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='max_concurrent_rides') THEN
        ALTER TABLE drivers ADD COLUMN max_concurrent_rides INTEGER DEFAULT 1;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='license_number') THEN
        ALTER TABLE drivers ADD COLUMN license_number VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='license_expiry') THEN
        ALTER TABLE drivers ADD COLUMN license_expiry DATE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='insurance_number') THEN
        ALTER TABLE drivers ADD COLUMN insurance_number VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='insurance_expiry') THEN
        ALTER TABLE drivers ADD COLUMN insurance_expiry DATE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='bank_account_number') THEN
        ALTER TABLE drivers ADD COLUMN bank_account_number VARCHAR(100);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='bank_routing_number') THEN
        ALTER TABLE drivers ADD COLUMN bank_routing_number VARCHAR(100);
    END IF;
END $$;

-- Index manquants
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='drivers' AND indexname='idx_drivers_status') THEN
        CREATE INDEX idx_drivers_status ON drivers(status);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='drivers' AND indexname='idx_drivers_verification_status') THEN
        CREATE INDEX idx_drivers_verification_status ON drivers(verification_status);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='drivers' AND indexname='idx_drivers_rating') THEN
        CREATE INDEX idx_drivers_rating ON drivers(rating);
    END IF;
END $$;