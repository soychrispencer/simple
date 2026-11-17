-- Limpieza final: vistas legacy coordinator/admin del perfil dueño (tabla canónica: serenata_owners).
DO $$
DECLARE
  relation_name text;
  relation_oid oid;
  relation_kind "char";
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['serenata_coordinators', 'serenata_admins'] LOOP
    relation_oid := to_regclass(relation_name);

    IF relation_oid IS NOT NULL THEN
      SELECT relkind
        INTO relation_kind
        FROM pg_class
       WHERE oid = relation_oid;

      -- Older installations may already use one of these names for a real table.
      -- Remove only legacy views; never drop a table or another relation type.
      IF relation_kind = 'v' THEN
        EXECUTE format('DROP VIEW %s', relation_oid::regclass);
      END IF;
    END IF;
  END LOOP;
END $$;
