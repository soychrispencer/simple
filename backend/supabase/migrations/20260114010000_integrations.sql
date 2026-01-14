-- Integrations (global) + Instagram provider.
-- Stored with RLS enabled and no policies so only service role can read/write.

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integrations_user_provider_unique unique (user_id, provider)
);

alter table public.integrations enable row level security;

create table if not exists public.integration_instagram (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  access_token text not null,
  token_type text,
  expires_at timestamptz,
  page_id text,
  page_name text,
  ig_user_id text,
  ig_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integration_instagram enable row level security;

create index if not exists integration_instagram_ig_user_id_idx
  on public.integration_instagram(ig_user_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_integrations_updated_at on public.integrations;
create trigger set_integrations_updated_at
before update on public.integrations
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists set_integration_instagram_updated_at on public.integration_instagram;
create trigger set_integration_instagram_updated_at
before update on public.integration_instagram
for each row
execute function public.set_updated_at_timestamp();
