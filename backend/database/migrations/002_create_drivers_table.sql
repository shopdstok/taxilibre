-- Migration: Create drivers table
-- Fixed: production-ready

CREATE TABLE IF NOT EXISTS drivers (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number        VARCHAR(50)   UNIQUE NOT NULL,
    license_expiry        DATE          NOT NULL,
    license_country       VARCHAR(3)    DEFAULT 'FR',
    background_check_status VARCHAR(20) DEFAULT 'pending'
                          CHECK (background_check_status IN
                            ('pending','approved','rejected','expired')),
    background_check_date DATE,
    rating                DECIMAL(3,2)  DEFAULT 0.00
                          CHECK (rating >= 0 AND rating <= 5),
    total_rides           INTEGER       DEFAULT 0,
    total_earnings        DECIMAL(12,2) DEFAULT 0.00,
    is_available          BOOLEAN       DEFAULT false,
    is_online             BOOLEAN       DEFAULT false,
    current_latitude      DECIMAL(10,8),
    current_longitude     DECIMAL(11,8),
    last_location_update  TIMESTAMP,
    preferred_zones       JSONB,
    working_hours         JSONB,
    documents             JSONB,
    bank_account_info     JSONB,
    notes                 TEXT,
    created_at            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drivers_user_id              ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_license_number       ON drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_drivers_is_available         ON drivers(is_available);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online            ON drivers(is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_background_check     ON drivers(background_check_status);
CREATE INDEX IF NOT EXISTS idx_drivers_current_location     ON drivers(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_drivers_created_at           ON drivers(created_at);

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();