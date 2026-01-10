-- Ensure notification trigger uses standard type "message"
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.receiver_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := 'Nuevo mensaje en tu conversación';

  INSERT INTO public.notifications (user_id, type, title, content, data, is_read, created_at)
  VALUES (
    NEW.receiver_id,
    'message',
    v_title,
    COALESCE(NEW.content, ''),
    jsonb_build_object(
      'listing_id', NEW.listing_id,
      'sender_id', NEW.sender_id,
      'receiver_id', NEW.receiver_id,
      'message_id', NEW.id,
      'subject', NEW.subject,
      'context', NEW.context,
      'status', NEW.status,
      'last_event_at', NEW.last_event_at
    ),
    false,
    COALESCE(NEW.last_event_at, now())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notifications_on_message ON public.messages;
CREATE TRIGGER trg_notifications_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();
