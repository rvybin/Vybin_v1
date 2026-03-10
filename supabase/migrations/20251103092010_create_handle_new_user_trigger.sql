/*
  # Create handle_new_user trigger

  ## Overview
  This migration creates a database trigger that automatically creates a profile row
  when a new user signs up through Supabase Auth.

  ## Changes
  - Creates a `handle_new_user()` function that inserts a row into the profiles table
  - Creates a trigger that fires after INSERT on auth.users
  - Automatically populates email and display_name from auth.users metadata

  ## Security
  - Function executes with SECURITY DEFINER to bypass RLS
  - Only runs on INSERT to auth.users (Supabase Auth controls this)
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, onboarded)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
