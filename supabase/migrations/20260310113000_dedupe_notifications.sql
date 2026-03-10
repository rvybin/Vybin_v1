-- Remove existing duplicate notifications and prevent identical rows
-- from being inserted again for the same user.

WITH ranked_notifications AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        user_id,
        COALESCE(title, ''),
        COALESCE(body, ''),
        COALESCE(url, '')
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS row_num
  FROM public.notifications
)
DELETE FROM public.notifications n
USING ranked_notifications r
WHERE n.ctid = r.ctid
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_title_body_url_unique
ON public.notifications (
  user_id,
  COALESCE(title, ''),
  COALESCE(body, ''),
  COALESCE(url, '')
);
