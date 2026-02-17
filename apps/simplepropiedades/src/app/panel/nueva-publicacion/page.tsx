"use client";
import React from "react";
import { PanelPageLayout, Button } from "@simple/ui";
import { PropertyWizard } from "@/components/property-wizard/PropertyWizard";
import {
  WizardProvider,
  useWizard,
  type PropertyWizardData,
  type WizardState,
} from "@/components/property-wizard/context/WizardContext";
import { loadPropertyForWizard } from "@/lib/loadPropertyForWizard";
import { logError } from "@/lib/logger";

export default function NuevaPublicacion() {
  return (
    <WizardProvider>
      <WizardScreen />
    </WizardProvider>
  );
}

function WizardScreen() {
  const { state, reset, forceSave, computeProgress } = useWizard();

  return (
    <PanelPageLayout
      header={{
        title: state.propertyId ? "Editar propiedad" : "Nueva publicacion",
        description: "Completa los pasos para publicar en SimplePropiedades",
      }}
    >
      <div className="card-surface rounded-panel border border-border/60 px-4 py-3 mb-4 flex flex-wrap items-center gap-3 text-sm">
        <AutoSaveStatus iso={state.meta.lastAutoSave} />
        <span className="text-xs text-lighttext/60 dark:text-darktext/60">Progreso: {computeProgress()}%</span>
        <div className="flex items-center gap-2">
          <Button variant="neutral" size="sm" onClick={forceSave}>
            Guardar ahora
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reiniciar
          </Button>
        </div>
      </div>
      <Hydrator />
      <PropertyWizard />
    </PanelPageLayout>
  );
}

function Hydrator() {
  const { state, replaceData, setPropertyId } = useWizard();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id || state.propertyId === id) return;
    const listingId = id;
    let cancelled = false;

    async function run() {
      try {
        const listing = await loadPropertyForWizard(listingId);
        if (!listing || cancelled) return;
        const mapped = mapListingToWizardData(listing);
        replaceData(mapped, listingId);
        setPropertyId(listingId);
      } catch (error) {
        logError("[Hydrator] No pudimos cargar la publicación", error);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [replaceData, setPropertyId, state.propertyId]);

  return null;
}

function mapListingToWizardData(row: any): Partial<PropertyWizardData> {
  const detailSource = Array.isArray(row.listings_properties)
    ? row.listings_properties[0]
    : row.listings_properties;
  const detail = detailSource || {};
  const metadata = row.metadata || {};
  const featuresList = Array.isArray(detail.features) ? detail.features : [];
  const amenitiesList = Array.isArray(detail.amenities) ? detail.amenities : [];
  const orderedImages = (row.images || [])
    .slice()
    .sort((a: any, b: any) => {
      if (!!a.is_primary === !!b.is_primary) return (a.position ?? 0) - (b.position ?? 0);
      return a.is_primary ? -1 : 1;
    })
    .map((img: any) => ({ id: img.id, remoteUrl: img.url, url: img.url, main: !!img.is_primary }));

  return {
    type: {
      property_type: (detail.property_type as PropertyWizardData["type"]["property_type"]) ?? null,
      listing_type: (row.listing_type as PropertyWizardData["type"]["listing_type"]) ?? null,
    },
    basic: {
      title: row.title ?? "",
      description: row.description ?? "",
    },
    features: {
      area_m2: detail.total_area ? Number(detail.total_area) : null,
      area_built_m2: detail.built_area ? Number(detail.built_area) : null,
      land_area: detail.land_area ? Number(detail.land_area) : null,
      bedrooms: detail.bedrooms ?? null,
      bathrooms: detail.bathrooms ?? null,
      parking_spaces: detail.parking_spaces ?? null,
      floor: detail.floor ?? null,
      total_floors: detail.building_floors ?? null,
      year_built: detail.year_built ?? null,
    },
    amenities: {
      has_pool: featuresList.includes("pool"),
      has_garden: featuresList.includes("garden"),
      has_balcony: featuresList.includes("balcony"),
      has_terrace: featuresList.includes("terrace"),
      has_elevator: amenitiesList.includes("elevator"),
      has_gym: amenitiesList.includes("gym"),
      has_security: amenitiesList.includes("security"),
      is_furnished: !!detail.furnished,
      allows_pets: !!detail.pet_friendly,
    },
    pricing: {
      price: row.listing_type === "rent" ? null : row.price ?? null,
      rent_price: row.listing_type === "rent" ? row.price ?? null : detail.rent_price ?? null,
      currency: row.currency ?? "CLP",
      rent_period: metadata?.rent_period ?? null,
    },
    location: {
      country: "Chile",
      region_id: row.region_id ?? null,
      commune_id: row.commune_id ?? null,
      address: metadata?.location?.address ?? row.location ?? "",
      latitude: metadata?.location?.latitude ?? null,
      longitude: metadata?.location?.longitude ?? null,
      region_name: Array.isArray(row.regions) ? row.regions[0]?.name ?? null : row.regions?.name ?? null,
      commune_name: Array.isArray(row.communes) ? row.communes[0]?.name ?? null : row.communes?.name ?? null,
    },
    media: {
      images: orderedImages,
      video_url: row.video_url ?? null,
      virtual_tour_url: metadata?.virtual_tour_url ?? null,
    },
    review: {
      visibility: row.visibility ?? "normal",
      publish_now: row.status === "published",
      notes: metadata?.notes ?? "",
    },
  };
}

function AutoSaveStatus({ iso }: { iso: WizardState["meta"]["lastAutoSave"] }) {
  const [label, setLabel] = React.useState("Sin auto-guardado");

  React.useEffect(() => {
    function compute() {
      if (!iso) {
        setLabel("Sin auto-guardado");
        return;
      }
      const diff = Date.now() - new Date(iso).getTime();
      if (diff < 5000) {
        setLabel("Guardado hace instantes");
        return;
      }
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) {
        setLabel("Guardado hace menos de 1m");
        return;
      }
      if (minutes < 60) {
        setLabel(`Guardado hace ${minutes}m`);
        return;
      }
      const hours = Math.floor(minutes / 60);
      setLabel(`Guardado hace ${hours}h`);
    }

    compute();
    const id = window.setInterval(compute, 5000);
    return () => window.clearInterval(id);
  }, [iso]);

  return <span className="text-xs text-lighttext/60 dark:text-darktext/60">{label}</span>;
}
