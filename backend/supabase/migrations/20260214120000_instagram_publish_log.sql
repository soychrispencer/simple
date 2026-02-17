-- Registro de publicaciones reales a Instagram por integración.
-- Mantiene trazabilidad (media_id), auditoría mínima y base para métricas.

create table if not exists public.integration_instagram_posts (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  vertical text,
  media_id text not null,
  creation_id text,
  caption text,
  image_url text,
  status text not null default 'published',
  error text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.integration_instagram_posts enable row level security;

create index if not exists integration_instagram_posts_integration_id_idx
  on public.integration_instagram_posts(integration_id);

create index if not exists integration_instagram_posts_media_id_idx
  on public.integration_instagram_posts(media_id);

create index if not exists integration_instagram_posts_published_at_idx
  on public.integration_instagram_posts(published_at desc);

