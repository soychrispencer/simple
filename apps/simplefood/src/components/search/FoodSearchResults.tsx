"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { logError } from "@/lib/logger";

interface RestaurantListing {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  listing_type: string;
  location: string | null;
  tags: string[] | null;
  metadata: Record<string, any>;
  images: string[];
}

const VERTICAL_KEY = "food";

const modeLabels: Record<string, string> = {
  todos: "Todos",
  delivery: "Delivery",
  pickup: "Retiro",
  suscripcion: "Planes",
};

const cuisineIcons: Record<string, string> = {
  vegana: "🥗",
  fusion: "🍱",
  regional: "🍲",
  "fast-casual": "🍔",
};

const formatterCache = new Map<string, Intl.NumberFormat>();
const formatPrice = (value?: number | null, currency?: string | null) => {
  if (!value || value <= 0) return null;
  const curr = currency || "CLP";
  if (!formatterCache.has(curr)) {
    formatterCache.set(
      curr,
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: curr,
        maximumFractionDigits: 0,
      })
    );
  }
  return formatterCache.get(curr)!.format(value);
};

export default function FoodSearchResults() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || searchParams.get("q") || "";
  const modeParam = searchParams.get("mode") || "todos";
  const cuisine = searchParams.get("cuisine") || "";
  const schedule = searchParams.get("schedule") || "";
  const sector = searchParams.get("sector") || "";

  const [restaurants, setRestaurants] = useState<RestaurantListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeMode = modeParam.toLowerCase();

  useEffect(() => {
    let active = true;

    async function searchRestaurants() {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseClient();
        const { data: verticalData, error: verticalError } = await supabase
          .from("verticals")
          .select("id")
          .eq("key", VERTICAL_KEY)
          .single();

        if (verticalError || !verticalData) {
          throw new Error("No pudimos identificar la vertical de food");
        }

        let queryBuilder = supabase
          .from("listings")
          .select(
            `
            id,
            title,
            description,
            listing_type,
            price,
            currency,
            location,
            tags,
            metadata,
            regions(name),
            communes(name),
            images(url, is_primary, position)
          `
          )
          .eq("vertical_id", verticalData.id)
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(60);

        if (keyword) {
          queryBuilder = queryBuilder.ilike("title", `%${keyword}%`);
        }
        if (cuisine) {
          queryBuilder = queryBuilder.contains("metadata", { cuisine });
        }
        if (schedule) {
          queryBuilder = queryBuilder.contains("metadata", { schedule });
        }
        if (sector) {
          queryBuilder = queryBuilder.contains("metadata", { sector });
        }
        if (activeMode && activeMode !== "todos") {
          queryBuilder = queryBuilder.contains("metadata", { mode: activeMode });
        }

        const { data, error } = await queryBuilder;
        if (error) throw error;

        const mapped: RestaurantListing[] = (data || []).map((listing: any) => {
          const meta =
            listing.metadata && typeof listing.metadata === "object"
              ? listing.metadata
              : {};
          const region = Array.isArray(listing.regions)
            ? listing.regions[0]?.name
            : listing.regions?.name;
          const commune = Array.isArray(listing.communes)
            ? listing.communes[0]?.name
            : listing.communes?.name;
          const sortedImages = (listing.images || [])
            .sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return (a.position ?? 0) - (b.position ?? 0);
            })
            .map((img: any) => img.url);

          const location = meta.city || commune || region || listing.location;

          return {
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            currency: listing.currency,
            listing_type: listing.listing_type,
            location: location || null,
            tags: listing.tags,
            metadata: meta,
            images: sortedImages,
          };
        });

        if (!active) return;
        setRestaurants(mapped);
      } catch (err) {
        logError("Error fetching restaurants", err);
        if (active) setError("Error al cargar restaurantes");
      } finally {
        if (active) setLoading(false);
      }
    }

    searchRestaurants();
    return () => {
      active = false;
    };
  }, [keyword, activeMode, cuisine, schedule, sector]);

  const empty = !loading && restaurants.length === 0;

  const headline = useMemo(() => {
    if (keyword) {
      return `Resultados para "${keyword}"`;
    }
    return activeMode && activeMode !== "todos"
      ? `Restaurantes · ${modeLabels[activeMode] ?? activeMode}`
      : "Todos los restaurantes del ecosistema";
  }, [keyword, activeMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lighttext/60 dark:text-darktext/60">Buscando restaurantes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-danger)] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-[var(--color-on-primary)] rounded-lg hover:bg-[var(--color-primary-a90)]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em]">Catálogo global</p>
          <h1 className="text-3xl font-bold text-lighttext dark:text-darktext mb-2">{headline}</h1>
          <p className="text-lighttext/60 dark:text-darktext/60">
            {restaurants.length} restaurante{restaurants.length === 1 ? "" : "s"} disponibles
          </p>
        </div>

        {empty ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-lightborder/70 dark:border-darkborder/40">
            <p className="text-lg font-medium mb-2">No encontramos coincidencias</p>
            <p className="text-lighttext/60 dark:text-darktext/60">
              Ajusta los filtros o prueba con otra búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => {
              const meta = restaurant.metadata;
              const priceLabel = formatPrice(restaurant.price, restaurant.currency);
              const rawMode = typeof meta.mode === "string" ? meta.mode.toLowerCase() : "";
              const modeLabel = rawMode ? modeLabels[rawMode] ?? rawMode : "On demand";
              const cuisineKey = typeof meta.cuisine === "string" ? meta.cuisine.toLowerCase() : "";
              const cuisineIcon = cuisineKey ? cuisineIcons[cuisineKey] ?? "🍽️" : "🍽️";
              const scheduleLabel = typeof meta.schedule === "string" && meta.schedule.length > 0 ? `Horario · ${meta.schedule}` : null;
              const sectorLabel = typeof meta.sector === "string" && meta.sector.length > 0 ? `Sector · ${meta.sector}` : null;
              const image = restaurant.images?.[0];

              return (
                <article
                  key={restaurant.id}
                  className="group rounded-3xl card-surface shadow-card overflow-hidden flex flex-col"
                >
                  {image ? (
                    <div className="h-48 w-full overflow-hidden">
                      <img
                        src={image}
                        alt={restaurant.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-48 w-full card-surface ring-1 ring-border/60 flex items-center justify-center text-4xl text-primary">
                      {cuisineIcon}
                    </div>
                  )}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary-a80)]">
                        {modeLabel}
                      </span>
                      {priceLabel && (
                        <span className="text-base font-semibold text-lighttext dark:text-darktext">
                          {priceLabel}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1 text-lighttext dark:text-darktext">
                        {cuisineIcon} {restaurant.title}
                      </h3>
                      {restaurant.description && (
                        <p className="text-sm text-lighttext/70 dark:text-darktext/70 line-clamp-2">
                          {restaurant.description}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-lighttext/60 dark:text-darktext/60 flex flex-col gap-1">
                      {scheduleLabel && <span>{scheduleLabel}</span>}
                      {sectorLabel && <span>{sectorLabel}</span>}
                      {restaurant.location && <span>{restaurant.location}</span>}
                    </div>
                    {restaurant.tags && restaurant.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {restaurant.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full bg-[var(--field-bg)] text-xs text-lighttext/70 dark:text-darktext/70"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
