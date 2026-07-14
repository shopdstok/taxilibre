-- Migration: Create rides table
-- Created: 2024-03-12

CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled', 'no_driver_available');

CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10, 8) NOT NULL,
    dropoff_longitude DECIMAL(11, 8) NOT NULL,
    distance_km DECIMAL(8, 2),
    duration_minutes INTEGER,
    estimated_price DECIMAL(10, 2) NOT NULL,
    actual_price DECIMAL(10, 2),
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.0 CHECK (surge_multiplier >= 1.0),
    preferred_vehicle_type VARCHAR(20) CHECK (preferred_vehicle_type IN ('sedan', 'suv', 'van', 'luxury', 'motorcycle', 'electric')),
    passenger_count INTEGER DEFAULT 1 CHECK (passenger_count > 0 AND passenger_count <= 8),
    special_requests TEXT,
    status ride_status DEFAULT 'requested',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    driver_arrived_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    pickup_photo_url TEXT,
    dropoff_photo_url TEXT,
    route_data JSONB,
    driver_notes TEXT,
    passenger_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rides_passenger_id ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_vehicle_id ON rides(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_location ON rides(pickup_latitude, pickup_longitude);
CREATE INDEX IF NOT EXISTS idx_rides_dropoff_location ON rides(dropoff_latitude, dropoff_longitude);
CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides(requested_at);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_rides_updated_at 
    BEFORE UPDATE ON rides 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
