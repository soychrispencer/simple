-- Adds controlled creation fields and normalization to brands/models.
-- Goal: allow users to add missing catalog entries while preventing easy typos/duplicates.

begin;

-- 1) Extensions & normalization helper
create extension if not exists unaccent;

create or replace function public.normalize_catalog_name(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(unaccent(trim(coalesce(input, '')))), '\s+', ' ', 'g');
$$;

-- 2) Add moderation/traceability columns
alter table public.brands
  add column if not exists is_verified boolean not null default true,
  add column if not exists created_by uuid null references auth.users(id) on delete set null;

alter table public.models
  add column if not exists is_verified boolean not null default true,
  add column if not exists created_by uuid null references auth.users(id) on delete set null;

-- 3) Deduplicate case/diacritic variants safely (brands)
create temporary table _brand_dups as
select
  public.normalize_catalog_name(name) as name_norm,
  min(id::text)::uuid as keep_id,
  array_agg(id order by id) as ids
from public.brands
group by public.normalize_catalog_name(name)
having count(*) > 1;

update public.models m
set brand_id = d.keep_id
from _brand_dups d
where m.brand_id = any(d.ids)
  and m.brand_id <> d.keep_id;

delete from public.brands b
using _brand_dups d
where b.id = any(d.ids)
  and b.id <> d.keep_id;

drop table _brand_dups;

-- 4) Deduplicate models variants within brand (brand_id + normalized name)
create temporary table _model_dups as
select
  brand_id,
  public.normalize_catalog_name(name) as name_norm,
  min(id::text)::uuid as keep_id,
  array_agg(id order by id) as ids
from public.models
group by brand_id, public.normalize_catalog_name(name)
having count(*) > 1;

update public.listings_vehicles lv
set model_id = d.keep_id
from _model_dups d
where lv.model_id = any(d.ids)
  and lv.model_id <> d.keep_id;

delete from public.models m
using _model_dups d
where m.id = any(d.ids)
  and m.id <> d.keep_id;

drop table _model_dups;

-- 5) Add generated normalized columns + unique indexes (post-dedup)
-- NOTE: we keep existing unique constraints too; these add case/diacritic-insensitive uniqueness.
alter table public.brands
  add column if not exists name_norm text generated always as (public.normalize_catalog_name(name)) stored;

alter table public.models
  add column if not exists name_norm text generated always as (public.normalize_catalog_name(name)) stored;

create unique index if not exists brands_name_norm_uniq on public.brands (name_norm);
create unique index if not exists models_brand_name_norm_uniq on public.models (brand_id, name_norm);

commit;
