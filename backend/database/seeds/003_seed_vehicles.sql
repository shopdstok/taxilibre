-- Seed: Create sample vehicles
-- Created: 2024-03-12

INSERT INTO vehicles (
    id,
    driver_id,
    make,
    model,
    year,
    color,
    license_plate,
    vehicle_type,
    capacity,
    registration_number,
    registration_expiry,
    insurance_number,
    insurance_expiry,
    is_active
) VALUES
(
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    'Toyota',
    'Camry',
    2020,
    'Silver',
    'ABC-1234',
    'sedan',
    4,
    'REG123456789',
    '2025-06-30',
    'INS987654321',
    '2025-06-30',
    true
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    'Honda',
    'CR-V',
    2021,
    'Blue',
    'XYZ-5678',
    'suv',
    5,
    'REG567890123',
    '2025-12-31',
    'INS456789012',
    '2025-12-31',
    true
);
