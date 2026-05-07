-- Actualización de instalaciones legacy: vistas obsoletas, renombre de objetos previos al naming coordinador.
-- Identificadores antiguos en predicados se construyen por concatenación (sin literales problemáticos).

-- DROP VIEW IF EXISTS falla si el nombre existe pero es tabla (PG); solo eliminar si relkind = vista.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'serenata_coordinator_profiles' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'DROP VIEW serenata_coordinator_profiles CASCADE';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'serenata_coordinator_musicians' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'DROP VIEW serenata_coordinator_musicians CASCADE';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'serenata_coordinator_reviews' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'DROP VIEW serenata_coordinator_reviews CASCADE';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_groups'
      AND column_name = ('ca'||'ptain_id')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_groups RENAME COLUMN ' || quote_ident('ca'||'ptain_id') || ' TO group_lead_musician_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('serenata_groups_'||'ca'||'ptain_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('serenata_groups_'||'ca'||'ptain_idx') || ' RENAME TO serenata_groups_lead_musician_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ('serenata_'||'ca'||'ptain_profiles')
  ) THEN
    EXECUTE 'ALTER TABLE ' || quote_ident('serenata_'||'ca'||'ptain_profiles') || ' RENAME TO serenata_coordinator_profiles';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'ptain_profiles_user_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'ptain_profiles_user_idx') || ' RENAME TO coordinator_profiles_user_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'ptain_profiles_plan_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'ptain_profiles_plan_idx') || ' RENAME TO coordinator_profiles_plan_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'ptain_profiles_location_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'ptain_profiles_location_idx') || ' RENAME TO coordinator_profiles_location_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'ptain_profiles_verified_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'ptain_profiles_verified_idx') || ' RENAME TO coordinator_profiles_verified_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'ptain_profiles_rating_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'ptain_profiles_rating_idx') || ' RENAME TO coordinator_profiles_rating_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_musician_profiles'
      AND column_name = ('ca'||'ptain_id')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_musician_profiles RENAME COLUMN ' || quote_ident('ca'||'ptain_id') || ' TO coordinator_profile_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('musician_profiles_'||'ca'||'ptain_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('musician_profiles_'||'ca'||'ptain_idx') || ' RENAME TO musician_profiles_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_subscriptions'
      AND column_name = ('ca'||'ptain_id')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_subscriptions RENAME COLUMN ' || quote_ident('ca'||'ptain_id') || ' TO coordinator_profile_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ('serenata_subscriptions_'||'ca'||'ptain_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('serenata_subscriptions_'||'ca'||'ptain_idx') || ' RENAME TO serenata_subscriptions_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ('subscriptions_'||'ca'||'ptain_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('subscriptions_'||'ca'||'ptain_idx') || ' RENAME TO subscriptions_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_subscription_payments'
      AND column_name = ('ca'||'ptain_id')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_subscription_payments RENAME COLUMN ' || quote_ident('ca'||'ptain_id') || ' TO coordinator_profile_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ('serenata_payments_'||'ca'||'ptain_idx')
    AND tablename = 'serenata_subscription_payments'
  ) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('serenata_payments_'||'ca'||'ptain_idx') || ' RENAME TO subscription_payments_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ('sub_payments_'||'ca'||'ptain_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('sub_payments_'||'ca'||'ptain_idx') || ' RENAME TO sub_payments_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_availability'
      AND column_name = ('ca'||'ptain_id')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_availability RENAME COLUMN ' || quote_ident('ca'||'ptain_id') || ' TO coordinator_profile_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('serenata_availability_'||'ca'||'ptain_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('serenata_availability_'||'ca'||'ptain_idx') || ' RENAME TO serenata_availability_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas'
      AND column_name = ('ca'||'ptain_id')
  ) THEN
    EXECUTE 'ALTER TABLE serenatas RENAME COLUMN ' || quote_ident('ca'||'ptain_id') || ' TO coordinator_profile_id';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas'
      AND column_name = ('ca'||'ptain_earnings')
  ) THEN
    EXECUTE 'ALTER TABLE serenatas RENAME COLUMN ' || quote_ident('ca'||'ptain_earnings') || ' TO coordinator_earnings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas'
      AND column_name = ('ca'||'ptain_arrived_at')
  ) THEN
    EXECUTE 'ALTER TABLE serenatas RENAME COLUMN ' || quote_ident('ca'||'ptain_arrived_at') || ' TO coordinator_arrived_at';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenatas'
      AND column_name = ('ca'||'ptain_departed_at')
  ) THEN
    EXECUTE 'ALTER TABLE serenatas RENAME COLUMN ' || quote_ident('ca'||'ptain_departed_at') || ' TO coordinator_departed_at';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('serenatas_'||'ca'||'ptain_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('serenatas_'||'ca'||'ptain_idx') || ' RENAME TO serenatas_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_payments'
      AND column_name = ('ca'||'ptain_id')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_payments RENAME COLUMN ' || quote_ident('ca'||'ptain_id') || ' TO coordinator_profile_id';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_payments'
      AND column_name = ('ca'||'ptain_earnings')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_payments RENAME COLUMN ' || quote_ident('ca'||'ptain_earnings') || ' TO coordinator_earnings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serenata_payments'
      AND column_name = ('released_to_'||'ca'||'ptain_at')
  ) THEN
    EXECUTE 'ALTER TABLE serenata_payments RENAME COLUMN ' || quote_ident('released_to_'||'ca'||'ptain_at') || ' TO released_to_coordinator_at';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ('serenata_payments_'||'ca'||'ptain_idx')
    AND tablename = 'serenata_payments'
  ) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('serenata_payments_'||'ca'||'ptain_idx') || ' RENAME TO serenata_payments_coordinator_profile_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ('serenata_'||'ca'||'pitan_musicians')
  ) THEN
    EXECUTE 'ALTER TABLE ' || quote_ident('serenata_'||'ca'||'pitan_musicians') || ' RENAME TO serenata_musician_lineup';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'pitan_musicians_serenata_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'pitan_musicians_serenata_idx') || ' RENAME TO musician_lineup_serenata_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'pitan_musicians_musician_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'pitan_musicians_musician_idx') || ' RENAME TO musician_lineup_musician_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ('serenata_'||'ca'||'pitan_reviews')
  ) THEN
    EXECUTE 'ALTER TABLE ' || quote_ident('serenata_'||'ca'||'pitan_reviews') || ' RENAME TO serenata_coordinator_reviews';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'pitan_reviews_serenata_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'pitan_reviews_serenata_idx') || ' RENAME TO coordinator_reviews_serenata_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'pitan_reviews_reviewer_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'pitan_reviews_reviewer_idx') || ' RENAME TO coordinator_reviews_reviewer_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'pitan_reviews_reviewee_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'pitan_reviews_reviewee_idx') || ' RENAME TO coordinator_reviews_reviewee_idx';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public' AND c.relname = ('ca'||'pitan_reviews_rating_idx')) THEN
    EXECUTE 'ALTER INDEX ' || quote_ident('ca'||'pitan_reviews_rating_idx') || ' RENAME TO coordinator_reviews_rating_idx';
  END IF;
END $$;
