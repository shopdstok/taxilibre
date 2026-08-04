-- Enable PostGIS extension (includes raster and topology)
CREATE EXTENSION IF NOT EXISTS postgis;
-- Optionally, enable advanced 3D and other postgis extensions
-- CREATE EXTENSION IF NOT EXISTS postgis_topology;
--CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
--CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
-- Comment: The above extensions are optional and can be enabled as needed.