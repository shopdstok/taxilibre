-- TaxiLibre Database Schema
-- PostgreSQL Schema for Ride-Hailing Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'driver', 'passenger');
CREATE TYPE driver_status AS ENUM ('offline', 'online', 'busy', 'inactive', 'suspended');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'document_required');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'van', 'luxury', 'motorcycle', 'electric');
CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'driver_arriving', 'driver_arrived', 'ride_started', 'ride_completed', 'cancelled', 'no_driver_available', 'expired');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'wallet', 'apple_pay', 'google_pay');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'passenger',
    is_active BOOLEAN DEFAULT true NOT NULL,
    avatar VARCHAR(500),
    last_login_at TIMESTAMP,
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    push_notifications_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT true,
    sms_notifications_enabled BOOLEAN DEFAULT true,
    ride_update_notifications BOOLEAN DEFAULT true,
    promotion_notifications BOOLEAN DEFAULT true,
    emergency_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status driver_status DEFAULT 'offline' NOT NULL,
    verification_status verification_status DEFAULT 'pending' NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.00 NOT NULL CHECK (rating >= 0 AND rating <= 5),
    total_rides INTEGER DEFAULT 0 NOT NULL,
    total_earnings DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    license_number VARCHAR(50),
    license_expiry DATE,
    insurance_number VARCHAR(100),
    insurance_expiry DATE,
    bank_account_number VARCHAR(50),
    bank_routing_number VARCHAR(50),
    is_background_check_passed BOOLEAN DEFAULT false NOT NULL,
    rejection_reason TEXT,
    verification_documents JSONB DEFAULT '[]',
    approved_at TIMESTAMP,
    last_location_update TIMESTAMP,
    last_status_update TIMESTAMP,
    max_concurrent_rides INTEGER DEFAULT 1 NOT NULL CHECK (max_concurrent_rides >= 1 AND max_concurrent_rides <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    type vehicle_type NOT NULL DEFAULT 'sedan',
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    color VARCHAR(30) NOT NULL,
    plate_number VARCHAR(15) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    capacity DECIMAL(4,1) DEFAULT 4.0 NOT NULL CHECK (capacity >= 1 AND capacity <= 8),
    vin VARCHAR(17),
    registration_expiry DATE,
    insurance_policy VARCHAR(100),
    insurance_expiry DATE,
    photo_url VARCHAR(500),
    base_fare DECIMAL(8,2) DEFAULT 2.50 NOT NULL CHECK (base_fare >= 0),
    price_per_km DECIMAL(8,2) DEFAULT 1.50 NOT NULL CHECK (price_per_km >= 0),
    price_per_minute DECIMAL(8,2) DEFAULT 0.25 NOT NULL CHECK (price_per_minute >= 0),
    is_verified BOOLEAN DEFAULT true NOT NULL,
    verification_documents JSONB DEFAULT '[]',
    last_inspection_date DATE,
    next_inspection_date DATE,
    features JSONB DEFAULT '[]',
    mileage INTEGER CHECK (mileage >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rides table
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    status ride_status DEFAULT 'requested' NOT NULL,
    pickup_latitude DECIMAL(10,8) NOT NULL CHECK (pickup_latitude >= -90 AND pickup_latitude <= 90),
    pickup_longitude DECIMAL(11,8) NOT NULL CHECK (pickup_longitude >= -180 AND pickup_longitude <= 180),
    pickup_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10,8) NOT NULL CHECK (dropoff_latitude >= -90 AND dropoff_latitude <= 90),
    dropoff_longitude DECIMAL(11,8) NOT NULL CHECK (dropoff_longitude >= -180 AND dropoff_longitude <= 180),
    dropoff_address TEXT NOT NULL,
    estimated_distance DECIMAL(8,2) NOT NULL CHECK (estimated_distance >= 0),
    actual_distance DECIMAL(8,2) CHECK (actual_distance >= 0),
    estimated_duration DECIMAL(6,2) NOT NULL CHECK (estimated_duration >= 0),
    actual_duration DECIMAL(6,2) CHECK (actual_duration >= 0),
    base_fare DECIMAL(10,2) NOT NULL CHECK (base_fare >= 0),
    price_per_km DECIMAL(8,2) NOT NULL CHECK (price_per_km >= 0),
    price_per_minute DECIMAL(8,2) NOT NULL CHECK (price_per_minute >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    final_price DECIMAL(10,2) CHECK (final_price >= 0),
    payment_method payment_method DEFAULT 'card' NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    driver_arrival_latitude DECIMAL(10,8),
    driver_arrival_longitude DECIMAL(11,8),
    driver_arrival_time TIMESTAMP,
    ride_start_time TIMESTAMP,
    ride_end_time TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20),
    cancellation_time TIMESTAMP,
    notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    driver_rating DECIMAL(3,2) CHECK (driver_rating >= 1 AND driver_rating <= 5),
    passenger_rating DECIMAL(3,2) CHECK (passenger_rating >= 1 AND passenger_rating <= 5),
    route JSONB DEFAULT '[]',
    surge_multiplier DECIMAL(4,2) DEFAULT 1.0 NOT NULL CHECK (surge_multiplier >= 1.0 AND surge_multiplier <= 5.0),
    promo_code VARCHAR(50),
    discount_amount DECIMAL(8,2) DEFAULT 0.00 NOT NULL CHECK (discount_amount >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID UNIQUE NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0.01),
    payment_method payment_method NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    transaction_id VARCHAR(255),
    platform_fee DECIMAL(8,2) DEFAULT 0.00 NOT NULL CHECK (platform_fee >= 0),
    driver_earnings DECIMAL(8,2) DEFAULT 0.00 NOT NULL CHECK (driver_earnings >= 0),
    failure_reason TEXT,
    refund_reason TEXT,
    refund_amount DECIMAL(8,2) CHECK (refund_amount >= 0),
    processed_at TIMESTAMP,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    original_amount DECIMAL(10,2),
    payment_provider VARCHAR(50) DEFAULT 'stripe' NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID UNIQUE NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    rating DECIMAL(3,2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    response_from_driver TEXT,
    response_from_passenger TEXT,
    moderated_at TIMESTAMP,
    moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    flags JSONB DEFAULT '[]',
    helpful_count INTEGER DEFAULT 0 NOT NULL,
    report_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_verification_status ON drivers(verification_status);
CREATE INDEX idx_drivers_rating ON drivers(rating);
CREATE INDEX idx_drivers_location ON drivers(current_latitude, current_longitude);

CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);

CREATE INDEX idx_rides_passenger_id ON rides(passenger_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_vehicle_id ON rides(vehicle_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_payment_status ON rides(payment_status);
CREATE INDEX idx_rides_requested_at ON rides(requested_at);
CREATE INDEX idx_rides_pickup_location ON rides(pickup_latitude, pickup_longitude);
CREATE INDEX idx_rides_dropoff_location ON rides(dropoff_latitude, dropoff_longitude);

CREATE INDEX idx_payments_ride_id ON payments(ride_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_processed_at ON payments(processed_at);

CREATE INDEX idx_reviews_ride_id ON reviews(ride_id);
CREATE INDEX idx_reviews_passenger_id ON reviews(passenger_id);
CREATE INDEX idx_reviews_driver_id ON reviews(driver_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_is_public ON reviews(is_public);
CREATE INDEX idx_reviews_is_active ON reviews(is_active);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE VIEW driver_profiles AS
SELECT 
    d.id,
    d.user_id,
    u.email,
    u.name,
    u.phone,
    d.status as driver_status,
    d.verification_status,
    d.rating,
    d.total_rides,
    d.total_earnings,
    d.current_latitude,
    d.current_longitude,
    d.license_number,
    d.license_expiry,
    d.insurance_number,
    d.insurance_expiry,
    v.type as vehicle_type,
    v.brand as vehicle_brand,
    v.model as vehicle_model,
    v.year as vehicle_year,
    v.color as vehicle_color,
    v.plate_number as vehicle_plate,
    v.capacity as vehicle_capacity,
    d.created_at
FROM drivers d
JOIN users u ON d.user_id = u.id
LEFT JOIN vehicles v ON d.id = v.driver_id AND v.status = 'active'
WHERE u.is_active = true;

CREATE VIEW passenger_ride_history AS
SELECT 
    r.id as ride_id,
    r.status,
    r.pickup_address,
    r.dropoff_address,
    r.estimated_distance,
    r.actual_distance,
    r.estimated_duration,
    r.actual_duration,
    r.total_price,
    r.final_price,
    r.payment_method,
    r.payment_status,
    r.requested_at,
    r.accepted_at,
    r.ride_start_time,
    r.ride_end_time,
    d.rating as driver_rating,
    u.name as driver_name,
    v.brand as vehicle_brand,
    v.model as vehicle_model,
    v.plate_number as vehicle_plate
FROM rides r
LEFT JOIN drivers d ON r.driver_id = d.id
LEFT JOIN users u ON d.user_id = u.id
LEFT JOIN vehicles v ON r.vehicle_id = v.id
WHERE r.passenger_id = u.id
ORDER BY r.requested_at DESC;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION calculate_ride_earnings(ride_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    final_price DECIMAL(10,2);
    platform_fee DECIMAL(8,2);
BEGIN
    SELECT r.final_price INTO final_price
    FROM rides r
    WHERE r.id = ride_uuid;
    
    IF final_price IS NULL THEN
        SELECT r.total_price INTO final_price
        FROM rides r
        WHERE r.id = ride_uuid;
    END IF;
    
    platform_fee := final_price * 0.15;
    RETURN final_price - platform_fee;
END;
$$ LANGUAGE plpgsql;
