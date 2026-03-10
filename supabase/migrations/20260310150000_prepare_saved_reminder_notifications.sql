-- Prepare saved_reminder notifications for future scheduling.
-- This step does not generate reminders yet.

WITH ranked_saved_reminders AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, event_id, type
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM public.notifications
  WHERE type = 'saved_reminder'
    AND event_id IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked_saved_reminders r
WHERE n.ctid = r.ctid
  AND r.row_num > 1;

-- The broader unique index on (user_id, event_id, type) already enforces
-- one saved_reminder per user per event, but these indexes make the future
-- reminder-selection query efficient.
CREATE INDEX IF NOT EXISTS events_date_idx
ON public.events (date)
WHERE date IS NOT NULL;

CREATE INDEX IF NOT EXISTS saved_events_event_user_created_at_idx
ON public.saved_events (event_id, user_id, created_at);
