-- Add reminder preference to user profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT NULL;

-- Track which reminders have already been sent to avoid duplicates
CREATE TABLE IF NOT EXISTS public.sent_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_item_id uuid NOT NULL,
  occurrence_date date NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, calendar_item_id, occurrence_date)
);

ALTER TABLE public.sent_reminders ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — only accessed via service role from edge function

-- Function called by the class-reminders edge function each minute.
-- Returns calendar items whose class starts in exactly reminder_minutes from now
-- (matched by UTC day-of-week + hour + minute), excluding already-sent ones today.
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
  JOIN public.profiles p ON p.id = ci.user_id
  WHERE
    p.reminder_minutes IS NOT NULL
    -- Day-of-week must match (0=Sun, 1=Mon … 6=Sat)
    AND EXTRACT(DOW FROM ci.start_at AT TIME ZONE 'UTC') =
        EXTRACT(DOW FROM (NOW() + (p.reminder_minutes || ' minutes')::interval) AT TIME ZONE 'UTC')
    -- Hour must match
    AND EXTRACT(HOUR FROM ci.start_at AT TIME ZONE 'UTC') =
        EXTRACT(HOUR FROM (NOW() + (p.reminder_minutes || ' minutes')::interval) AT TIME ZONE 'UTC')
    -- Minute must match
    AND EXTRACT(MINUTE FROM ci.start_at AT TIME ZONE 'UTC') =
        EXTRACT(MINUTE FROM (NOW() + (p.reminder_minutes || ' minutes')::interval) AT TIME ZONE 'UTC')
    -- Not already sent for this occurrence today
    AND NOT EXISTS (
      SELECT 1 FROM public.sent_reminders sr
      WHERE sr.user_id = ci.user_id
        AND sr.calendar_item_id = ci.id
        AND sr.occurrence_date = CURRENT_DATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_due_class_reminders() TO service_role;
