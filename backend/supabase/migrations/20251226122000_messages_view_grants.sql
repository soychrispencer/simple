-- Grants for message views so authenticated users can read their inbox
GRANT SELECT ON public.message_threads TO authenticated;
GRANT SELECT ON public.messages_inbox_user TO authenticated;
