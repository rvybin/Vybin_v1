-- Remove old untyped notifications from the legacy notification flow.
-- Smart notifications use typed rows such as interest_match and saved_reminder.

DELETE FROM public.notifications
WHERE type IS NULL;
