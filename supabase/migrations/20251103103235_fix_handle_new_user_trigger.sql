/*
  # Fix handle_new_user trigger column mismatch

  ## Overview
  Fixes the handle_new_user trigger to use correct column name 'full_name' instead of 'display_name'

  ## Changes
  - Updates handle_new_user() function to insert into 'full_name' column
  - This matches the actual profiles table schema

  ## Notes
  - Previous trigger was failing silently due to column name mismatch
  - This ensures new users get proper profile entries in the database
*/

-- Drop and recreate the function with correct column name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, onboarded)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
