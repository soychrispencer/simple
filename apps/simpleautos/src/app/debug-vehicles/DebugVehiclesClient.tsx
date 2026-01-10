"use client";

import { useEffect, useState } from "react";
import { searchVehicles } from "@/lib/searchVehicles";
import { logDebug } from "@/lib/logger";
import { logError } from "@/lib/logger";

export default function DebugVehiclesClient() {
  const [debug, setDebug] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runDebug() {
      try {
        logDebug("[debug-vehicles] Iniciando diagnóstico");

        // Test 1: Buscar TODOS los vehículos sin filtro de visibilidad
        logDebug("[debug-vehicles] Test 1: Todos los vehículos");
        const allResult = await searchVehicles({
          page: 1,
          page_size: 100,
        });
        logDebug("[debug-vehicles] Resultado test 1", allResult);

        // Test 2: Buscar solo con visibility normal
        logDebug("[debug-vehicles] Test 2: Vehículos con visibility=normal");
        const normalResult = await searchVehicles({
          visibility: "normal",
          page: 1,
          page_size: 100,
        });
        logDebug("[debug-vehicles] Resultado test 2", normalResult);

        // Test 3: Buscar por tipo
        logDebug("[debug-vehicles] Test 3: Ventas con visibility=publica");
        const saleResult = await searchVehicles({
          listing_kind: "venta",
          visibility: "publica",
          page: 1,
          page_size: 100,
        });
        logDebug("[debug-vehicles] Resultado test 3", saleResult);

        logDebug("[debug-vehicles] Test 4: Arriendos con visibility=publica");
        const rentResult = await searchVehicles({
          listing_kind: "arriendo",
          visibility: "publica",
          page: 1,
          page_size: 100,
        });
        logDebug("[debug-vehicles] Resultado test 4", rentResult);

        logDebug("[debug-vehicles] Test 5: Subastas con visibility=publica");
        const auctionResult = await searchVehicles({
          listing_kind: "subasta",
          visibility: "publica",
          page: 1,
          page_size: 100,
        });
        logDebug("[debug-vehicles] Resultado test 5", auctionResult);

        setDebug({
          all: allResult,
          normal: normalResult,
          sale: saleResult,
          rent: rentResult,
          auction: auctionResult,
        });
      } catch (error: any) {
        logError("[debug-vehicles] Error en diagnóstico", error);
        setDebug({ error: error.message, stack: error.stack });
      } finally {
        setLoading(false);
      }
    }

    runDebug();
  }, []);

  if (loading) return <div className="p-8">Cargando diagnóstico...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🚀 Diagnóstico de Vehículos</h1>

      {debug.error ? (
        <div className="bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)] text-[var(--color-danger)] px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {debug.error}
          <pre className="mt-2 text-xs overflow-auto">{debug.stack}</pre>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card-surface shadow-card p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🚀 Todos los vehículos (sin filtro)</h2>
            <p className="text-2xl font-bold text-primary">{debug.all?.count || 0} vehículos</p>
            {debug.all?.data?.length > 0 && (
              <div className="mt-4 space-y-2">
                {debug.all.data.slice(0, 3).map((v: any) => (
                  <div key={v.id} className="text-sm border-l-4 border-primary pl-3">
                    <div className="font-medium">{v.title}</div>
                    <div className="text-lighttext/70 dark:text-darktext/70">
                      Tipo: {v.listing_kind} | Visibilidad: {v.extra_specs?.visibility || "N/A"} | Owner:{" "}
                      {v.owner_id?.slice(0, 8)}... | Profile:{" "}
                      {v.profiles ? `✅ ${v.profiles.public_name}` : "❌ Sin profile"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-surface shadow-card p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🚀 Vehículos con visibility=&apos;normal&apos;</h2>
            <p className="text-2xl font-bold text-primary">{debug.normal?.count || 0} vehículos</p>
            {debug.normal?.data?.length > 0 && (
              <div className="mt-4 space-y-2">
                {debug.normal.data.slice(0, 3).map((v: any) => (
                  <div key={v.id} className="text-sm border-l-4 border-primary pl-3">
                    <div className="font-medium">{v.title}</div>
                    <div className="text-lighttext/70 dark:text-darktext/70">
                      Tipo: {v.listing_kind} | Owner: {v.owner_id?.slice(0, 8)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="card-surface shadow-card p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🚀 Ventas (publica)</h3>
              <p className="text-2xl font-bold text-primary">{debug.sale?.count || 0}</p>
              {debug.sale?.data?.length > 0 && <div className="mt-2 text-xs">{debug.sale.data[0].title}</div>}
            </div>

            <div className="card-surface shadow-card p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🚀 Arriendos (publica)</h3>
              <p className="text-2xl font-bold text-primary">{debug.rent?.count || 0}</p>
              {debug.rent?.data?.length > 0 && <div className="mt-2 text-xs">{debug.rent.data[0].title}</div>}
            </div>

            <div className="card-surface shadow-card p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🚀 Subastas (publica)</h3>
              <p className="text-2xl font-bold text-[var(--color-warn)]">{debug.auction?.count || 0}</p>
              {debug.auction?.data?.length > 0 && (
                <div className="mt-2 text-xs">{debug.auction.data[0].title}</div>
              )}
            </div>
          </div>

          <div className="card-surface shadow-card p-4 rounded">
            <details>
              <summary className="cursor-pointer font-semibold">Ver JSON completo</summary>
              <pre className="mt-4 text-xs overflow-auto max-h-96">{JSON.stringify(debug, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
