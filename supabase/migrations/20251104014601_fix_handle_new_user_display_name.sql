/*
  # Fix handle_new_user trigger to use display_name

  ## Overview
  Fixes the handle_new_user trigger to use the correct column name 'display_name' 
  that actually exists in the profiles table.

  ## Changes
  - Updates handle_new_user() function to insert into 'display_name' column instead of 'full_name'
  - This matches the actual profiles table schema which has 'display_name', not 'full_name'

  ## Security
  - Function executes with SECURITY DEFINER to bypass RLS
  - Only runs on INSERT to auth.users (controlled by Supabase Auth)
*/

-- Drop and recreate the function with correct column name
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
