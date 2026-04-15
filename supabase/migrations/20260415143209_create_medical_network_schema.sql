/*
  # Medical Insurance Network Finder - Core Schema

  ## Overview
  This migration sets up the full database schema for a bilingual (Arabic/English)
  medical insurance network finder application with geospatial capabilities.

  ## Extensions
  - PostGIS: for geographic location storage and proximity queries

  ## New Tables

  ### providers
  Stores all medical network providers with bilingual fields and geographic location.
  - `id` (uuid, primary key)
  - `name_en` / `name_ar` - Provider name in English and Arabic
  - `type_en` / `type_ar` - Provider type (Hospital, Pharmacy, etc.)
  - `speciality_en` / `speciality_ar` - Medical speciality
  - `address_en` / `address_ar` - Street address
  - `city_en` / `city_ar` - City/Area
  - `governorate_en` / `governorate_ar` - Governorate (province)
  - `card_type` - Insurance card tier (orange, gold, silver, green)
  - `phone1` / `phone2` - Contact numbers
  - `lat` / `lng` - Coordinates for map display
  - `location` - PostGIS geography point for proximity queries
  - `is_active` - Soft delete flag
  - `created_at` / `updated_at` - Timestamps

  ## Security
  - RLS enabled on providers table
  - Public read access for authenticated and anonymous users
  - Admin write access restricted to authenticated users with admin role

  ## Indexes
  - GIST index on location for fast proximity queries
  - B-tree indexes on card_type, type_en, governorate_en for filtering
  - Full-text search index on provider names
*/

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Card type enum
DO $$ BEGIN
  CREATE TYPE card_type_enum AS ENUM ('orange', 'gold', 'silver', 'green');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Provider type enum
DO $$ BEGIN
  CREATE TYPE provider_type_enum AS ENUM (
    'hospital',
    'pharmacy',
    'radiology',
    'laboratory',
    'physician',
    'dentist',
    'optics',
    'physiotherapy',
    'clinic',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main providers table
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL DEFAULT '',
  name_ar text NOT NULL DEFAULT '',
  type_en text NOT NULL DEFAULT '',
  type_ar text NOT NULL DEFAULT '',
  type_key provider_type_enum NOT NULL DEFAULT 'other',
  speciality_en text NOT NULL DEFAULT '',
  speciality_ar text NOT NULL DEFAULT '',
  address_en text NOT NULL DEFAULT '',
  address_ar text NOT NULL DEFAULT '',
  city_en text NOT NULL DEFAULT '',
  city_ar text NOT NULL DEFAULT '',
  governorate_en text NOT NULL DEFAULT '',
  governorate_ar text NOT NULL DEFAULT '',
  card_type card_type_enum NOT NULL DEFAULT 'orange',
  phone1 text NOT NULL DEFAULT '',
  phone2 text NOT NULL DEFAULT '',
  lat numeric(10, 7),
  lng numeric(10, 7),
  location geography(Point, 4326),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin users table (to track which auth users are admins)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS providers_location_gist ON providers USING GIST (location);
CREATE INDEX IF NOT EXISTS providers_card_type_idx ON providers (card_type);
CREATE INDEX IF NOT EXISTS providers_type_key_idx ON providers (type_key);
CREATE INDEX IF NOT EXISTS providers_governorate_en_idx ON providers (governorate_en);
CREATE INDEX IF NOT EXISTS providers_is_active_idx ON providers (is_active);
CREATE INDEX IF NOT EXISTS providers_name_search_idx ON providers USING GIN (
  to_tsvector('simple', name_en || ' ' || name_ar || ' ' || city_en || ' ' || governorate_en)
);

-- Function to auto-update location geography from lat/lng
CREATE OR REPLACE FUNCTION update_provider_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep location in sync
DROP TRIGGER IF EXISTS provider_location_trigger ON providers;
CREATE TRIGGER provider_location_trigger
  BEFORE INSERT OR UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_provider_location();

-- Function for nearby providers search
CREATE OR REPLACE FUNCTION get_nearby_providers(
  user_lat numeric,
  user_lng numeric,
  radius_meters integer DEFAULT 5000,
  filter_card_type text DEFAULT NULL,
  filter_type_key text DEFAULT NULL,
  filter_governorate text DEFAULT NULL,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name_en text,
  name_ar text,
  type_en text,
  type_ar text,
  type_key provider_type_enum,
  speciality_en text,
  speciality_ar text,
  address_en text,
  address_ar text,
  city_en text,
  city_ar text,
  governorate_en text,
  governorate_ar text,
  card_type card_type_enum,
  phone1 text,
  phone2 text,
  lat numeric,
  lng numeric,
  distance_meters double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name_en,
    p.name_ar,
    p.type_en,
    p.type_ar,
    p.type_key,
    p.speciality_en,
    p.speciality_ar,
    p.address_en,
    p.address_ar,
    p.city_en,
    p.city_ar,
    p.governorate_en,
    p.governorate_ar,
    p.card_type,
    p.phone1,
    p.phone2,
    p.lat,
    p.lng,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters
  FROM providers p
  WHERE
    p.is_active = true
    AND p.location IS NOT NULL
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
    AND (filter_card_type IS NULL OR p.card_type::text = filter_card_type)
    AND (filter_type_key IS NULL OR p.type_key::text = filter_type_key)
    AND (filter_governorate IS NULL OR p.governorate_en ILIKE filter_governorate)
  ORDER BY distance_meters ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for providers
CREATE POLICY "Anyone can read active providers"
  ON providers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert providers"
  ON providers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update providers"
  ON providers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete providers"
  ON providers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- RLS Policies for admin_users
CREATE POLICY "Admins can read admin list"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
    )
  );
