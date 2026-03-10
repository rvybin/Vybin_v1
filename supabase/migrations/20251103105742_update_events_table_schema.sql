/*
  # Update Events Table Schema

  1. Changes
    - Add `event_type` column to replace `category` for better semantics
    - Add `organization` column to store hosting organization
    - Add `image_url` column for event images
    - Add `prize` column for competitions/hackathons
    - Add `tags` column (text array) for additional categorization
    - Add `deadline` column for application deadlines
    - Drop `link` column (not needed for current implementation)
    
  2. Notes
    - Existing `category` column will remain for backward compatibility
    - All new columns are nullable to preserve existing data
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE events ADD COLUMN event_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'organization'
  ) THEN
    ALTER TABLE events ADD COLUMN organization text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE events ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'prize'
  ) THEN
    ALTER TABLE events ADD COLUMN prize text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'tags'
  ) THEN
    ALTER TABLE events ADD COLUMN tags text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE events ADD COLUMN deadline timestamptz;
  END IF;
END $$;