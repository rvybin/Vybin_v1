-- Smart notifications: interest_match
-- Mirrors the feed's keyword-based matching so new events notify users
-- whose saved interests match the event text.

WITH ranked_interest_match_notifications AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, event_id, type
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM public.notifications
  WHERE event_id IS NOT NULL
    AND type IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked_interest_match_notifications r
WHERE n.ctid = r.ctid
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_type_unique
ON public.notifications (user_id, event_id, type);

CREATE OR REPLACE FUNCTION public.vybin_normalize_match_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(lower(coalesce(input, '')), '[^a-z0-9\s]+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.vybin_event_matches_interest(
  interest_name text,
  event_title text,
  event_description text,
  event_type text,
  event_organization text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized_interest text := lower(coalesce(interest_name, ''));
  event_text text := public.vybin_normalize_match_text(
    concat_ws(' ', event_title, event_description, event_type, event_organization)
  );
  keywords text[];
  keyword text;
BEGIN
  keywords := CASE normalized_interest
    WHEN lower('Career & Professional Development') THEN ARRAY[
      'career', 'job', 'internship', 'resume', 'linkedin', 'network', 'employer', 'career planning'
    ]
    WHEN lower('Wellness & Mental Health') THEN ARRAY[
      'wellness', 'mental', 'therapy', 'stress', 'health', 'mindfulness', 'support', 'care'
    ]
    WHEN lower('Workshops & Skill Building') THEN ARRAY[
      'workshop', 'training', 'learn', 'skillsets', 'tutorial', 'seminar', 'session'
    ]
    WHEN lower('Social & Community Events') THEN ARRAY[
      'social', 'community', 'mixer', 'connect', 'meetup', 'hangout'
    ]
    WHEN lower('Arts & Creative Activities') THEN ARRAY[
      'art', 'creative', 'crochet', 'craft', 'design', 'music', 'painting'
    ]
    WHEN lower('Academic Support & Research') THEN ARRAY[
      'research', 'library', 'thesis', 'citation', 'academic', 'phd', 'study'
    ]
    WHEN lower('International Student Services') THEN ARRAY[
      'international', 'immigration', 'iss', 'visa', 'global', 'orientation'
    ]
    WHEN lower('Leadership & Personal Growth') THEN ARRAY[
      'leadership', 'mindset', 'growth', 'development', 'imposter'
    ]
    ELSE ARRAY[]::text[]
  END;

  FOREACH keyword IN ARRAY keywords LOOP
    IF position(public.vybin_normalize_match_text(keyword) in event_text) > 0 THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.vybin_create_interest_match_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    event_id,
    type,
    title,
    body,
    url
  )
  SELECT
    up.user_id,
    NEW.id,
    'interest_match',
    'New event matching your interests',
    NEW.title,
    NEW.link
  FROM public.user_preferences up
  WHERE up.user_id IS NOT NULL
    AND up.interest_name IS NOT NULL
    AND public.vybin_event_matches_interest(
      up.interest_name,
      NEW.title,
      NEW.description,
      NEW.event_type,
      NEW.organization
    )
  ON CONFLICT (user_id, event_id, type) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_interest_match_notifications_on_event_insert ON public.events;

CREATE TRIGGER create_interest_match_notifications_on_event_insert
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.vybin_create_interest_match_notifications();
