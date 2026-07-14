-- Seed: Create sample drivers
-- Created: 2024-03-12

-- Insert driver profiles
INSERT INTO drivers (
    id, 
    user_id, 
    license_number, 
    license_expiry, 
    date_of_birth, 
    address, 
    status, 
    verification_status, 
    background_check_passed,
    rating,
    total_rides,
    total_earnings,
    current_latitude,
    current_longitude
) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440004',
    'DL123456789',
    '2025-12-31',
    '1985-05-15',
    '123 Main St, City, State 12345',
    'online',
    'approved',
    true,
    4.8,
    156,
    3250.50,
    40.7128,
    -74.0060
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440005',
    'DL987654321',
    '2026-06-30',
    '1990-08-22',
    '456 Oak Ave, Town, State 67890',
    'online',
    'approved',
    true,
    4.9,
    203,
    4180.75,
    40.7589,
    -73.9851
);
