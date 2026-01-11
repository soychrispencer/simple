import { useVerticalContext } from '@simple/ui';
import { dataURLToFile, fileToWebp } from './image';
import { v4 as uuid } from 'uuid';
import { useSupabase } from './supabase/useSupabase';
import { buildVehicleInsertPayload } from './builders/buildVehicleInsertPayload';
import { uploadVehicleImage, deleteVehicleImages } from './supabaseStorage';
import { logError } from './logger';
import { FREE_TIER_MAX_ACTIVE_LISTINGS, SUBSCRIPTION_PLANS } from '@simple/config';

const AUTOS_VERTICAL_KEYS = ['vehicles', 'autos'] as const;
const AUTOS_VERTICAL_SLUGS = [...AUTOS_VERTICAL_KEYS];

type PreparedImage = {
  url: string;
  is_primary: boolean;
  position: number;
};

let cachedAutosVerticalId: string | null = null;

async function resolveAutosVerticalId(supabase: any) {
  if (cachedAutosVerticalId) return cachedAutosVerticalId;
  const { data, error } = await supabase
    .from('verticals')
    .select('id, key')
    .in('key', AUTOS_VERTICAL_SLUGS)
    .limit(1);

  if (error || !data || data.length === 0) {
    throw error ?? new Error('No se encontró la vertical de autos.');
  }

  cachedAutosVerticalId = data[0].id;
  return cachedAutosVerticalId;
}

function orderImages(images: any[] = []) {
  const primaries = images.filter((img) => !!img?.main);
  if (primaries.length === 0) return images;
  const rest = images.filter((img) => !img?.main);
  return [...primaries, ...rest];
}

const REMOTE_PROTOCOLS = ['http://', 'https://'];

function isRemoteUrl(value?: string | null) {
  if (!value) return false;
  return REMOTE_PROTOCOLS.some((prefix) => value.startsWith(prefix));
}

const DOCUMENT_BUCKET = 'documents';
const DOCUMENT_ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB (bucket limit)

