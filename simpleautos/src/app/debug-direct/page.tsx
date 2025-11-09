"use client";
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/supabase';

export default function DirectQueryPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function queryDirect() {
      const supabase = getSupabaseClient();
      
      try {
        // Query 1: Contar TODOS los vehículos
        const { data: allData, error: allError, count: allCount } = await supabase
          .from('vehicles')
          .select('id,title,listing_type,visibility,owner_id', { count: 'exact' });
        
        console.log('Todos los vehículos:', { allData, allError, allCount });

        // Query 2: Agrupar por visibility
        const visibilityCounts: Record<string, number> = {};
        const listingTypeCounts: Record<string, number> = {};
        
        if (allData) {
          allData.forEach(v => {
            visibilityCounts[v.visibility || 'null'] = (visibilityCounts[v.visibility || 'null'] || 0) + 1;
            listingTypeCounts[v.listing_type || 'null'] = (listingTypeCounts[v.listing_type || 'null'] || 0) + 1;
          });
        }

        // Query 3: Obtener profiles
        const ownerIds = allData ? [...new Set(allData.map(v => v.owner_id).filter(Boolean))] : [];
        let profiles: any[] = [];
        
        if (ownerIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id,username,public_name')
            .in('id', ownerIds);
          profiles = profilesData || [];
        }

        setResults({
          total: allCount,
          vehicles: allData,
          visibilityCounts,
          listingTypeCounts,
          profiles,
          error: allError
        });
      } catch (err: any) {
        console.error('Error:', err);
        setResults({ error: err.message });
      } finally {
        setLoading(false);
      }
    }
    queryDirect();
  }, []);

  if (loading) return <div className="p-8">Consultando base de datos...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Consulta Directa a Supabase</h1>
      
      {results?.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {results.error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">📊 Total de vehículos</h2>
          <p className="text-4xl font-bold text-blue-600">{results?.total || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">👁️ Por Visibilidad</h2>
          <div className="space-y-2">
            {results?.visibilityCounts && Object.entries(results.visibilityCounts).map(([vis, count]) => (
              <div key={vis} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <span className="font-mono font-semibold">'{vis}'</span>
                <span className="text-2xl font-bold text-purple-600">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">🚗 Por Tipo de Publicación (listing_type)</h2>
          <div className="space-y-2">
            {results?.listingTypeCounts && Object.entries(results.listingTypeCounts).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <span className="font-mono font-semibold">'{type}'</span>
                <span className="text-2xl font-bold text-orange-600">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">👤 Profiles de Vendedores</h2>
          <p className="mb-2">Total: <strong>{results?.profiles?.length || 0}</strong></p>
          {results?.profiles?.length > 0 && (
            <div className="space-y-2">
              {results.profiles.map((p: any) => (
                <div key={p.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded">
                  <strong>{p.public_name || 'Sin nombre'}</strong> (@{p.username || 'sin-username'})
                  <div className="text-xs text-gray-500">ID: {p.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">📋 Listado de Vehículos</h2>
          {results?.vehicles?.length > 0 ? (
            <div className="space-y-3">
              {results.vehicles.map((v: any) => (
                <div key={v.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded">
                  <div className="font-bold text-lg mb-2">{v.title}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">ID:</span> <code className="text-xs">{v.id}</code></div>
                    <div><span className="text-gray-500">Tipo:</span> <strong className="text-blue-600">{v.listing_type}</strong></div>
                    <div><span className="text-gray-500">Visibilidad:</span> <strong className="text-purple-600">{v.visibility}</strong></div>
                    <div><span className="text-gray-500">Owner ID:</span> <code className="text-xs">{v.owner_id?.slice(0, 16)}...</code></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay vehículos en la base de datos</p>
          )}
        </div>

        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
          <details>
            <summary className="cursor-pointer font-semibold mb-2">Ver JSON completo</summary>
            <pre className="mt-4 text-xs overflow-auto max-h-96 bg-white dark:bg-black p-4 rounded">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
