"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PropertyCard from '@/components/properties/PropertyCard';
import type { Property } from '@/types/property';
import { fetchPropertyListings } from '@/lib/search/fetchPropertyListings';
import { logError } from "@/lib/logger";

interface PropertySearchResultsProps {
  defaultListingType?: "sale" | "rent" | "auction" | "all";
  initialProperties?: Property[];
  initialCount?: number;
}

const isAllListing = (value?: string | null) => !value || value === 'all' || value === 'todos';

const parseNumericParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const boolFromParam = (value: string | null) => value === 'true';
export default function PropertySearchResults({
  defaultListingType = "sale",
  initialProperties = [],
  initialCount = 0,
}: PropertySearchResultsProps) {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || searchParams.get("q") || "";
  const propertyType = searchParams.get("property_type") || "";
  const listingTypeParam = searchParams.get("listing_type");
  const listingType = listingTypeParam || defaultListingType;
  const city = searchParams.get("city") || "";
  const regionId = searchParams.get("region_id") || "";
  const communeId = searchParams.get("commune_id") || "";
  const currency = searchParams.get("currency") || "";
  const minPrice = parseNumericParam(searchParams.get("min_price"));
  const maxPrice = parseNumericParam(searchParams.get("max_price"));
  const minBedrooms = parseNumericParam(searchParams.get("min_bedrooms"));
  const minBathrooms = parseNumericParam(searchParams.get("min_bathrooms"));
  const minArea = parseNumericParam(searchParams.get("min_area"));
  const maxArea = parseNumericParam(searchParams.get("max_area"));
  const hasPool = boolFromParam(searchParams.get("has_pool"));
  const hasGarden = boolFromParam(searchParams.get("has_garden"));
  const hasTerrace = boolFromParam(searchParams.get("has_terrace"));
  const hasBalcony = boolFromParam(searchParams.get("has_balcony"));
  const hasElevator = boolFromParam(searchParams.get("has_elevator"));
  const hasSecurity = boolFromParam(searchParams.get("has_security"));
  const hasParking = boolFromParam(searchParams.get("has_parking"));
  const isFurnished = boolFromParam(searchParams.get("is_furnished"));
  const allowsPets = boolFromParam(searchParams.get("allows_pets"));

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [total, setTotal] = useState(initialCount || initialProperties.length);
  const [loading, setLoading] = useState(initialProperties.length === 0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const searchProperties = async () => {
      try {
        setLoading(true);
        setError("");
        const listingValue = isAllListing(listingType) ? undefined : listingType;
        const { properties: fetched, count } = await fetchPropertyListings({
          keyword,
          propertyType: propertyType || undefined,
          listingType: listingValue,
          city,
          regionId,
          communeId,
          currency: currency || undefined,
          minPrice,
          maxPrice,
          minBedrooms,
          minBathrooms,
          minArea,
          maxArea,
          hasPool,
          hasGarden,
          hasTerrace,
          hasBalcony,
          hasElevator,
          hasSecurity,
          hasParking,
          isFurnished,
          allowsPets,
          limit: 50,
        });

        if (active) {
          setProperties(fetched);
          setTotal(count);
        }
      } catch (err) {
        logError("Error searching properties:", err);
        if (active) setError("Error al buscar propiedades");
      } finally {
        if (active) setLoading(false);
      }
    };

    searchProperties();
    return () => {
      active = false;
    };
  }, [
    keyword,
    propertyType,
    listingType,
    city,
    regionId,
    communeId,
    currency,
    minPrice,
    maxPrice,
    minBedrooms,
    minBathrooms,
    minArea,
    maxArea,
    isFurnished,
    allowsPets,
    hasParking,
    hasPool,
    hasGarden,
    hasTerrace,
    hasBalcony,
    hasElevator,
    hasSecurity,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lighttext/60 dark:text-darktext/60">Buscando propiedades...</p>
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
          <h1 className="text-3xl font-bold text-lighttext dark:text-darktext mb-2">
            {keyword ? `Resultados para "${keyword}"` : "Propiedades disponibles"}
          </h1>
          <p className="text-lighttext/60 dark:text-darktext/60">
            {total} propiedades encontradas
          </p>
        </div>

            {properties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lighttext/60 dark:text-darktext/60 text-lg mb-4">
              No se encontraron propiedades
            </p>
            <p className="text-lighttext/40 dark:text-darktext/40">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                layout="vertical"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
