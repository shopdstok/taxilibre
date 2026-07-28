-- backend/database/migrations/002_optimize_indexes.sql

-- Index pour les requêtes fréquentes sur les courses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_status_created_at 
ON rides(status DESC, created_at DESC);

-- Index pour la recherche par statut et passager
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_passenger_status 
ON rides(passenger_id, status, created_at DESC);

-- Index pour la recherche par chauffeur et statut
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_driver_status 
ON rides(driver_id, status, created_at DESC);

-- Index pour la recherche par plage de dates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_date_range 
ON rides(created_at DESC, updated_at DESC);

-- Index pour les courses actives (optimisé pour le dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_active 
ON rides(status, created_at DESC) 
WHERE status IN ('pending', 'accepted', 'in_progress');

-- Index pour les courses terminées (analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_completed 
ON rides(status, created_at DESC) 
WHERE status = 'completed';

-- Index géospatial pour la recherche de proximité (PostGIS)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_pickup_location 
-- ON rides USING GIST(pickup_location);

-- Index pour les chauffeurs disponibles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_available 
ON drivers(is_available, last_location, updated_at DESC);

-- Index pour la recherche de chauffeurs par localisation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_location 
ON drivers(last_location, is_available, rating DESC);

-- Index pour les utilisateurs par email (login rapide)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email) 
WHERE email IS NOT NULL;

-- Index pour les utilisateurs par rôle
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role, created_at DESC);

-- Index pour les notifications non lues
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, read, created_at DESC) 
WHERE read = false;

-- Index pour les messages par conversation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation 
ON messages(conversation_id, created_at DESC);

-- Index pour les paiements par statut et date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_date 
ON payments(status, created_at DESC);

-- Index pour les paiements par utilisateur
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user 
ON payments(user_id, created_at DESC);

-- Index pour les évaluations par chauffeur
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_driver 
ON ratings(driver_id, created_at DESC);

-- Index pour les évaluations par course
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_ride 
ON ratings(ride_id, rating DESC);

-- Index composite pour les statistiques chauffeur
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_driver_stats 
ON rides(driver_id, status, created_at DESC, price DESC);

-- Index pour les revenus quotidiens (analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_daily_revenue 
ON rides(DATE(created_at), status, driver_id) 
WHERE status = 'completed';

-- Index pour les zones de forte demande
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_zone 
ON ride_requests(pickup_zone, created_at DESC);

-- Index pour les heures de pointe
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peak_hours 
ON rides(EXTRACT(HOUR FROM created_at), status) 
WHERE status = 'completed';

-- Partitionnement par mois pour les grandes tables (optionnel)
-- CREATE TABLE rides_partitioned (
--   LIKE rides INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- Statistiques pour optimiser les requêtes complexes
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_driver_monthly_stats AS
SELECT 
    driver_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_rides,
    SUM(price) as total_revenue,
    AVG(rating) as avg_rating,
    COUNT(DISTINCT passenger_id) as unique_passengers
FROM rides 
WHERE status = 'completed' 
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY driver_id, DATE_TRUNC('month', created_at);

-- Créer des indexes sur la vue matérialisée
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_driver_monthly_stats 
ON mv_driver_monthly_stats(driver_id, month);

-- Nettoyage des anciennes données (optionnel)
-- CREATE OR REPLACE FUNCTION cleanup_old_rides()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM rides 
--     WHERE status = 'completed' 
--     AND created_at < CURRENT_DATE - INTERVAL '2 years';
-- END;
-- $$;

-- Planifier le nettoyage (à exécuter périodiquement)
-- SELECT cron.schedule('cleanup-old-rides', '0 2 * * 0', 'cleanup_old_rides()');

-- Commentaires sur l'optimisation
COMMENT ON TABLE rides IS 'Table principale des courses avec indexes optimisés';
COMMENT ON INDEX idx_rides_status_created_at IS 'Index pour les requêtes de statut et date';
COMMENT ON INDEX idx_rides_active IS 'Index optimisé pour le dashboard des courses actives';
COMMENT ON INDEX idx_drivers_available IS 'Index pour trouver rapidement les chauffeurs disponibles';
COMMENT ON MATERIALIZED VIEW mv_driver_monthly_stats IS 'Vue matérialisée pour les statistiques mensuelles des chauffeurs';
