-- Run with psql -f bootstrap_postgres.sql (requires superuser privileges)
-- Creates the development role and database used by the Django backend.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'npa_ecm_local') THEN
        CREATE ROLE npa_ecm_local LOGIN PASSWORD 'changeme';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'npa_ecm_local') THEN
        CREATE DATABASE npa_ecm_local OWNER npa_ecm_local;
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE npa_ecm_local TO npa_ecm_local;
