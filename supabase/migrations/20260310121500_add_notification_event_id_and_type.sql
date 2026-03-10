-- Step 1 for smart notifications:
-- add structured fields without breaking existing rows or UI reads.

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS event_id uuid NULL REFERENCES public.events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS type text NULL;

CREATE INDEX IF NOT EXISTS notifications_event_id_idx
ON public.notifications (event_id);

CREATE INDEX IF NOT EXISTS notifications_type_idx
ON public.notifications (type);
