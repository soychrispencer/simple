-- Refresh message views to include latest status and content for inbox
DROP VIEW IF EXISTS public.messages_inbox_user;
DROP VIEW IF EXISTS public.message_threads;

CREATE OR REPLACE VIEW public.message_threads AS
WITH message_base AS (
  SELECT
    m.listing_id,
    COALESCE(m.company_id, pp.company_id) AS company_id,
    l.vertical_id,
    v.key AS vertical_key,
    l.title AS listing_title,
    l.user_id AS owner_id,
    CASE
      WHEN m.sender_id = l.user_id OR m.receiver_id = l.user_id THEN 'sell'
      ELSE 'buy'
    END AS context,
    CASE
      WHEN m.sender_id = l.user_id THEN m.receiver_id
      ELSE m.sender_id
    END AS counterparty_id,
    m.receiver_id,
    m.is_read,
    m.content AS message_content,
    m.status AS message_status,
    m.created_at,
    m.last_event_at
  FROM public.messages m
  JOIN public.listings l ON l.id = m.listing_id
  LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
  JOIN public.verticals v ON v.id = l.vertical_id
  WHERE m.listing_id IS NOT NULL
    AND (m.sender_id IS NOT NULL AND m.receiver_id IS NOT NULL)
),
agg AS (
  SELECT
    listing_id,
    company_id,
    vertical_id,
    vertical_key,
    listing_title,
    owner_id,
    context,
    counterparty_id,
    COUNT(*) FILTER (WHERE receiver_id = owner_id AND is_read = FALSE) AS unread_for_owner,
    COUNT(*) FILTER (WHERE receiver_id <> owner_id AND is_read = FALSE) AS unread_for_counterparty,
    MAX(created_at) AS last_message_at,
    MAX(last_event_at) AS last_event_at
  FROM message_base
  GROUP BY listing_id, company_id, vertical_id, vertical_key, listing_title, owner_id, context, counterparty_id
),
latest AS (
  SELECT DISTINCT ON (listing_id, company_id, vertical_id, owner_id, context, counterparty_id)
    listing_id,
    company_id,
    vertical_id,
    owner_id,
    context,
    counterparty_id,
    message_content AS last_message_content,
    message_status AS last_status,
    last_event_at
  FROM message_base
  ORDER BY listing_id, company_id, vertical_id, owner_id, context, counterparty_id, last_event_at DESC
)
SELECT
  agg.listing_id,
  agg.company_id,
  agg.vertical_id,
  agg.vertical_key,
  agg.listing_title,
  agg.owner_id,
  agg.context,
  agg.counterparty_id,
  agg.unread_for_owner,
  agg.unread_for_counterparty,
  agg.last_message_at,
  agg.last_event_at,
  latest.last_message_content,
  latest.last_status AS status
FROM agg
LEFT JOIN latest ON latest.listing_id = agg.listing_id
  AND latest.company_id IS NOT DISTINCT FROM agg.company_id
  AND latest.vertical_id = agg.vertical_id
  AND latest.owner_id = agg.owner_id
  AND latest.context = agg.context
  AND latest.counterparty_id IS NOT DISTINCT FROM agg.counterparty_id;

CREATE OR REPLACE VIEW public.messages_inbox_user AS
SELECT
  b.listing_id,
  b.company_id,
  b.vertical_id,
  b.vertical_key,
  b.listing_title,
  b.context,
  b.counterparty_id,
  b.last_message_at,
  b.last_event_at,
  b.last_message_content,
  b.status,
  b.owner_id,
  CASE WHEN u.user_id = b.owner_id THEN b.unread_for_owner ELSE b.unread_for_counterparty END AS unread,
  CASE WHEN u.user_id = b.owner_id THEN 'owner' ELSE 'counterparty' END AS role,
  u.user_id
FROM public.message_threads b
JOIN LATERAL (VALUES (b.owner_id), (b.counterparty_id)) AS u(user_id) ON u.user_id IS NOT NULL;
