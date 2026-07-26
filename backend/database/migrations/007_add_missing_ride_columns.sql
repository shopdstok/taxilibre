-- Migration: Add missing latitude/longitude columns and indexes to rides table
-- Created: 2024-07-26

DO $$
BEGIN
  -- Add pickup_latitude if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rides' AND column_name = 'pickup_latitude') THEN
    ALTER TABLE rides ADD COLUMN pickup_latitude DECIMAL(10, 8) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column pickup_latitude';
  ELSE
    RAISE NOTICE 'Column pickup_latitude already exists';
  END IF;

  -- Add pickup_longitude if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rides' AND column_name = 'pickup_longitude') THEN
    ALTER TABLE rides ADD COLUMN pickup_longitude DECIMAL(11, 8) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column pickup_longitude';
  ELSE
    RAISE NOTICE 'Column pickup_longitude already exists';
  END IF;

  -- Add dropoff_latitude if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rides' AND column_name = 'dropoff_latitude') THEN
    ALTER TABLE rides ADD COLUMN dropoff_latitude DECIMAL(10, 8) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column dropoff_latitude';
  ELSE
    RAISE NOTICE 'Column dropoff_latitude already exists';
  END IF;

  -- Add dropoff_longitude if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rides' AND column_name = 'dropoff_longitude') THEN
    ALTER TABLE rides ADD COLUMN dropoff_longitude DECIMAL(11, 8) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column dropoff_longitude';
  ELSE
    RAISE NOTICE 'Column dropoff_longitude already exists';
  END IF;
END $$;

-- Add indexes if they don't exist
DO $$
BEGIN
  -- Index for pickup location
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'rides' AND indexname = 'idx_rides_pickup_location') THEN
    CREATE INDEX IF NOT EXISTS idx_rides_pickup_location ON rides(pickup_latitude, pickup_longitude);
    RAISE NOTICE 'Created index idx_rides_pickup_location';
  ELSE
    RAISE NOTICE 'Index idx_rides_pickup_location already exists';
  END IF;

  -- Index for dropoff location
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'rides' AND indexname = 'idx_rides_dropoff_location') THEN
    CREATE INDEX IF NOT EXISTS idx_rides_dropoff_location ON rides(dropoff_latitude, dropoff_longitude);
    RAISE NOTICE 'Created index idx_rides_dropoff_location';
  ELSE
    RAISE NOTICE 'Index idx_rides_dropoff_location already exists';
  END IF;
END $$;
