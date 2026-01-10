-- Moderación de catálogo: marcas/modelos no verificados
-- Requiere migración 20260102120000_catalog_unverified_brands_models.sql aplicada.

-- 1) Marcas no verificadas (ordenadas por uso en publicaciones)
select
  b.id,
  b.name,
  b.name_norm,
  b.created_at,
  b.created_by,
  u.email as created_by_email,
  coalesce(cnt.listings_using_brand, 0) as listings_using_brand,
  coalesce(cnt.models_count, 0) as models_count
from public.brands b
left join auth.users u on u.id = b.created_by
left join lateral (
  select
    (select count(*) from public.models m where m.brand_id = b.id) as models_count,
    (select count(*) from public.listings_vehicles lv where lv.brand_id = b.id) as listings_using_brand
) cnt on true
where b.is_verified is false
order by listings_using_brand desc, models_count desc, b.created_at desc;

-- 2) Modelos no verificados (con marca + tipo)
select
  m.id,
  m.name,
  m.name_norm,
  m.brand_id,
  b.name as brand_name,
  m.vehicle_type_id,
  vt.slug as vehicle_type_slug,
  m.created_at,
  m.created_by,
  u.email as created_by_email,
  coalesce(cnt.listings_using_model, 0) as listings_using_model
from public.models m
join public.brands b on b.id = m.brand_id
left join public.vehicle_types vt on vt.id = m.vehicle_type_id
left join auth.users u on u.id = m.created_by
left join lateral (
  select count(*) as listings_using_model
  from public.listings_vehicles lv
  where lv.model_id = m.id
) cnt on true
where m.is_verified is false
order by listings_using_model desc, m.created_at desc;

-- 3) "Candidatos a merge" (mismo name_norm en marcas) - debería ser 0 por índice único
select
  b.name_norm,
  count(*) as cnt,
  array_agg(b.name order by b.name) as names
from public.brands b
group by b.name_norm
having count(*) > 1
order by cnt desc;

-- 4) "Candidatos a merge" (mismo brand_id + name_norm en modelos) - debería ser 0 por índice único
select
  m.brand_id,
  b.name as brand_name,
  m.name_norm,
  count(*) as cnt,
  array_agg(m.name order by m.name) as names
from public.models m
join public.brands b on b.id = m.brand_id
group by m.brand_id, b.name, m.name_norm
having count(*) > 1
order by cnt desc;

-- 5) Aprobar marca/modelo (set is_verified=true)
-- IMPORTANTE: usar con criterio; idealmente después de verificar ortografía.
-- update public.brands set is_verified = true where id = '...';
-- update public.models set is_verified = true where id = '...';

-- 6) Merge marca A -> marca B (mueve modelos y listings_vehicles)
-- Paso 1: mover modelos
-- update public.models set brand_id = '<brand_b_uuid>' where brand_id = '<brand_a_uuid>';
-- Paso 2: mover listings_vehicles.brand_id
-- update public.listings_vehicles set brand_id = '<brand_b_uuid>' where brand_id = '<brand_a_uuid>';
-- Paso 3: borrar marca A
-- delete from public.brands where id = '<brand_a_uuid>';

-- 7) Merge modelo A -> modelo B (mueve listings_vehicles.model_id)
-- update public.listings_vehicles set model_id = '<model_b_uuid>' where model_id = '<model_a_uuid>';
-- delete from public.models where id = '<model_a_uuid>';
