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
}

interface UseFeaturesOptions {
  typeSlug?: string | null;
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
  const { typeSlug, includeInactive } = opts;
  const [data, setData] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!typeSlug) { setData([]); return; }
      const cacheKey = `${typeSlug}::${includeInactive ? 'all' : 'active'}`;
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
      if (error) { setError(error.message); setLoading(false); return; }
      const rows = data || [];
      _featuresCache[cacheKey] = rows; // almacenar en cache
      setData(rows);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase, typeSlug, includeInactive]);

  return { features: data, loading, error };
}
