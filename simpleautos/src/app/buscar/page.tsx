"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from '@/lib/supabase/supabase';

interface Vehicle {
  id: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  location: string;
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
          .from("vehicles")
          .select("*")
          .ilike("title", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        setVehicles(data || []);
      } catch (err) {
        console.error("Error searching vehicles:", err);
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
        {/* Header de búsqueda */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-lighttext dark:text-darktext mb-2">
            Resultados de búsqueda
          </h1>
          {query && (
            <p className="text-gray-600 dark:text-gray-400">
              Buscando: <span className="font-medium">"{query}"</span>
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
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {query ? `No se encontraron resultados para "${query}"` : "Ingresa un término de búsqueda"}
            </p>
            {!query && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Prueba buscar por marca, modelo, año o ubicación
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {vehicles.length} resultado{vehicles.length !== 1 ? "s" : ""} encontrado{vehicles.length !== 1 ? "s" : ""}
            </p>

            {/* Grid de vehículos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                  <h3 className="font-semibold text-lg mb-2">{vehicle.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">${vehicle.price?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{vehicle.year} • {vehicle.mileage?.toLocaleString()} km</p>
                  <p className="text-sm text-gray-500">{vehicle.location}</p>
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
