-- Add geography column for location and populate from latitude/longitude
ALTER TABLE rides ADD COLUMN IF NOT EXISTS location geography(Point,4326);

-- Update existing rows with coordinates from latitude and longitude
UPDATE rides
SET location = ST_MakePoint(longitude, latitude)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Create index on the geography column for spatial queries
CREATE INDEX IF NOT EXISTS idx_rides_location ON rides USING GIST (location);

-- Optional: Add a trigger to keep location in sync with latitude/longitude
CREATE OR REPLACE FUNCTION update_ride_location()
RETURNS TRIGGER AS $$
BEGIN
   NEW.location := ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ride_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON rides
FOR EACH ROW EXECUTE FUNCTION update_ride_location();