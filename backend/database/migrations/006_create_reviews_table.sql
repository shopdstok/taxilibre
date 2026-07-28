-- Migration: Create reviews table
-- Fixed: production-ready

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending','approved','rejected','hidden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reviews (
    id                  UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id             UUID      NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    passenger_id        UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id           UUID      NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    rating              INTEGER   NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment             TEXT,
    helpful_count       INTEGER   DEFAULT 0,
    report_count        INTEGER   DEFAULT 0,
    status              review_status DEFAULT 'pending',
    moderated_by        UUID      REFERENCES users(id) ON DELETE SET NULL,
    moderation_reason   TEXT,
    is_anonymous        BOOLEAN   DEFAULT false,
    driver_response     TEXT,
    driver_response_at  TIMESTAMP,
    tags                JSONB,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_ride_id      ON reviews(ride_id);
CREATE INDEX        IF NOT EXISTS idx_reviews_passenger_id ON reviews(passenger_id);
CREATE INDEX        IF NOT EXISTS idx_reviews_driver_id    ON reviews(driver_id);
CREATE INDEX        IF NOT EXISTS idx_reviews_rating       ON reviews(rating);
CREATE INDEX        IF NOT EXISTS idx_reviews_status       ON reviews(status);
CREATE INDEX        IF NOT EXISTS idx_reviews_created_at   ON reviews(created_at);

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();