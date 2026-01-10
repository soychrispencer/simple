"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { LISTING_CARD_SELECT, listingRowToVehicleRow } from '@/lib/listings/queryHelpers';
import { logError } from "@/lib/logger";

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

        const supabase = getSupabaseClient();

        // Búsqueda básica por título
        const { data, error } = await supabase
          .from("listings")
          .select(LISTING_CARD_SELECT)
          .ilike("title", `%${query}%`)
          .neq('status', 'draft')
          .neq('visibility', 'hidden')
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        const normalized = (data || []).map((row) => {
          const listing = listingRowToVehicleRow(row);
          const location = [listing.commune_name, listing.region_name].filter(Boolean).join(', ') || null;
          const imageArray = Array.isArray(listing.image_paths)
            ? listing.image_paths
            : listing.image_paths
              ? [listing.image_paths]
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
          };
        });

        setVehicles(normalized);
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







