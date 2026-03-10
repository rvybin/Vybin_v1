/*
  # Add onboarded column to profiles table

  1. Changes
    - Add `onboarded` (boolean) column to profiles table with default value false
    - This tracks whether a user has completed the onboarding process
  
  2. Notes
    - Uses IF NOT EXISTS pattern to safely add the column
    - Existing users will have onboarded set to false by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarded'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarded boolean DEFAULT false;
  END IF;
END $$;
