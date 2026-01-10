"use client";
import { useCallback } from "react";
import { useSupabase, useVerticalContext } from "@simple/ui";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dataURLToFile } from "@/lib/media";
import type { WizardState, PropertyWizardData, WizardImage } from "@/components/property-wizard/context/WizardContext";
import { logError } from "@/lib/logger";

const PROPERTY_BUCKET = "properties";
const VERTICAL_SLUGS = ["properties", "propiedades"] as const;

type PreparedImage = {
  url: string;
  is_primary: boolean;
  position: number;
};

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function resolveVerticalId(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("verticals")
    .select("id")
    .in("key", Array.from(VERTICAL_SLUGS))
    .limit(1)
    .single();
  if (error || !data) throw error ?? new Error("No encontramos la vertical de propiedades");
  return data.id as string;
}

function isRemoteUrl(value?: string | null) {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://");
}

async function uploadPropertyImage(supabase: SupabaseClient, file: File) {
  const fileName = `${randomId()}-${file.name || "property"}`;
  const { data, error } = await supabase.storage
    .from(PROPERTY_BUCKET)
    .upload(fileName, file, { upsert: true, contentType: file.type || "image/webp" });
  if (error || !data) {
    logError("[uploadPropertyImage]", error);
    return null;
  }
  return supabase.storage.from(PROPERTY_BUCKET).getPublicUrl(data.path).data.publicUrl;
}

function extractStoragePath(url: string) {
  try {
    const parts = url.split(`/${PROPERTY_BUCKET}/`);
    return parts[1] ?? null;
  } catch {
    return null;
  }
}

async function deletePropertyImages(supabase: SupabaseClient, urls: string[]) {
  const paths = urls
    .map((url) => extractStoragePath(url))
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;
  await supabase.storage.from(PROPERTY_BUCKET).remove(paths);
}

async function buildImageRows(supabase: SupabaseClient, images: WizardImage[]): Promise<PreparedImage[]> {
  if (!Array.isArray(images) || images.length === 0) return [];
  const ordered = images.slice().sort((a, b) => {
    if (!!a.main === !!b.main) return 0;
    return a.main ? -1 : 1;
  });
  const results: PreparedImage[] = [];
  for (const item of ordered) {
    const existingRemoteUrl: string | null = item.remoteUrl ?? null;
    const fallbackRemoteUrl: string | null = isRemoteUrl(item.url) ? (item.url as string) : null;
    let remoteUrl: string | null = existingRemoteUrl ?? fallbackRemoteUrl;
    if (!remoteUrl && item.file) {
      remoteUrl = await uploadPropertyImage(supabase, item.file);
    } else if (!remoteUrl && item.dataUrl) {
      const file = dataURLToFile(item.dataUrl, `${randomId()}.webp`);
      remoteUrl = await uploadPropertyImage(supabase, file);
    }
    if (!remoteUrl) continue;
    results.push({ url: remoteUrl, is_primary: !!item.main, position: results.length });
  }
  if (results.length > 0 && !results.some((img) => img.is_primary)) {
    results[0].is_primary = true;
  }
  return results;
}

function buildFeatureArrays(amenities: PropertyWizardData["amenities"]) {
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

function buildMetadata(state: WizardState, preparedImages: PreparedImage[]) {
  const gallery = preparedImages.map((img) => img.url);
  return {
    location: {
      country: state.data.location.country,
      region_id: state.data.location.region_id,
      region_name: state.data.location.region_name,
      commune_id: state.data.location.commune_id,
      commune_name: state.data.location.commune_name,
      address: state.data.location.address,
      latitude: state.data.location.latitude,
      longitude: state.data.location.longitude,
    },
    rent_price: state.data.pricing.rent_price,
    rent_period: state.data.pricing.rent_period,
    features: state.data.features,
    gallery,
    main_image: gallery[0] || null,
    amenities: state.data.amenities,
  };
}

function mergeMetadata(base: Record<string, any> | null | undefined, updates: Record<string, any>) {
  const out: Record<string, any> = { ...(base || {}) };
  Object.entries(updates || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = { ...(out[key] || {}), ...value };
    } else {
      out[key] = value;
    }
  });
  return out;
}

