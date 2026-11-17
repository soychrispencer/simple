UPDATE relationship_notes AS note
SET business_id = COALESCE(
  (
    SELECT profile.account_id
    FROM public_profiles AS profile
    WHERE profile.user_id = note.author_user_id
      AND profile.vertical = note.vertical
      AND profile.account_id IS NOT NULL
    LIMIT 1
  ),
  (
    SELECT membership.account_id
    FROM account_users AS membership
    WHERE membership.user_id = note.author_user_id
    ORDER BY membership.is_default DESC, membership.created_at ASC
    LIMIT 1
  )
)
WHERE note.vertical IN ('autos', 'propiedades')
  AND note.business_id = note.author_user_id
  AND EXISTS (
    SELECT 1
    FROM account_users AS membership
    WHERE membership.user_id = note.author_user_id
  );
