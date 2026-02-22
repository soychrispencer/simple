"use client";
import { useCallback } from "react";
import { useVerticalContext } from "@simple/ui";
import { useAuth } from "@simple/auth";
import { dataURLToFile } from "@/lib/media";
import type { WizardState, WizardImage } from "@/components/property-wizard/context/WizardContext";
import { logError } from "@/lib/logger";
import { isSimpleApiWriteEnabled } from "@/lib/simpleApiListings";
import { queuePublish, upsertListing } from "@simple/sdk";

function isRemoteUrl(value?: string | null) {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://");
}

async function uploadImageViaApi(file: File): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "properties");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: form
    });

    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.url ? String(payload.url) : null;
  } catch {
    return null;
  }
}

async function buildImageRows(images: WizardImage[]) {
  if (!Array.isArray(images) || images.length === 0) return [] as Array<{ url: string; is_primary: boolean; position: number }>;

  const ordered = images.slice().sort((a, b) => {
    if (!!a.main === !!b.main) return 0;
    return a.main ? -1 : 1;
  });

  const rows: Array<{ url: string; is_primary: boolean; position: number }> = [];
  for (const item of ordered) {
    let remoteUrl: string | null = null;

    if (isRemoteUrl(item.remoteUrl)) {
      remoteUrl = item.remoteUrl as string;
    } else if (isRemoteUrl(item.url)) {
      remoteUrl = item.url as string;
    } else if (item.file instanceof File) {
      remoteUrl = await uploadImageViaApi(item.file);
    } else if (item.dataUrl) {
      const file = dataURLToFile(item.dataUrl, `property-${Date.now()}.webp`);
      remoteUrl = await uploadImageViaApi(file);
    }

    if (!remoteUrl) continue;
    rows.push({ url: remoteUrl, is_primary: !!item.main, position: rows.length });
  }

  if (rows.length > 0 && !rows.some((item) => item.is_primary)) {
    rows[0]!.is_primary = true;
  }

  return rows;
}

function buildFeatureArrays(amenities: WizardState["data"]["amenities"]) {
  const features: string[] = [];
  if (amenities.has_pool) features.push("pool");
  if (amenities.has_garden) features.push("garden");
  if (amenities.has_balcony) features.push("balcony");
  if (amenities.has_terrace) features.push("terrace");

  const amenityFlags: string[] = [];
  if (amenities.has_elevator) amenityFlags.push("elevator");
  if (amenities.has_gym) amenityFlags.push("gym");
  if (amenities.has_security) amenityFlags.push("security");

  return { features, amenityFlags };
}

function buildMetadata(state: WizardState, preparedImages: Array<{ url: string }>) {
  const gallery = preparedImages.map((item) => item.url);
  return {
    location: {
      country: state.data.location.country,
      region_id: state.data.location.region_id,
      region_name: state.data.location.region_name,
      commune_id: state.data.location.commune_id,
      commune_name: state.data.location.commune_name,
      address: state.data.location.address,
      latitude: state.data.location.latitude,
      longitude: state.data.location.longitude
    },
    rent_price: state.data.pricing.rent_price,
    rent_period: state.data.pricing.rent_period,
    features: state.data.features,
    gallery,
    main_image: gallery[0] || null,
    amenities: state.data.amenities
  };
}

function buildDetailPayload(state: WizardState) {
  const { features, amenityFlags } = buildFeatureArrays(state.data.amenities);
  return {
    property_type: state.data.type.property_type,
    operation_type: state.data.type.listing_type,
    bedrooms: state.data.features.bedrooms,
    bathrooms: state.data.features.bathrooms,
    parking_spaces: state.data.features.parking_spaces,
    total_area: state.data.features.area_m2,
    built_area: state.data.features.area_built_m2,
    land_area: state.data.features.land_area,
    floor: state.data.features.floor,
    building_floors: state.data.features.total_floors,
    year_built: state.data.features.year_built,
    furnished: state.data.amenities.is_furnished,
    pet_friendly: state.data.amenities.allows_pets,
    features,
    amenities: amenityFlags
  };
}

export function useSubmitProperty() {
  const { user, currentCompany } = useVerticalContext("properties");
  const { session } = useAuth();

  const submit = useCallback(
    async (state: WizardState, publishOverride?: boolean) => {
      if (!user?.id) {
        return { error: new Error("Debes iniciar sesión para publicar") };
      }

      if (!isSimpleApiWriteEnabled()) {
        return { error: new Error("Las escrituras del backend principal están deshabilitadas") };
      }

      const accessToken = String((session as any)?.access_token || "").trim();
      if (!accessToken) {
        return { error: new Error("No hay sesión activa") };
      }

      if (!state.data.type.listing_type) {
        return { error: new Error("Selecciona el tipo de publicación") };
      }

      if (state.data.type.listing_type === "auction") {
        return { error: new Error("Subastas está temporalmente deshabilitado en SimplePropiedades") };
      }

      try {
        const preparedImages = await buildImageRows(state.data.media.images);
        if (preparedImages.length === 0) {
          return { error: new Error("Debes subir al menos una imagen válida") };
        }

        const publishNow =
          typeof publishOverride === "boolean" ? publishOverride : state.data.review.publish_now;

        const listingType = state.data.type.listing_type ?? "sale";
        const listingPrice = listingType === "rent" ? state.data.pricing.rent_price : state.data.pricing.price;
        const metadata = buildMetadata(state, preparedImages);

        const listingPayload = {
          listing_type: listingType,
          title: state.data.basic.title.trim(),
          description: state.data.basic.description || null,
          price: listingPrice ?? null,
          currency: state.data.pricing.currency,
          status: publishNow ? "published" : "draft",
          visibility: state.data.review.visibility,
          is_featured: state.data.review.visibility === "featured",
          region_id: state.data.location.region_id,
          commune_id: state.data.location.commune_id,
          tags: [],
          metadata: {
            ...metadata,
            owner_id: user.id,
            company_id: currentCompany?.companyId ?? null,
            scope: currentCompany?.companyId ? "company" : "individual"
          },
          video_url: state.data.media.video_url ?? null
        };

        const detailPayload = buildDetailPayload(state);

        const payload = await upsertListing({
          accessToken,
          vertical: "properties",
          listingId: state.propertyId || undefined,
          listing: listingPayload,
          detail: detailPayload,
          images: preparedImages,
          replaceImages: true
        });

        if (publishNow) {
          void queuePublish({ listingId: String(payload.id), vertical: "properties", reason: "new_publish" });
        }

        return { id: String(payload.id) };
      } catch (error: any) {
        logError("[useSubmitProperty]", error);
        return { error };
      }
    },
    [currentCompany?.companyId, session, user?.id]
  );

  return { submit };
}
