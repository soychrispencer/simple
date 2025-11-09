"use client";
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';

export interface VehicleTypeRow {
  id: string;
  slug: string;
  label: string;
  active: boolean;
  sort_order: number;
}

interface UseVehicleTypesOptions {
  includeInactive?: boolean;
}

export function useVehicleTypes(opts: UseVehicleTypesOptions = {}) {
  const supabase = useSupabase();
  const [data, setData] = useState<VehicleTypeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      const query = supabase.from('vehicle_types').select('*').order('sort_order', { ascending: true });
      const { data, error } = await query;
      if (!mounted) return;
      if (error) { setError(error.message); setLoading(false); return; }
      const filtered = (data || []).filter((r:any) => opts.includeInactive ? true : r.active);
      setData(filtered as VehicleTypeRow[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase, opts.includeInactive]);

  return { vehicleTypes: data, loading, error };
}
