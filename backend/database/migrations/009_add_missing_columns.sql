-- Migration: Add all missing columns (idempotent)
-- Fixed: production-ready

-- ─── TABLE drivers : colonnes manquantes ─────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'is_online'
    ) THEN
        ALTER TABLE drivers ADD COLUMN is_online BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'background_check_status'
    ) THEN
        ALTER TABLE drivers ADD COLUMN background_check_status VARCHAR(20)
            DEFAULT 'pending'
            CHECK (background_check_status IN
                ('pending','approved','rejected','expired'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'is_available'
    ) THEN
        ALTER TABLE drivers ADD COLUMN is_available BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'current_latitude'
    ) THEN
        ALTER TABLE drivers ADD COLUMN current_latitude DECIMAL(10,8);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'current_longitude'
    ) THEN
        ALTER TABLE drivers ADD COLUMN current_longitude DECIMAL(11,8);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'rating'
    ) THEN
        ALTER TABLE drivers ADD COLUMN rating DECIMAL(3,2)
            DEFAULT 0.00
            CHECK (rating >= 0 AND rating <= 5);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'total_rides'
    ) THEN
        ALTER TABLE drivers ADD COLUMN total_rides INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'total_earnings'
    ) THEN
        ALTER TABLE drivers ADD COLUMN total_earnings DECIMAL(12,2) DEFAULT 0.00;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drivers' AND column_name = 'last_location_update'
    ) THEN
        ALTER TABLE drivers ADD COLUMN last_location_update TIMESTAMP;
    END IF;
END $$;

-- ─── TABLE vehicles : colonnes manquantes ────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'license_plate'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN license_plate VARCHAR(20);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'registration_number'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN registration_number VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'vehicle_type'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN vehicle_type VARCHAR(20)
            DEFAULT 'sedan'
            CHECK (vehicle_type IN
                ('sedan','suv','van','luxury','motorcycle','electric'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'insurance_number'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN insurance_number VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'insurance_expiry'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN insurance_expiry DATE;
    END IF;
END $$;

-- ─── TABLE payments : colonnes manquantes ────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'stripe_payment_intent_id'
    ) THEN
        ALTER TABLE payments ADD COLUMN stripe_payment_intent_id VARCHAR(255);
    END IF;
END $$;

-- ─── TABLE reviews : colonnes manquantes ─────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reviews' AND column_name = 'rating'
    ) THEN
        ALTER TABLE reviews ADD COLUMN rating INTEGER
            CHECK (rating >= 1 AND rating <= 5);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reviews' AND column_name = 'status'
    ) THEN
        ALTER TABLE reviews ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- ─── Index manquants ──────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'drivers' AND indexname = 'idx_drivers_is_online'
    ) THEN
        CREATE INDEX idx_drivers_is_online ON drivers(is_online);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'drivers' AND indexname = 'idx_drivers_is_available'
    ) THEN
        CREATE INDEX idx_drivers_is_available ON drivers(is_available);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_license_plate'
    ) THEN
        CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
    END IF;
END $$;