-- Move reminder preference from profile-level to per-class
ALTER TABLE public.calendar_items
  ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT NULL;

-- Drop the global setting from profiles (no longer used)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS reminder_minutes;

-- Rewrite the function to read reminder_minutes from each calendar_item
CREATE OR REPLACE FUNCTION public.get_due_class_reminders()
RETURNS TABLE(
  user_id uuid,
  calendar_item_id uuid,
  title text,
  course_code text,
  location text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.user_id,
    ci.id AS calendar_item_id,
    ci.title::text,
    ci.course_code::text,
    ci.location::text
  FROM public.calendar_items ci
  WHERE
    ci.reminder_minutes IS NOT NULL
    AND EXTRACT(DOW FROM ci.start_at AT TIME ZONE 'UTC') =
        EXTRACT(DOW FROM (NOW() + (ci.reminder_minutes || ' minutes')::interval) AT TIME ZONE 'UTC')
    AND EXTRACT(HOUR FROM ci.start_at AT TIME ZONE 'UTC') =
        EXTRACT(HOUR FROM (NOW() + (ci.reminder_minutes || ' minutes')::interval) AT TIME ZONE 'UTC')
    AND EXTRACT(MINUTE FROM ci.start_at AT TIME ZONE 'UTC') =
        EXTRACT(MINUTE FROM (NOW() + (ci.reminder_minutes || ' minutes')::interval) AT TIME ZONE 'UTC')
    AND NOT EXISTS (
      SELECT 1 FROM public.sent_reminders sr
      WHERE sr.user_id = ci.user_id
        AND sr.calendar_item_id = ci.id
        AND sr.occurrence_date = CURRENT_DATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_due_class_reminders() TO service_role;