function buildListingPayload(params: {
  state: WizardState;
  verticalId: string;
  userId: string;
  companyId: string | null;
  preparedImages: PreparedImage[];
  publishNow: boolean;
}) {
  const { state, verticalId, userId, preparedImages, publishNow } = params;
  const listingType = state.data.type.listing_type ?? "sale";
  const listingPrice = listingType === "rent" ? state.data.pricing.rent_price : state.data.pricing.price;
  const now = new Date().toISOString();
  const metadata = buildMetadata(state, preparedImages);
  const payload = {
    vertical_id: verticalId,
    user_id: userId,
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
    metadata,
    video_url: state.data.media.video_url ?? null,
    created_at: now,
    updated_at: now,
    published_at: publishNow ? now : null,
  };
  return payload;
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
    amenities: amenityFlags,
  };
}

export function useSubmitProperty() {
  const supabase = useSupabase();
  const { user, currentCompany } = useVerticalContext("properties");

  const submit = useCallback(
    async (state: WizardState, publishOverride?: boolean) => {
      if (!supabase) return { error: new Error("Supabase no está disponible") };
      if (!user?.id) return { error: new Error("Debes iniciar sesión para publicar") };
      if (!state.data.type.listing_type) return { error: new Error("Selecciona el tipo de publicación") };

      try {
        const [verticalId, preparedImages] = await Promise.all([
          resolveVerticalId(supabase),
          buildImageRows(supabase, state.data.media.images),
        ]);
        const publishNow = typeof publishOverride === "boolean" ? publishOverride : state.data.review.publish_now;
        const listingPayload = buildListingPayload({
          state,
          verticalId,
          userId: user.id,
          companyId: currentCompany?.companyId ?? null,
          preparedImages,
          publishNow,
        });
        const detailPayload = buildDetailPayload(state);
        const isEditing = Boolean(state.propertyId);
        let listingId = state.propertyId as string | null;

        if (isEditing && listingId) {
          const { data: existing, error } = await supabase
            .from("listings")
            .select("metadata, created_at, published_at")
            .eq("id", listingId)
            .maybeSingle();
          if (error || !existing) throw error ?? new Error("No encontramos la publicación");
          listingPayload.metadata = mergeMetadata(existing.metadata, listingPayload.metadata) as any;
          listingPayload.created_at = existing.created_at ?? listingPayload.created_at;
          listingPayload.published_at = publishNow
            ? existing.published_at ?? new Date().toISOString()
            : null;

          const { data: currentImages } = await supabase.from("images").select("url").eq("listing_id", listingId);
          const currentUrls = (currentImages || []).map((img) => img.url);

          const updateListing = await supabase
            .from("listings")
            .update(listingPayload)
            .eq("id", listingId)
            .select("id")
            .single();
          if (updateListing.error) throw updateListing.error;

          const detailResult = await supabase
            .from("listings_properties")
            .upsert({ ...detailPayload, listing_id: listingId }, { onConflict: "listing_id" });
          if (detailResult.error) throw detailResult.error;

          await supabase.from("images").delete().eq("listing_id", listingId);
          if (preparedImages.length > 0) {
            await supabase.from("images").insert(
              preparedImages.map((img, index) => ({
                listing_id: listingId,
                url: img.url,
                is_primary: index === 0 || img.is_primary,
                position: index,
              }))
            );
          }

          const nextUrls = preparedImages.map((img) => img.url);
          const removed = currentUrls.filter((url) => !nextUrls.includes(url));
          if (removed.length > 0) await deletePropertyImages(supabase, removed);
        } else {
          const insert = await supabase.from("listings").insert(listingPayload).select("id").single();
          if (insert.error || !insert.data) throw insert.error ?? new Error("No pudimos crear la publicación");
          listingId = insert.data.id;

          const detailInsert = await supabase
            .from("listings_properties")
            .insert({ ...detailPayload, listing_id: listingId });
          if (detailInsert.error) throw detailInsert.error;

          if (preparedImages.length > 0) {
            await supabase.from("images").insert(
              preparedImages.map((img, index) => ({
                listing_id: listingId,
                url: img.url,
                is_primary: index === 0 || img.is_primary,
                position: index,
              }))
            );
          }

          await supabase
            .from("listing_metrics")
            .upsert(
              { listing_id: listingId, views: 0, clicks: 0, favorites: 0, shares: 0 },
              { onConflict: "listing_id" }
            );
        }

        return { id: listingId };
      } catch (error: any) {
        logError("[useSubmitProperty]", error);
        return { error };
      }
    },
    [currentCompany?.companyId, supabase, user?.id]
  );

  return { submit };
}
