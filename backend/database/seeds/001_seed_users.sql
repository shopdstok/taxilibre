-- Seed: Create sample users
-- Created: 2024-03-12

-- Insert sample passengers
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'john.doe@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQu', 'John', 'Doe', '+1234567890', 'passenger', true),
('550e8400-e29b-41d4-a716-446655440002', 'jane.smith@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQu', 'Jane', 'Smith', '+1234567891', 'passenger', true),
('550e8400-e29b-41d4-a716-446655440003', 'admin@taxilibre.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQu', 'Admin', 'User', '+1234567892', 'admin', true);

-- Insert sample drivers (users first)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified) VALUES
('550e8400-e29b-41d4-a716-446655440004', 'mike.wilson@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQu', 'Mike', 'Wilson', '+1234567893', 'driver', true),
('550e8400-e29b-41d4-a716-446655440005', 'sarah.jones@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQu', 'Sarah', 'Jones', '+1234567894', 'driver', true);

-- Note: In a real application, passwords would be properly hashed using bcrypt
-- The above hashes are placeholders for demonstration