function sanitizeDocumentFileName(name: string): string {
  const base = (name || 'documento').trim().slice(0, 120);
  // Mantener simple/seguro para storage paths
  return base
    .replace(/\\/g, '_')
    .replace(/\//g, '_')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9._\-\s]/g, '')
    .trim()
    .replace(/\s/g, '_') || 'documento';
}

function extractDocumentPath(value: string): string {
  if (!value) return value;
  if (!isRemoteUrl(value)) return value;
  const match = value.match(new RegExp(`/${DOCUMENT_BUCKET}/(.+)$`));
  return match ? match[1] : value;
}

async function uploadDocumentFile(
  supabase: any,
  userId: string,
  listingId: string | null,
  file: File
): Promise<string | null> {
  try {
    if (!file) return null;
    if (!DOCUMENT_ALLOWED_MIME_TYPES.has(file.type)) return null;
    if (file.size > DOCUMENT_MAX_BYTES) return null;

    const id = uuid();
    const safeName = sanitizeDocumentFileName(file.name);
    const folder = listingId ? `${userId}/${listingId}` : `${userId}/tmp`;
    const path = `${folder}/${id}-${safeName}`;

    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

    if (error) {
      logError('uploadDocumentFile error', error);
      return null;
    }
    return data?.path ?? null;
  } catch (e) {
    logError('uploadDocumentFile error', e);
    return null;
  }
}

async function removeDocumentsFromStorage(supabase: any, paths: string[]) {
  if (!Array.isArray(paths) || paths.length === 0) return;
  try {
    await supabase.storage.from(DOCUMENT_BUCKET).remove(paths);
  } catch (e) {
    logError('removeDocumentsFromStorage error', e);
  }
}

function mergeMetadata(base: any, updates: any) {
  const merged = { ...(base || {}) };
  const nextEntries = Object.entries(updates || {});
  for (const [key, value] of nextEntries) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (key === 'location' || key === 'legacy')
    ) {
      merged[key] = { ...(merged[key] || {}), ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function attachMediaMetadata(metadata: any, images: PreparedImage[]) {
  const gallery = images.map((img) => img.url);
  return {
    ...(metadata || {}),
    gallery,
    main_image: gallery[0] || null,
  };
}

function normalizeContactValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function ensureOwnerPublicProfileId(supabase: any, userId: string) {
  // La BD tiene un CHECK (`listings_owner_check`) que exige `public_profile_id IS NOT NULL`.
  // Para no bloquear borradores/publicación temprana, garantizamos un public_profile “draft/no público”.
  const { data: activeProfile, error: activeError } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('owner_profile_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw activeError;
  }

  if (activeProfile?.id) return activeProfile.id as string;

  const { data: draftProfile, error: draftError } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('owner_profile_id', userId)
    .eq('status', 'draft')
    .limit(1)
    .maybeSingle();

  if (draftError) {
    throw draftError;
  }

  if (draftProfile?.id) return draftProfile.id as string;

  const slug = `u-${userId}`;
  const { data: created, error: createError } = await supabase
    .from('public_profiles')
    .insert({
      owner_profile_id: userId,
      slug,
      status: 'draft',
      is_public: false,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id as string;
}

async function resolveVehicleTypeId(supabase: any, state: any) {
  const directId = state?.vehicle?.type_id;
  if (directId) return directId;

  const ids = state?.vehicle?.type_ids;
  if (Array.isArray(ids) && ids.length > 0 && ids[0]) return ids[0];

  const slugOrCategory = state?.vehicle?.type_key;
  if (!slugOrCategory) return null;

  // 1) Intentar por slug exacto (cuando el wizard guarda el slug real)
  const bySlug = await supabase
    .from('vehicle_types')
    .select('id')
    .eq('slug', slugOrCategory)
    .maybeSingle();
  if (!bySlug.error && bySlug.data?.id) return bySlug.data.id;

  // 2) Fallback: cuando `type_key` es una categoría (car/truck/...) y no un slug
  let byCategory = await supabase
    .from('vehicle_types')
    .select('id')
    .eq('category', slugOrCategory)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  // En entornos donde aún no existe sort_order, repetimos sin ese ORDER.
  if (byCategory.error && /sort_order/i.test(byCategory.error.message)) {
    byCategory = await supabase
      .from('vehicle_types')
      .select('id')
      .eq('category', slugOrCategory)
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle();
  }

  if (!byCategory.error && byCategory.data?.id) return byCategory.data.id;
  return null;
}

export function useSubmitVehicle() {
  const supabase = useSupabase();
  const { user, currentCompany } = useVerticalContext('autos');

  async function uploadImage(fileOrData: File | { dataUrl: string }): Promise<string | null> {
    try {
      let file: File;
      if (fileOrData instanceof File) {
        file = fileOrData;

        // Asegura WebP antes de subir (reduce peso y homogeniza formatos en storage)
        if (file.type !== 'image/webp') {
          file = await fileToWebp(file, 2000, 2000, 0.9);
        }
      } else {
        file = dataURLToFile(fileOrData.dataUrl, 'image.webp');
      }
      const id = uuid();
      const fileName = `${id}.webp`;
      return await uploadVehicleImage(supabase, fileName, file);
    } catch (e) {
      logError('uploadImage error', e);
      return null;
    }
  }

  async function buildImageRows(imageSources: any[]): Promise<PreparedImage[]> {
    if (!Array.isArray(imageSources) || imageSources.length === 0) {
      return [];
    }

    const ordered = orderImages(imageSources);
    const final: PreparedImage[] = [];

    for (const item of ordered) {
      let remoteUrl: string | null = null;
      if (isRemoteUrl(item?.url)) {
        remoteUrl = item.url;
      } else if (item?.file) {
        remoteUrl = await uploadImage(item.file);
      } else if (item?.dataUrl) {
        remoteUrl = await uploadImage({ dataUrl: item.dataUrl });
      }

      if (!remoteUrl) {
        continue;
      }

      final.push({
        url: remoteUrl,
        is_primary: !!item?.main,
        position: final.length,
      });
    }

    if (final.length > 0 && !final.some((img) => img.is_primary)) {
      final[0].is_primary = true;
    }

    return final;
  }

  async function submit(state: any, images: any[]): Promise<{ id?: string; error?: any }> {
    if (!supabase) {
      return { error: new Error('Supabase no está disponible.') };
    }

    if (!user?.id) {
      return { error: new Error('Debes iniciar sesión para publicar vehículos.') };
    }

    if (!state?.listing_type) {
      return { error: new Error('Debes seleccionar un tipo de publicación.') };
    }

    const [verticalId, vehicleTypeId] = await Promise.all([
      resolveAutosVerticalId(supabase),
      resolveVehicleTypeId(supabase, state),
    ]);

    const { listing, vehicle } = buildVehicleInsertPayload({ state, images });

    const isPublishing = listing.status === 'published';

    const isEditing = !!state.vehicle_id;
    let listingId = state.vehicle_id as string | null;

    // Siempre garantizamos un `public_profile_id` por constraint de BD.
    const ownerPublicProfileId = await ensureOwnerPublicProfileId(supabase, user.id);

    const [{ data: publicProfile }, { data: profile }] = await Promise.all([
      supabase
        .from('public_profiles')
        .select('id, contact_email, contact_phone, whatsapp, status, is_public')
        .eq('id', ownerPublicProfileId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (isPublishing) {
      let subscriptionQuery = supabase
        .from('subscriptions')
        .select('status, subscription_plans(plan_key)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('vertical_id', verticalId);

      const { data: activeSub } = await subscriptionQuery.maybeSingle();
      const planSource = Array.isArray((activeSub as any)?.subscription_plans)
        ? (activeSub as any)?.subscription_plans?.[0]
        : (activeSub as any)?.subscription_plans;
      const planKey = String(planSource?.plan_key ?? 'free');

      const maxActiveListings = planKey === 'pro'
        ? SUBSCRIPTION_PLANS.pro.maxActiveListings
        : FREE_TIER_MAX_ACTIVE_LISTINGS;

      if (typeof maxActiveListings === 'number' && maxActiveListings > -1) {
        let countQuery = supabase
          .from('listings')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'published')
          .eq('vertical_id', verticalId);

        // No necesitamos los rows; solo el count.
        countQuery = countQuery.limit(1);

        if (listingId) {
          countQuery = countQuery.neq('id', listingId);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
          return { error: countError };
        }

        if (typeof count !== 'number') {
          return {
            error: new Error('No pudimos validar el límite de publicaciones. Intenta nuevamente.'),
          };
        }

        const activeCount = count;
        if (activeCount >= maxActiveListings) {
          return {
            error: new Error(
              planKey === 'pro'
                ? `Has alcanzado el límite de ${maxActiveListings} publicaciones activas.`
                : `En el plan gratuito puedes tener hasta ${maxActiveListings} publicación activa. Activa Pro para publicar más.`
            ),
          };
        }
      }
    }

    const contactEmail =
      normalizeContactValue(listing.contact_email) ??
      normalizeContactValue(publicProfile?.contact_email) ??
      normalizeContactValue(profile?.email) ??
      normalizeContactValue((user as any)?.email);

    const contactPhone =
      normalizeContactValue(listing.contact_phone) ??
      normalizeContactValue(publicProfile?.contact_phone) ??
      normalizeContactValue(profile?.phone) ??
      normalizeContactValue((user as any)?.phone);

    const contactWhatsapp =
      normalizeContactValue(listing.contact_whatsapp) ??
      normalizeContactValue(publicProfile?.whatsapp) ??
      normalizeContactValue((user as any)?.whatsapp) ??
      normalizeContactValue((user as any)?.profile?.whatsapp) ??
      normalizeContactValue((user as any)?.user_metadata?.whatsapp);

    const companyPublicProfile = (currentCompany?.company as any)?.public_profile;
    const hasAnyPublicPage = Boolean(companyPublicProfile || publicProfile?.is_public || publicProfile?.status === 'active');
    const contactSourceHint = hasAnyPublicPage ? 'en Mi Perfil o en tu página pública' : 'en Mi Perfil';

    if (isPublishing && !contactPhone) {
      return {
        error: new Error(`Debes agregar tu teléfono ${contactSourceHint} antes de publicar.`),
      };
    }

    if (isPublishing && !contactWhatsapp) {
      return {
        error: new Error(
          `Debes agregar tu WhatsApp ${contactSourceHint} antes de publicar. Puedes usar el mismo número que tu teléfono.`
        ),
      };
    }

    const publicProfileId: string = publicProfile?.id ?? ownerPublicProfileId;

    listing.vertical_id = verticalId;
    listing.public_profile_id = publicProfileId;
    listing.user_id = user.id;
    listing.contact_email = contactEmail;
    listing.contact_phone = contactPhone;
    listing.contact_whatsapp = contactWhatsapp;
    listing.metadata = mergeMetadata(listing.metadata, {
      owner_id: user.id,
      company_id: currentCompany?.companyId ?? null,
      scope: currentCompany?.companyId ? 'company' : 'individual',
    });

    // Asegurar que el tipo quede persistido también en metadata.
    // Esto ayuda a que la edición/VDP puedan recuperar el tipo aunque el join a listings_vehicles falle.
    const chosenTypeKey = state?.vehicle?.type_key ?? null;
    const chosenTypeId = vehicleTypeId ?? state?.vehicle?.type_id ?? (Array.isArray(state?.vehicle?.type_ids) ? state.vehicle.type_ids?.[0] : null) ?? null;
    if (chosenTypeKey || chosenTypeId) {
      listing.metadata = mergeMetadata(listing.metadata, {
        type_key: chosenTypeKey,
        type_id: chosenTypeId,
      });
    }

    // La tabla `listings` no expone `company_id` en todos los esquemas.
    // Guardamos el scope en `metadata.company_id` y evitamos enviar columnas desconocidas.
    if ('company_id' in listing) {
      delete (listing as any).company_id;
    }

    if (chosenTypeId) {
      vehicle.vehicle_type_id = chosenTypeId;
    }

    const preparedImages = await buildImageRows(images || []);
    listing.metadata = attachMediaMetadata(listing.metadata, preparedImages);

    // Documentos (opcional): subimos a bucket privado 'documents'.
    // Los docs privados NO deben filtrarse en `listings.document_urls` (public pages). Guardamos
    // la visibilidad por archivo en `public.documents.is_public`.
    const rawDocuments = (state?.media as any)?.documents;
    const documentItems: any[] = Array.isArray(rawDocuments) ? rawDocuments : [];
    const desiredDocuments = documentItems
      .filter((it) => it && typeof it === 'object')
      .map((it) => ({
        id: it.id,
        record_id: typeof it.record_id === 'string' ? it.record_id : null,
        name: typeof it.name === 'string' ? it.name : 'documento',
        type: typeof it.type === 'string' ? it.type : '',
        size: typeof it.size === 'number' ? it.size : 0,
        is_public: !!it.is_public,
        path: typeof it.path === 'string' ? extractDocumentPath(it.path) : (typeof it.url === 'string' ? extractDocumentPath(it.url) : null),
        file: it.file instanceof File ? (it.file as File) : null,
      }));

    // Solo guardamos públicos en listings.document_urls (para no filtrar privados)
    (listing as any).document_urls = desiredDocuments
      .filter((d) => d.is_public)
      .map((d) => d.path)
      .filter(Boolean);

    try {
      if (isEditing && listingId) {
        const { data: existingListing, error: fetchListingError } = await supabase
          .from('listings')
          .select('metadata, published_at, views, created_at, status, document_urls')
          .eq('id', listingId)
          .maybeSingle();

        if (fetchListingError) {
          throw fetchListingError;
        }

        listing.metadata = attachMediaMetadata(
          mergeMetadata(existingListing?.metadata || {}, listing.metadata),
          preparedImages
        );

        const { data: existingImages } = await supabase
          .from('images')
          .select('url')
          .eq('listing_id', listingId);

        const existingUrls = (existingImages || []).map((img: any) => img.url);
        const nextUrls = preparedImages.map((img) => img.url);
        const removedUrls = existingUrls.filter((url: string) => !nextUrls.includes(url));

        // Documentos: sincronizar tabla public.documents
        const { data: existingDocs } = await supabase
          .from('documents')
          .select('id, url, name, file_type, file_size, is_public')
          .eq('listing_id', listingId);

        const existingRows: any[] = Array.isArray(existingDocs) ? existingDocs : [];
        const existingById = new Map(existingRows.map((d) => [String(d.id), d] as const));
        const desiredIds = new Set(desiredDocuments.map((d) => d.record_id).filter(Boolean) as string[]);

        const removedRows = existingRows.filter((d) => !desiredIds.has(String(d.id)));
        if (removedRows.length > 0) {
          const removedPaths = removedRows
            .map((d) => (typeof d.url === 'string' ? extractDocumentPath(d.url) : null))
            .filter(Boolean) as string[];
          await supabase.from('documents').delete().in('id', removedRows.map((d) => d.id));
          await removeDocumentsFromStorage(supabase, removedPaths);
        }

        // Updates de visibilidad/nombre para existentes
        for (const d of desiredDocuments) {
          if (!d.record_id) continue;
          const row = existingById.get(d.record_id);
          if (!row) continue;
          const nextIsPublic = !!d.is_public;
          const nextName = d.name;
          const changed = row.is_public !== nextIsPublic || (typeof row.name === 'string' && row.name !== nextName);
          if (changed) {
            await supabase.from('documents').update({ is_public: nextIsPublic, name: nextName }).eq('id', d.record_id);
          }
        }

        // Inserts de nuevos documentos (con file)
        for (const d of desiredDocuments) {
          if (d.record_id) continue;
          if (!d.file) continue;
          const uploaded = await uploadDocumentFile(supabase, user.id, listingId, d.file);
          if (!uploaded) continue;
          await supabase.from('documents').insert({
            listing_id: listingId,
            user_id: user.id,
            name: d.name,
            url: uploaded,
            file_type: d.type || null,
            file_size: d.size || null,
            is_public: !!d.is_public,
          });
        }

        // Recalcular públicos desde DB (fuente de verdad)
        const { data: publicDocs } = await supabase
          .from('documents')
          .select('url')
          .eq('listing_id', listingId)
          .eq('is_public', true);
        const publicPaths = (publicDocs || [])
          .map((r: any) => (typeof r.url === 'string' ? extractDocumentPath(r.url) : null))
          .filter(Boolean);
        (listing as any).document_urls = publicPaths;

        const updatePayload = {
          ...listing,
          created_at: existingListing?.created_at ?? listing.created_at,
          views: existingListing?.views ?? listing.views ?? 0,
          updated_at: new Date().toISOString(),
          published_at:
            listing.status === 'published'
              ? existingListing?.published_at ?? new Date().toISOString()
              : null,
        };

        const updateResult = await supabase
          .from('listings')
          .update(updatePayload)
          .eq('id', listingId)
          .select('id')
          .single();

        if (updateResult.error) {
          throw updateResult.error;
        }

        const vehiclePayload = {
          ...vehicle,
          listing_id: listingId,
        };

        const { error: vehicleError } = await supabase
          .from('listings_vehicles')
          .upsert(vehiclePayload, { onConflict: 'listing_id' });

        if (vehicleError) {
          throw vehicleError;
        }

        await supabase.from('images').delete().eq('listing_id', listingId);
        if (preparedImages.length > 0) {
          await supabase.from('images').insert(
            preparedImages.map((img, idx) => ({
              listing_id: listingId,
              url: img.url,
              is_primary: idx === 0 || img.is_primary,
              position: idx,
              alt_text: state.basic?.title || null,
            }))
          );
        }

        if (removedUrls.length > 0) {
          await deleteVehicleImages(supabase, removedUrls);
        }

      } else {
        const insertResult = await supabase
          .from('listings')
          .insert(listing)
          .select('id')
          .single();

        if (insertResult.error) {
          throw insertResult.error;
        }

        listingId = insertResult.data.id;

        // Insert de documentos nuevos
        for (const d of desiredDocuments) {
          if (!d.file) continue;
          const uploaded = await uploadDocumentFile(supabase, user.id, listingId, d.file);
          if (!uploaded) continue;
          await supabase.from('documents').insert({
            listing_id: listingId,
            user_id: user.id,
            name: d.name,
            url: uploaded,
            file_type: d.type || null,
            file_size: d.size || null,
            is_public: !!d.is_public,
          });
        }

        // Guardar solo paths públicos en listings.document_urls
        const { data: publicDocs } = await supabase
          .from('documents')
          .select('url')
          .eq('listing_id', listingId)
          .eq('is_public', true);
        const publicPaths = (publicDocs || [])
          .map((r: any) => (typeof r.url === 'string' ? extractDocumentPath(r.url) : null))
          .filter(Boolean);
        if (publicPaths.length > 0) {
          await supabase.from('listings').update({ document_urls: publicPaths }).eq('id', listingId);
        }

        const vehiclePayload = {
          ...vehicle,
          listing_id: listingId,
        };

        const { error: vehicleInsertError } = await supabase
          .from('listings_vehicles')
          .insert(vehiclePayload);

        if (vehicleInsertError) {
          throw vehicleInsertError;
        }

        if (preparedImages.length > 0) {
          await supabase.from('images').insert(
            preparedImages.map((img, idx) => ({
              listing_id: listingId,
              url: img.url,
              is_primary: idx === 0 || img.is_primary,
              position: idx,
              alt_text: state.basic?.title || null,
            }))
          );
        }

        await supabase
          .from('listing_metrics')
          .upsert({ listing_id: listingId, views: 0, clicks: 0 }, { onConflict: 'listing_id' });
      }

      return { id: listingId as string };
    } catch (error) {
      logError('[submitVehicle] Error guardando publicación', error);
      return { error };
    }
  }

  return { submit };
}


