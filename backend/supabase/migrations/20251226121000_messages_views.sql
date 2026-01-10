-- View: message_threads
-- Groups messages by listing + counterparty for a given user

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
    m.created_at,
    m.last_event_at
  FROM public.messages m
  JOIN public.listings l ON l.id = m.listing_id
  LEFT JOIN public.public_profiles pp ON pp.id = l.public_profile_id
  JOIN public.verticals v ON v.id = l.vertical_id
  WHERE m.listing_id IS NOT NULL
    AND (m.sender_id IS NOT NULL AND m.receiver_id IS NOT NULL)
),
base AS (
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
)
SELECT * FROM base;

-- View: messages_inbox_user
-- Provides two perspectives per thread: owner and counterparty
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
  b.owner_id,
  CASE WHEN u.user_id = b.owner_id THEN b.unread_for_owner ELSE b.unread_for_counterparty END AS unread,
  CASE WHEN u.user_id = b.owner_id THEN 'owner' ELSE 'counterparty' END AS role,
  u.user_id
FROM public.message_threads b
JOIN LATERAL (VALUES (b.owner_id), (b.counterparty_id)) AS u(user_id) ON u.user_id IS NOT NULL;

-- Permissions for views will need to be handled via RLS or RPC wrappers in application code.
