"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { logError } from "@/lib/logger";
import { getDemoListingsMode, getDemoVehicleRows } from "@/lib/demo/demoVehicles";
import { listListings } from "@simple/sdk";

interface Vehicle {
  id: string;
  title: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  location: string | null;
  images: string[];
  created_at: string;
  user_id: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const searchVehicles = async () => {
      try {
        setLoading(true);
        setError("");

        const demoMode = getDemoListingsMode();
        const q = query.trim();
        const demoMatches = (() => {
          if (!q) return [];
          const demoRows = getDemoVehicleRows({ count: 80, includeFeaturedMix: true });
          return demoRows
            .filter((r) => String(r.title || '').toLowerCase().includes(q.toLowerCase()))
            .slice(0, 50)
            .map((listing) => {
              const location = [listing.communes?.name, listing.regions?.name]
                .filter(Boolean)
                .join(', ') || null;
              const imageArray = Array.isArray((listing as any).image_paths)
                ? ((listing as any).image_paths as string[])
                : (listing as any).image_paths
                ? [String((listing as any).image_paths)]
                : [];
              return {
                id: listing.id,
                title: listing.title,
                price: listing.price ?? null,
                year: listing.year ?? null,
                mileage: listing.mileage ?? null,
                location,
                images: imageArray,
                created_at: listing.created_at,
                user_id: listing.owner_id || '',
              } as Vehicle;
            });
        })();

        // Modo demo forzado: no consultar BD.
        if (demoMode === 'always') {
          setVehicles(demoMatches);
          return;
        }

        const listings = await listListings({
          vertical: 'autos',
          limit: 100,
          offset: 0,
        });

        const normalized = (Array.isArray(listings.items) ? listings.items : [])
          .filter((item) => String(item.title || '').toLowerCase().includes(q.toLowerCase()))
          .slice(0, 50)
          .map((item) => {
          const location = [item.city, item.region].filter(Boolean).join(', ') || null;
          const imageArray = item.imageUrl ? [item.imageUrl] : [];
          return {
            id: item.id,
            title: item.title,
            price: item.price ?? null,
            year: item.year ?? null,
            mileage: item.mileage ?? null,
            location,
            images: imageArray,
            created_at: item.createdAt || new Date().toISOString(),
            user_id: item.ownerId || '',
          };
        });

        // Fallback demo: si no hay resultados reales, usar demo.
        setVehicles(normalized.length === 0 ? demoMatches : normalized);
      } catch (err) {
        logError("Error searching vehicles", err);
        setError("Error al buscar vehículos");
      } finally {
        setLoading(false);
      }
    };

    searchVehicles();
  }, [query]);

  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header de b�squeda */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-lighttext dark:text-darktext mb-2">
            Resultados de búsqueda
          </h1>
          {query && (
            <p className="text-lighttext/70 dark:text-darktext/70">
              Buscando: <span className="font-medium">&quot;{query}&quot;</span>
            </p>
          )}
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-danger)]">{error}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lighttext/70 dark:text-darktext/70 mb-4">
              {query ? `No se encontraron resultados para &quot;${query}&quot;` : "Ingresa un término de búsqueda"}
            </p>
            {!query && (
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                Prueba buscar por marca, modelo, año o ubicación
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70 mb-6">
              {vehicles.length} resultado{vehicles.length !== 1 ? "s" : ""} encontrado{vehicles.length !== 1 ? "s" : ""}
            </p>

            {/* Grid de veh�culos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="card-surface shadow-card p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{vehicle.title}</h3>
                  <p className="text-lighttext/80 dark:text-darktext/80">${vehicle.price?.toLocaleString()}</p>
                  <p className="text-sm text-lighttext/70 dark:text-darktext/70">{vehicle.year} · {vehicle.mileage?.toLocaleString()} km</p>
                  <p className="text-sm text-lighttext/70 dark:text-darktext/70">{vehicle.location}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-lightbg dark:bg-darkbg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}







