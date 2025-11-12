-- Run with psql -f bootstrap_postgres.sql (requires superuser privileges)
-- Creates the development role and database used by the Django backend.
-- 
-- NOTE: This script matches env/stag.env configuration:
--   DB_NAME=npa_ecm_stag
--   DB_USER=ecmadmin
--   DB_PASSWORD=ecmadmin

-- Create role (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecmadmin') THEN
        CREATE ROLE ecmadmin LOGIN PASSWORD 'ecmadmin';
    END IF;
END
$$;

-- Create database (must be done outside DO block)
-- Note: CREATE DATABASE cannot be executed inside a function/DO block
-- So we drop and recreate if needed, or create if it doesn't exist
DROP DATABASE IF EXISTS npa_ecm_stag;
CREATE DATABASE npa_ecm_stag OWNER ecmadmin;

GRANT ALL PRIVILEGES ON DATABASE npa_ecm_stag TO ecmadmin;
