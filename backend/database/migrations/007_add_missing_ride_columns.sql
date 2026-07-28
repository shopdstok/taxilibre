-- Migration: Add missing columns to rides (idempotent)
-- Fixed: production-ready

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'pickup_latitude'
    ) THEN
        ALTER TABLE rides ADD COLUMN pickup_latitude DECIMAL(10,8) NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'pickup_longitude'
    ) THEN
        ALTER TABLE rides ADD COLUMN pickup_longitude DECIMAL(11,8) NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'dropoff_latitude'
    ) THEN
        ALTER TABLE rides ADD COLUMN dropoff_latitude DECIMAL(10,8) NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'dropoff_longitude'
    ) THEN
        ALTER TABLE rides ADD COLUMN dropoff_longitude DECIMAL(11,8) NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'rides' AND indexname = 'idx_rides_pickup_location'
    ) THEN
        CREATE INDEX idx_rides_pickup_location
            ON rides(pickup_latitude, pickup_longitude);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'rides' AND indexname = 'idx_rides_dropoff_location'
    ) THEN
        CREATE INDEX idx_rides_dropoff_location
            ON rides(dropoff_latitude, dropoff_longitude);
    END IF;
END $$;