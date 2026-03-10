/*
  # StarvIn App Database Schema

  ## Overview
  This migration creates the core schema for the StarvIn mobile app, a platform for discovering and applying to events.

  ## New Tables

  ### `profiles`
  User profile information synced with Supabase Auth
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `avatar_url` (text) - Profile picture URL
  - `onboarded` (boolean) - Whether user completed onboarding
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `interests`
  Available interest categories
  - `id` (uuid, primary key)
  - `name` (text) - Interest name (e.g., "Tech", "Business", "Design")
  - `icon` (text) - Icon identifier
  - `created_at` (timestamptz)

  ### `user_interests`
  Junction table linking users to their selected interests
  - `user_id` (uuid) - References profiles
  - `interest_id` (uuid) - References interests
  - `created_at` (timestamptz)

  ### `events`
  Event listings
  - `id` (uuid, primary key)
  - `title` (text) - Event name
  - `description` (text) - Event details
  - `event_type` (text) - Category (e.g., "Hackathon", "Workshop")
  - `organization` (text) - Hosting organization
  - `location` (text) - Event location
  - `date` (timestamptz) - Event date and time
  - `deadline` (timestamptz) - Application deadline
  - `image_url` (text) - Event image
  - `prize` (text) - Prize information (optional)
  - `tags` (text[]) - Array of tags
  - `created_at` (timestamptz)

  ### `applications`
  User applications to events
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References profiles
  - `event_id` (uuid) - References events
  - `status` (text) - Application status ("applied", "accepted", "rejected")
  - `google_calendar_id` (text) - Google Calendar event ID
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `saved_events`
  Events saved by users for later
  - `user_id` (uuid) - References profiles
  - `event_id` (uuid) - References events
  - `created_at` (timestamptz)

  ## Security

  All tables have RLS enabled with policies ensuring:
  - Users can only view and modify their own data
  - Event listings are publicly readable
  - User profiles are readable by authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  onboarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interests are viewable by authenticated users"
  ON interests FOR SELECT
  TO authenticated
  USING (true);

-- Create user_interests junction table
CREATE TABLE IF NOT EXISTS user_interests (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id uuid REFERENCES interests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, interest_id)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interests"
  ON user_interests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests"
  ON user_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
  ON user_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  event_type text DEFAULT '',
  organization text DEFAULT '',
  location text DEFAULT '',
  date timestamptz NOT NULL,
  deadline timestamptz,
  image_url text DEFAULT '',
  prize text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by authenticated users"
  ON events FOR SELECT
  TO authenticated
  USING (true);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'applied',
  google_calendar_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
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

-- Create saved_events table
CREATE TABLE IF NOT EXISTS saved_events (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
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

-- Insert default interests
INSERT INTO interests (name, icon) VALUES
  ('Technology', 'laptop'),
  ('Business', 'briefcase'),
  ('Design', 'palette'),
  ('Marketing', 'megaphone'),
  ('Engineering', 'cog'),
  ('AI/ML', 'brain'),
  ('Startups', 'rocket'),
  ('Finance', 'dollar-sign'),
  ('Health', 'heart'),
  ('Education', 'graduation-cap')
ON CONFLICT (name) DO NOTHING;

-- Insert sample events
INSERT INTO events (title, description, event_type, organization, location, date, deadline, image_url, prize, tags) VALUES
  (
    'TechCrunch Disrupt 2025',
    'Join the world''s leading startup event featuring top innovators, investors, and tech leaders.',
    'Conference',
    'TechCrunch',
    'San Francisco, CA',
    '2025-12-15 09:00:00+00',
    '2025-11-30 23:59:59+00',
    'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg',
    'Networking + Startup Battlefield $50K',
    ARRAY['Technology', 'Startups', 'Networking']
  ),
  (
    'Google I/O Extended',
    'Experience Google''s latest developer innovations and products at this extended community event.',
    'Workshop',
    'Google',
    'Mountain View, CA',
    '2025-11-20 10:00:00+00',
    '2025-11-10 23:59:59+00',
    'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg',
    'Free swag + certificates',
    ARRAY['Technology', 'AI/ML', 'Engineering']
  ),
  (
    'Hackathon: Build for Good',
    'A 48-hour hackathon focused on creating technology solutions for social impact.',
    'Hackathon',
    'Code for America',
    'Austin, TX',
    '2025-11-25 18:00:00+00',
    '2025-11-15 23:59:59+00',
    'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg',
    '$10,000 + Mentorship',
    ARRAY['Technology', 'Startups', 'Engineering']
  )
ON CONFLICT DO NOTHING;