-- Add Row Level Security policies for payments, ride_locations, user_sessions
-- Assuming a custom GUC `app.user_id` is set to the authenticated user's UUID
-- and a custom GUC `app.user_role` is set to the user's role (admin, driver, passenger)

-- Helper function to get current user ID from app settings
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get current user role from app settings
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_role', true), '');
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Payments table policies
-- Users can view their own payments (through ride)
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = payments.ride_id
            AND (
                rides.passenger_id = get_current_user_id()
                OR rides.driver_id IN (
                    SELECT id FROM drivers WHERE user_id = get_current_user_id()
                )
            )
        )
    );

-- Users can insert payments for their own rides
CREATE POLICY "Users can insert own payments" ON payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = NEW.ride_id
            AND rides.passenger_id = get_current_user_id()
        )
    );

-- Admins and system (Stripe webhook) can update payments
-- We'll treat any authenticated user with role 'admin' or a special service role 'stripe' as allowed
CREATE POLICY "Admins and stripe can update payments" ON payments
    FOR UPDATE
    USING (
        get_current_user_role() = 'admin'
        OR get_current_user_role() = 'stripe'
    );

-- Ride locations table policies
-- Users can view locations for rides they are involved in
CREATE POLICY "Users can view own ride locations" ON ride_locations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_locations.ride_id
            AND (
                rides.passenger_id = get_current_user_id()
                OR rides.driver_id IN (
                    SELECT id FROM drivers WHERE user_id = get_current_user_id()
                )
            )
        )
    );

-- Drivers can insert locations for their active rides
CREATE POLICY "Drivers can insert own ride locations" ON ride_locations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = NEW.ride_id
            AND rides.driver_id IN (
                SELECT id FROM drivers WHERE user_id = get_current_user_id()
            )
            AND rides.status IN ('accepted', 'driver_arriving', 'driver_arrived', 'ride_started')
        )
    );

-- User sessions table policies
-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE
    USING (user_id = get_current_user_id());

-- Admins can view all sessions (optional)
CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT
    USING (get_current_user_role() = 'admin');