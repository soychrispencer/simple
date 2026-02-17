-- Instagram publish queue + retries + richer history fields.

alter table public.integration_instagram_posts
  alter column media_id drop not null,
  alter column published_at drop default,
  alter column published_at drop not null;

alter table public.integration_instagram_posts
  add column if not exists permalink text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists error_code text,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize existing historical rows created before queue support.
update public.integration_instagram_posts
set
  status = case
    when coalesce(media_id, '') <> '' then 'published'
    when coalesce(error, '') <> '' then 'failed'
    else coalesce(status, 'queued')
  end,
  attempt_count = case
    when coalesce(attempt_count, 0) = 0 and coalesce(media_id, '') <> '' then 1
    else coalesce(attempt_count, 0)
  end,
  published_at = case
    when coalesce(media_id, '') <> '' then coalesce(published_at, created_at, now())
    else null
  end
where true;

alter table public.integration_instagram_posts
  alter column status set default 'queued';

alter table public.integration_instagram_posts
  drop constraint if exists integration_instagram_posts_status_check;

alter table public.integration_instagram_posts
  add constraint integration_instagram_posts_status_check
  check (status in ('queued', 'retrying', 'processing', 'published', 'failed', 'cancelled'));

create index if not exists integration_instagram_posts_status_retry_idx
  on public.integration_instagram_posts(status, next_retry_at);

create index if not exists integration_instagram_posts_listing_idx
  on public.integration_instagram_posts(listing_id, vertical);

create index if not exists integration_instagram_expires_at_idx
  on public.integration_instagram(expires_at)
  where expires_at is not null;

drop trigger if exists set_integration_instagram_posts_updated_at on public.integration_instagram_posts;
create trigger set_integration_instagram_posts_updated_at
before update on public.integration_instagram_posts
for each row
execute function public.set_updated_at_timestamp();
