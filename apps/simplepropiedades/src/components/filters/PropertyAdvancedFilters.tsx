"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { Button, FormInput as Input, FormSelect as Select } from "@simple/ui";
import { filterSectionLabelClass } from "@simple/ui";
import { getCurrencyOptions, getVerticalRegion } from "@simple/config";
import {
  BEDROOM_OPTIONS,
  BATHROOM_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "@/types/property";

interface PropertyAdvancedFiltersProps {
  defaultListingType?: "sale" | "rent" | "all" | "todos" | string;
}

interface RegionOption {
  id: string;
  name: string;
}

interface CommuneOption {
  id: string;
  name: string;
  region_id: string;
}

const listingTypeOptions = [
  { value: "all", label: "Todos" },
  { value: "sale", label: "Comprar" },
  { value: "rent", label: "Arrendar" },
];

const amenityToggles = [
  { key: "has_pool", label: "Piscina" },
  { key: "has_garden", label: "Jardín" },
  { key: "has_terrace", label: "Terraza" },
  { key: "has_balcony", label: "Balcón" },
  { key: "has_elevator", label: "Ascensor" },
  { key: "has_security", label: "Seguridad" },
];

const livingPreferenceToggles = [
  { key: "is_furnished", label: "Amoblado" },
  { key: "allows_pets", label: "Permite mascotas" },
  { key: "has_parking", label: "Estacionamiento" },
];

const PROPERTY_REGION = getVerticalRegion('properties');
const PROPERTY_CURRENCY_OPTIONS = getCurrencyOptions({ region: PROPERTY_REGION });
const PRICE_CURRENCY_OPTIONS = [
  { value: "", label: "Moneda" },
  ...PROPERTY_CURRENCY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

const normalizeListingType = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  if (value === "sale" || value === "rent" || value === "all" || value === "todos") return value;
  return fallback;
};

const buildFilterState = (
  params: URLSearchParams | ReadonlyURLSearchParams,
  fallbackListingType: string
) => ({
  listing_type: normalizeListingType(params.get("listing_type"), fallbackListingType),
  property_type: params.get("property_type") || "",
  keyword: params.get("keyword") || params.get("q") || "",
  city: params.get("city") || "",
  region_id: params.get("region_id") || "",
  commune_id: params.get("commune_id") || "",
  currency: params.get("currency") || "",
  min_price: params.get("min_price") || "",
  max_price: params.get("max_price") || "",
  min_bedrooms: params.get("min_bedrooms") || "",
  min_bathrooms: params.get("min_bathrooms") || "",
  min_area: params.get("min_area") || "",
  max_area: params.get("max_area") || "",
  is_furnished: params.get("is_furnished") === "true",
  allows_pets: params.get("allows_pets") === "true",
  has_pool: params.get("has_pool") === "true",
  has_garden: params.get("has_garden") === "true",
  has_terrace: params.get("has_terrace") === "true",
  has_balcony: params.get("has_balcony") === "true",
  has_elevator: params.get("has_elevator") === "true",
  has_security: params.get("has_security") === "true",
  has_parking: params.get("has_parking") === "true",
});

export function PropertyAdvancedFilters({ defaultListingType = "all" }: PropertyAdvancedFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const normalizedDefault = defaultListingType === "todos" ? "all" : defaultListingType || "all";
  const paramsSignature = searchParams.toString();
  const [localFilters, setLocalFilters] = useState(() => buildFilterState(searchParams, normalizedDefault));
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [communes, setCommunes] = useState<CommuneOption[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(true);

  useEffect(() => {
    setLocalFilters(buildFilterState(searchParams, normalizedDefault));
  }, [paramsSignature, normalizedDefault, searchParams]);

  useEffect(() => {
    let active = true;
    async function loadGeo() {
      try {
        const [regionsResponse, communesResponse] = await Promise.all([
          fetch("/api/geo?mode=regions", { cache: "no-store" }),
          fetch("/api/geo?mode=communes", { cache: "no-store" }),
        ]);
        const regionsPayload = await regionsResponse.json().catch(() => ({} as Record<string, unknown>));
        const communesPayload = await communesResponse.json().catch(() => ({} as Record<string, unknown>));
        if (!active) return;

        const regionRows = Array.isArray((regionsPayload as { regions?: unknown[] }).regions)
          ? ((regionsPayload as { regions: Array<{ id: string | number; name: string }> }).regions ?? [])
          : [];
        const communeRows = Array.isArray((communesPayload as { communes?: unknown[] }).communes)
          ? ((communesPayload as { communes: Array<{ id: string | number; name: string; region_id: string | number }> }).communes ?? [])
          : [];

        if (regionRows.length > 0) {
          setRegions(regionRows.map((r) => ({ id: String(r.id), name: r.name })));
        }
        if (communeRows.length > 0) {
          setCommunes(
            communeRows.map((c) => ({
              id: String(c.id),
              name: c.name,
              region_id: String(c.region_id),
            }))
          );
        }
      } finally {
        if (active) setLoadingGeo(false);
      }
    }
    loadGeo();
    return () => {
      active = false;
    };
  }, []);

  const filteredCommunes = useMemo(() => {
    if (!localFilters.region_id) return communes;
    return communes.filter((c) => c.region_id === localFilters.region_id);
  }, [communes, localFilters.region_id]);

  const applyParams = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");

    const applyText = (key: string, value: string) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    };
    const applyBool = (key: string, value: boolean) => {
      if (value) next.set(key, "true");
      else next.delete(key);
    };

    const listingValue = localFilters.listing_type;
    if (!listingValue || listingValue === "all" || listingValue === "todos") {
      next.delete("listing_type");
    } else {
      next.set("listing_type", listingValue);
    }

    applyText("property_type", localFilters.property_type);
    applyText("keyword", localFilters.keyword.trim());
    applyText("city", localFilters.city.trim());
    applyText("region_id", localFilters.region_id);
    applyText("commune_id", localFilters.commune_id);
    applyText("currency", localFilters.currency);
    applyText("min_price", localFilters.min_price);
    applyText("max_price", localFilters.max_price);
    applyText("min_area", localFilters.min_area);
    applyText("max_area", localFilters.max_area);
    applyText("min_bedrooms", localFilters.min_bedrooms);
    applyText("min_bathrooms", localFilters.min_bathrooms);

    applyBool("is_furnished", localFilters.is_furnished);
    applyBool("allows_pets", localFilters.allows_pets);
    applyBool("has_pool", localFilters.has_pool);
    applyBool("has_garden", localFilters.has_garden);
    applyBool("has_terrace", localFilters.has_terrace);
    applyBool("has_balcony", localFilters.has_balcony);
    applyBool("has_elevator", localFilters.has_elevator);
    applyBool("has_security", localFilters.has_security);
    applyBool("has_parking", localFilters.has_parking);

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleReset = () => {
    const baseline = buildFilterState(new URLSearchParams(), normalizedDefault);
    setLocalFilters(baseline);
    const next = new URLSearchParams();
    if (baseline.listing_type && baseline.listing_type !== "all") {
      next.set("listing_type", baseline.listing_type);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  if (loadingGeo) {
    return (
      <aside className="w-full md:w-64 card-surface shadow-token-lg ring-1 ring-border/60 p-6 h-fit sticky top-8 flex flex-col gap-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Filtros avanzados</h2>
          <span className="text-xs text-lighttext/60 dark:text-darktext/60">Cargando…</span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-64 card-surface shadow-token-lg ring-1 ring-border/60 p-6 h-fit flex flex-col gap-5 sticky top-8">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Filtros avanzados</h2>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className={`${filterSectionLabelClass} mb-2`}>
            Tipo de publicación
          </p>
          <div className="grid grid-cols-2 gap-2">
            {listingTypeOptions.map((option) => {
              const active = localFilters.listing_type === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={active ? "primary" : "outline"}
                  className="w-full"
                  onClick={() => setLocalFilters((prev) => ({ ...prev, listing_type: option.value }))}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>
            Tipo de propiedad
          </p>
          <Select
            value={localFilters.property_type}
            onChange={(value) => setLocalFilters((prev) => ({ ...prev, property_type: String(value) }))}
            options={[
              { label: "Todas", value: "" },
              ...PROPERTY_TYPE_OPTIONS.map((opt) => ({
                label: `${opt.icon} ${opt.label}`,
                value: opt.value,
              })),
            ]}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>
            Palabra clave
          </p>
          <Input
            placeholder="Ej: loft, metro..."
            value={localFilters.keyword}
            onChange={(event) => setLocalFilters((prev) => ({ ...prev, keyword: event.target.value }))}
            fieldSize="sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>
            Ciudad
          </p>
          <Input
            placeholder="Buscar por ciudad"
            value={localFilters.city}
            onChange={(event) => setLocalFilters((prev) => ({ ...prev, city: event.target.value }))}
            fieldSize="sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>
            Región
          </p>
          <Select
            value={localFilters.region_id}
            onChange={(value) =>
              setLocalFilters((prev) => ({
                ...prev,
                region_id: String(value),
                commune_id: prev.region_id === String(value) ? prev.commune_id : "",
              }))
            }
            options={[
              { label: "Todas", value: "" },
              ...regions.map((region) => ({ label: region.name, value: region.id })),
            ]}
            size="sm"
          />
        </div>

        {localFilters.region_id && (
          <div className="flex flex-col gap-2">
            <p className={filterSectionLabelClass}>
              Comuna
            </p>
            <Select
              value={localFilters.commune_id}
              onChange={(value) => setLocalFilters((prev) => ({ ...prev, commune_id: String(value) }))}
              options={[
                { label: "Todas", value: "" },
                ...filteredCommunes.map((commune) => ({ label: commune.name, value: commune.id })),
              ]}
              size="sm"
            />
          </div>
        )}

        <div>
          <p className={filterSectionLabelClass}>
            Precio
          </p>
          <Select
            value={localFilters.currency}
            onChange={(value) => setLocalFilters((prev) => ({ ...prev, currency: String(value) }))}
            options={PRICE_CURRENCY_OPTIONS}
            size="sm"
            className="mt-2"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Mín"
              value={localFilters.min_price}
              onChange={(event) => setLocalFilters((prev) => ({ ...prev, min_price: event.target.value }))}
              fieldSize="sm"
            />
            <Input
              type="number"
              placeholder="Máx"
              value={localFilters.max_price}
              onChange={(event) => setLocalFilters((prev) => ({ ...prev, max_price: event.target.value }))}
              fieldSize="sm"
            />
          </div>
        </div>

        <div>
          <p className={filterSectionLabelClass}>
            Superficie (m²)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Mín"
              value={localFilters.min_area}
              onChange={(event) => setLocalFilters((prev) => ({ ...prev, min_area: event.target.value }))}
              fieldSize="sm"
            />
            <Input
              type="number"
              placeholder="Máx"
              value={localFilters.max_area}
              onChange={(event) => setLocalFilters((prev) => ({ ...prev, max_area: event.target.value }))}
              fieldSize="sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>
            Habitaciones
          </p>
          <Select
            value={localFilters.min_bedrooms}
            onChange={(value) => setLocalFilters((prev) => ({ ...prev, min_bedrooms: String(value) }))}
            options={[
              { label: "Todas", value: "" },
              ...BEDROOM_OPTIONS.map((opt) => ({ label: `${opt.label} hab.`, value: opt.value })),
            ]}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>
            Baños
          </p>
          <Select
            value={localFilters.min_bathrooms}
            onChange={(value) => setLocalFilters((prev) => ({ ...prev, min_bathrooms: String(value) }))}
            options={[
              { label: "Todos", value: "" },
              ...BATHROOM_OPTIONS.map((opt) => ({ label: `${opt.label} baños`, value: opt.value })),
            ]}
            size="sm"
          />
        </div>

        <div className="pt-2 border-t border-border/60">
          <p className={`${filterSectionLabelClass} mb-3`}>
            Amenidades
          </p>
          <div className="flex flex-col gap-2">
            {amenityToggles.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-lighttext/80 dark:text-darktext/80">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary rounded border-border/60 text-primary focus:ring-border/60 focus:ring-2 focus:ring-offset-0"
                  checked={(localFilters as any)[item.key]}
                  onChange={(event) =>
                    setLocalFilters((prev) => ({ ...prev, [item.key]: event.target.checked }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <p className={`${filterSectionLabelClass} mb-3`}>
            Preferencias de vida
          </p>
          <div className="flex flex-col gap-2">
            {livingPreferenceToggles.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-lighttext/80 dark:text-darktext/80">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary rounded border-border/60 text-primary focus:ring-border/60 focus:ring-2 focus:ring-offset-0"
                  checked={(localFilters as any)[item.key]}
                  onChange={(event) =>
                    setLocalFilters((prev) => ({ ...prev, [item.key]: event.target.checked }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border/60 flex flex-col gap-3">
        <Button type="button" onClick={applyParams} className="w-full" shape="pill" size="sm">
          Aplicar filtros
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-semibold text-primary hover:text-[var(--color-primary-a80)]"
        >
          Limpiar filtros
        </button>
      </div>
    </aside>
  );
}

export default PropertyAdvancedFilters;
