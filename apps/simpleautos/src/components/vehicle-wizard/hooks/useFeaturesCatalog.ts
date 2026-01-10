"use client";
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';

export interface FeatureRow {
  id?: string; // opcional si existe PK numérica
  code: string;
  label: string;
  category?: string | null;
  sort_order?: number | null;
  active: boolean;
  allowed_types?: string[] | null;
  allowed_body_types?: string[] | null;
}

interface UseFeaturesOptions {
  typeSlug?: string | null;
  bodyType?: string | null;
  includeInactive?: boolean;
}

/**
 * Hook para cargar equipamiento (features_catalog) filtrado por tipo de vehículo.
 * Regla: mostrar filas donde active = true (a menos que includeInactive) Y
 * (allowed_types IS NULL OR allowed_types contiene el tipo).
 */
// Cache simple en memoria (por sesión de navegador) para evitar recargas repetidas al volver al paso.
// Clave: typeSlug + includeInactive
const _featuresCache: Record<string, FeatureRow[]> = {};

export function useFeaturesCatalog(opts: UseFeaturesOptions) {
  const supabase = useSupabase();
  const { typeSlug, bodyType, includeInactive } = opts;
  const [data, setData] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!typeSlug) { setData([]); return; }
      const btKey = bodyType ? String(bodyType) : 'any';
      const cacheKey = `${typeSlug}::bt=${btKey}::${includeInactive ? 'all' : 'active'}`;
      if (_featuresCache[cacheKey]) {
        setData(_featuresCache[cacheKey]);
        return; // usar cache, no mostrar loading
      }
      setLoading(true); setError(null);
      // Construir query base
      let query = supabase.from('features_catalog')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true });
      if (!includeInactive) query = query.eq('active', true);
      // No podemos usar OR con arrays directamente en cliente sin raw SQL; estrategia:
      // 1. Traer todas (activa) donde allowed_types IS NULL
      // 2. Traer las que allowed_types @> ARRAY[typeSlug]
      // Supabase JS permite .or()
      // Expresión: allowed_types.is.null,allowed_types.cs.{"typeSlug"}
      // 'cs' => contains (para arrays) recibe JSON array
      const arrExpr = `allowed_types.is.null,allowed_types.cs.{"${typeSlug}"}`;
      query = query.or(arrExpr);
      const { data, error } = await query;
      if (!mounted) return;
      if (error) {
        const missingTable = /features_catalog/i.test(error.message || '') || error.code === 'PGRST116' || error.code === '42P01' || error.code === '404';
        if (missingTable) {
          _featuresCache[cacheKey] = [];
          setData([]);
          setError(null);
          setLoading(false);
          return;
        }
        setError(error.message);
        setLoading(false);
        return;
      }
      const rows = data || [];
      const bt = bodyType ? String(bodyType) : null;
      const filtered = bt
        ? rows.filter((r: FeatureRow) => !r.allowed_body_types || r.allowed_body_types.includes(bt))
        : (typeSlug === 'car'
            ? rows.filter((r: FeatureRow) => !r.allowed_body_types || r.allowed_body_types.length === 0)
            : rows);

      _featuresCache[cacheKey] = filtered; // almacenar en cache
      setData(filtered);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase, typeSlug, bodyType, includeInactive]);

  return { features: data, loading, error };
}


