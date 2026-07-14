-- TaxiLibre Database Seed Data
-- Sample data for testing and development

-- Insert sample users
INSERT INTO users (id, email, password, name, phone, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@taxilibre.com', '$2b$12$LQv3c1yqBWVHxkd0LHAxO6g8hrqZe9VAYKQvM6mFQaM6mFQaM6mFQaM', 'Admin User', '+33612345678', 'admin', true),
('550e8400-e29b-41d4-a716-446655440001', 'driver1@taxilibre.com', '$2b$12$LQv3c1yqBWVHxkd0LHAxO6g8hrqZe9VAYKQvM6mFQaM6mFQaM', 'Driver One', '+33612345679', 'driver', true),
('550e8400-e29b-41d4-a716-446655440002', 'driver2@taxilibre.com', '$2b$12$LQv3c1yqBWVHxkd0LHAxO6g8hrqZe9VAYKQvM6mFQaM6mFQaM', 'Driver Two', '+33612345680', 'driver', true),
('550e8400-e29b-41d4-a716-446655440003', 'passenger1@taxilibre.com', '$2b$12$LQv3c1yqBWVHxkd0LHAxO6g8hrqZe9VAYKQvM6mFQaM6mFQaM', 'Passenger One', '+33612345681', 'passenger', true),
('550e8400-e29b-41d4-a716-446655440004', 'passenger2@taxilibre.com', '$2b$12$LQv3c1yqBWVHxkd0LHAxO6g8hrqZe9VAYKQvM6mFQaM6mFQaM', 'Passenger Two', '+33612345682', 'passenger', true);

-- Insert sample drivers
INSERT INTO drivers (id, user_id, status, verification_status, rating, total_rides, total_earnings, license_number, insurance_number) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'online', 'approved', 4.5, 150, 2500.50, 'DL123456789', 'INS987654321'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'offline', 'approved', 4.2, 89, 1450.75, 'DL987654321', 'INS123456789');

-- Insert sample vehicles
INSERT INTO vehicles (id, driver_id, type, brand, model, year, color, plate_number, capacity, base_fare, price_per_km, price_per_minute) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'sedan', 'Toyota', 'Camry', 2020, 'Black', 'ABC123', 4.0, 2.50, 1.50, 0.25),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'suv', 'Honda', 'CR-V', 2021, 'White', 'XYZ789', 6.0, 3.00, 1.80, 0.30);

-- Insert sample rides
INSERT INTO rides (id, passenger_id, driver_id, vehicle_id, status, pickup_latitude, pickup_longitude, pickup_address, dropoff_latitude, dropoff_longitude, dropoff_address, estimated_distance, estimated_duration, base_fare, price_per_km, price_per_minute, total_price, payment_method, requested_at, accepted_at, ride_start_time, ride_end_time, final_price) VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'ride_completed', 48.8566, 2.3522, 'Eiffel Tower, Paris', 48.8584, 2.2945, 'Louvre Museum, Paris', 3.2, 15.0, 2.50, 1.50, 0.25, 25.50, 'card', '2024-01-15 10:00:00', '2024-01-15 10:05:00', '2024-01-15 10:15:00', '2024-01-15 10:30:00', 25.50),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'ride_completed', 48.8600, 2.3500, 'Arc de Triomphe, Paris', 48.8530, 2.3499, 'Notre-Dame Cathedral, Paris', 2.8, 12.0, 3.00, 1.80, 0.30, 22.00, 'card', '2024-01-16 14:30:00', '2024-01-16 14:35:00', '2024-01-16 14:45:00', '2024-01-16 15:00:00', 22.00);

-- Insert sample payments
INSERT INTO payments (id, ride_id, amount, payment_method, status, platform_fee, driver_earnings, processed_at, currency) VALUES
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 25.50, 'card', 'completed', 3.83, 21.67, '2024-01-15 10:35:00', 'EUR'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002', 22.00, 'card', 'completed', 3.30, 18.70, '2024-01-16 15:05:00', 'EUR');

-- Insert sample reviews
INSERT INTO reviews (id, ride_id, passenger_id, driver_id, rating, comment, is_public, is_active) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 4.5, 'Great ride! Driver was very professional and friendly.', true, true),
('aa0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 4.0, 'Good experience, smooth ride and clean car.', true, true);
