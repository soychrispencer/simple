-- Catalog audit (Supabase SQL Editor)
-- Enfocado en cobertura de marcas/modelos por tipo de vehículo.
-- Ejecuta cada bloque y revisa resultados.

-- 1) Verifica que NO existan tipos legacy (suv/pickup/van/otro)
select id, slug, name, category, sort_order
from public.vehicle_types
where slug in ('suv','pickup','van','otro')
order by slug;

-- 2) Cobertura: modelos por tipo (7 categorías base)
select
  vt.slug as vehicle_type_slug,
  vt.name as vehicle_type_name,
  count(*)::int as models_count
from public.models m
join public.vehicle_types vt on vt.id = m.vehicle_type_id
group by vt.slug, vt.name
order by models_count desc, vt.slug;

-- 3) Cobertura: marcas distintas por tipo
select
  vt.slug as vehicle_type_slug,
  vt.name as vehicle_type_name,
  count(distinct m.brand_id)::int as distinct_brands_count
from public.models m
join public.vehicle_types vt on vt.id = m.vehicle_type_id
group by vt.slug, vt.name
order by distinct_brands_count desc, vt.slug;

-- 4) Tipos con 0 modelos (debería devolver 0 filas)
select vt.slug, vt.name
from public.vehicle_types vt
left join public.models m on m.vehicle_type_id = vt.id
group by vt.slug, vt.name
having count(m.id) = 0
order by vt.slug;

-- 5) Top 30 marcas por tipo (por cantidad de modelos)
-- Cambia el filtro vt.slug si quieres enfocarte en uno.
select *
from (
  select
    vt.slug as vehicle_type_slug,
    b.name as brand_name,
    count(*)::int as models_count,
    row_number() over (partition by vt.slug order by count(*) desc, b.name asc) as rn
  from public.models m
  join public.vehicle_types vt on vt.id = m.vehicle_type_id
  join public.brands b on b.id = m.brand_id
  group by vt.slug, b.name
) ranked
where rn <= 30
order by vehicle_type_slug, rn;

-- 6) Duplicados potenciales (mismo brand_id + name dentro del mismo tipo)
select
  vt.slug as vehicle_type_slug,
  b.name as brand_name,
  m.name as model_name,
  count(*)::int as dup_count
from public.models m
join public.vehicle_types vt on vt.id = m.vehicle_type_id
join public.brands b on b.id = m.brand_id
group by vt.slug, b.name, m.name
having count(*) > 1
order by dup_count desc, vehicle_type_slug, brand_name, model_name;
