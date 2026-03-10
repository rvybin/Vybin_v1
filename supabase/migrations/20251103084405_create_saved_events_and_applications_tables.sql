/*
  # Create saved_events and applications tables

  ## Overview
  This migration creates the saved_events and applications tables needed for the FeedTab functionality.

  ## New Tables

  ### `saved_events`
  Stores events that users have bookmarked for later
  - `user_id` (uuid) - References auth.users
  - `event_id` (uuid) - References events table
  - `created_at` (timestamptz) - When the event was saved
  - Primary key is the combination of user_id and event_id

  ### `applications`
  Stores user applications to events
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - References auth.users
  - `event_id` (uuid) - References events table
  - `status` (text) - Application status (applied, accepted, rejected)
  - `created_at` (timestamptz) - When the application was created
  - Unique constraint on (user_id, event_id)

  ## Security
  - RLS enabled on both tables
  - Users can only view and manage their own saved events and applications
*/

-- Create saved_events table
CREATE TABLE IF NOT EXISTS saved_events (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved events"
  ON saved_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved events"
  ON saved_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved events"
  ON saved_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'applied',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
