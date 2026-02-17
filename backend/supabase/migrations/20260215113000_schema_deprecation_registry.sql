-- Governance: registro explícito de deprecaciones de schema.
-- Regla: antes de eliminar una columna/tabla, debe existir aquí con status='deprecated' o 'scheduled_drop'.

create table if not exists public.schema_deprecations (
  id uuid primary key default gen_random_uuid(),
  schema_name text not null default 'public',
  table_name text not null,
  column_name text,
  reason text not null,
  status text not null default 'deprecated',
  migration_marked text not null,
  migration_removed text,
  remove_after timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schema_deprecations_status_check
    check (status in ('deprecated', 'scheduled_drop', 'removed', 'cancelled'))
);

alter table public.schema_deprecations enable row level security;

create unique index if not exists schema_deprecations_active_unique
  on public.schema_deprecations(schema_name, table_name, coalesce(column_name, ''), status)
  where status in ('deprecated', 'scheduled_drop');

create index if not exists schema_deprecations_table_idx
  on public.schema_deprecations(table_name, column_name);

drop trigger if exists set_schema_deprecations_updated_at on public.schema_deprecations;
create trigger set_schema_deprecations_updated_at
before update on public.schema_deprecations
for each row
execute function public.set_updated_at_timestamp();

