-- Migration: Optimize indexes
-- Fixed: production-ready (sans CONCURRENTLY)

-- Index rides actives
DROP INDEX IF EXISTS idx_rides_active;
CREATE INDEX IF NOT EXISTS idx_rides_active
    ON rides(status, created_at DESC)
    WHERE status IN ('requested', 'accepted', 'driver_arriving', 'in_progress');

-- Index conducteurs disponibles
DROP INDEX IF EXISTS idx_drivers_available;
CREATE INDEX IF NOT EXISTS idx_drivers_available
    ON drivers(is_available, is_online)
    WHERE is_available = true AND is_online = true;

-- Index paiements Stripe
DROP INDEX IF EXISTS idx_payments_stripe;
CREATE INDEX IF NOT EXISTS idx_payments_stripe
    ON payments(stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;

-- Index reviews approuvées
DROP INDEX IF EXISTS idx_reviews_approved;
CREATE INDEX IF NOT EXISTS idx_reviews_approved
    ON reviews(driver_id, rating)
    WHERE status = 'approved';