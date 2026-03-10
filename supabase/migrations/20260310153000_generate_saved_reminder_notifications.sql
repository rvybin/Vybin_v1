-- Generate saved_reminder notifications for saved events that start soon.
-- MVP approach: database-side RPC that can be run manually or from a scheduler later.

CREATE OR REPLACE FUNCTION public.vybin_generate_saved_reminders(
  p_window_hours integer DEFAULT 24,
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF p_window_hours IS NULL OR p_window_hours <= 0 THEN
    RAISE EXCEPTION 'p_window_hours must be greater than 0';
  END IF;

  WITH inserted_rows AS (
    INSERT INTO public.notifications (
      user_id,
      event_id,
      type,
      title,
      body,
      url
    )
    SELECT
      se.user_id,
      e.id,
      'saved_reminder',
      'Reminder: Your saved event starts soon',
      e.title || ' starts soon',
      e.link
    FROM public.saved_events se
    INNER JOIN public.events e
      ON e.id = se.event_id
    WHERE se.user_id IS NOT NULL
      AND e.id IS NOT NULL
      AND e.date IS NOT NULL
      AND e.date > p_now
      AND e.date <= (p_now + make_interval(hours => p_window_hours))
    ON CONFLICT (user_id, event_id, type) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO inserted_count
  FROM inserted_rows;

  RETURN inserted_count;
END;
$$;
