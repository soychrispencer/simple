import { useVerticalContext } from '@simple/ui';
import { dataURLToFile, fileToWebp } from './image';
import { v4 as uuid } from 'uuid';
import { buildVehicleInsertPayload } from './builders/buildVehicleInsertPayload';
import { uploadVehicleImage } from './storageMedia';
import { logError, logWarn } from './logger';
import {
  isSimpleApiStrictWriteEnabled,
  isSimpleApiWriteEnabled,
} from './simpleApiListings';
import { queuePublish, upsertListing } from '@simple/sdk';

type PreparedImage = {
  url: string;
  is_primary: boolean;
  position: number;
};

type PreparedDocument = {
  record_id: string | null;
  name: string;
  type: string;
  size: number;
  is_public: boolean;
  path: string | null;
  file: File | null;
};

const REMOTE_PROTOCOLS = ['http://', 'https://'];
const DOCUMENT_ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

function isRemoteUrl(value?: string | null) {
  if (!value) return false;
  return REMOTE_PROTOCOLS.some((prefix) => value.startsWith(prefix));
}

function orderImages(images: any[] = []) {
  const primaries = images.filter((img) => !!img?.main);
  if (primaries.length === 0) return images;
  const rest = images.filter((img) => !img?.main);
  return [...primaries, ...rest];
}

function extractDocumentPath(value: string): string {
  if (!value) return value;
  if (!isRemoteUrl(value)) return value;
  const match = value.match(/\/documents\/(.+)$/);
  return match ? match[1] : value;
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

function parseSdkLimitError(raw: string): Error | null {
  const normalized = raw.toLowerCase();
  if (normalized.includes('publish_limit_exceeded')) {
    const limit = Number(raw.split(':')[1]);
    if (Number.isFinite(limit) && limit > -1) {
      return new Error(`Has alcanzado el límite de ${limit} publicaciones activas para tu plan.`);
    }
    return new Error('Has alcanzado el límite de publicaciones activas para tu plan.');
  }
  if (normalized.includes('create_limit_exceeded')) {
    const limit = Number(raw.split(':')[1]);
    if (Number.isFinite(limit) && limit > -1) {
      return new Error(`Has alcanzado el límite de ${limit} publicaciones totales para tu plan.`);
    }
    return new Error('Has alcanzado el límite de publicaciones para tu plan.');
  }
  return null;
}

async function uploadDocumentFile(userId: string, listingId: string | null, file: File): Promise<string | null> {
  try {
    if (!userId) return null;
    if (!file) return null;
    if (!DOCUMENT_ALLOWED_MIME_TYPES.has(file.type)) return null;
    if (file.size > DOCUMENT_MAX_BYTES) return null;

    const form = new FormData();
    form.append('file', file);
    const folder = listingId ? `documents/${userId}/${listingId}` : `documents/${userId}/tmp`;
    form.append('folder', folder);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: form,
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null as any);
    const nextPath = typeof payload?.path === 'string'
      ? payload.path
      : typeof payload?.url === 'string'
      ? payload.url
      : null;
    return nextPath;
  } catch (e) {
    logError('uploadDocumentFile error', e);
    return null;
  }
}

function getClientAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('simple_access_token');
    if (raw && raw.trim()) return raw.trim();
  } catch {
    // ignore
  }
  return null;
}

async function submitVehicleViaSimpleApi(params: {
  listingId: string | null;
  listingPayload: Record<string, unknown>;
  vehiclePayload: Record<string, unknown>;
  images: PreparedImage[];
  documents: Array<{
    record_id?: string;
    name: string;
    type?: string | null;
    size?: number | null;
    is_public?: boolean;
    path: string;
  }>;
}) {
  const { listingId, listingPayload, vehiclePayload, images, documents } = params;

  const accessToken = getClientAccessToken();
  if (!accessToken) {
    throw new Error('No hay sesión activa para autorizar simple-api.');
  }

  const payload = await upsertListing({
    accessToken,
    vertical: 'autos',
    listingId: listingId ?? undefined,
    listing: listingPayload,
    detail: vehiclePayload,
    images,
    documents,
    replaceImages: true,
  });

  const createdListingId = String(payload.id);
  const shouldQueuePublish = String((listingPayload as any)?.status || '').toLowerCase() === 'published';
  if (shouldQueuePublish) {
    void queuePublish({ listingId: createdListingId, vertical: 'autos', reason: 'new_publish' }).catch((err) => {
      logWarn('simple-api publish queue enqueue failed (autos)', err);
    });
  }

  return createdListingId;
}

export function useSubmitVehicle() {
  const { user, currentCompany } = useVerticalContext('autos');

  async function uploadImage(fileOrData: File | { dataUrl: string }): Promise<string | null> {
    try {
      let file: File;
      if (fileOrData instanceof File) {
        file = fileOrData;
        if (file.type !== 'image/webp') {
          file = await fileToWebp(file, 2000, 2000, 0.9);
        }
      } else {
        file = dataURLToFile(fileOrData.dataUrl, 'image.webp');
      }
      const id = uuid();
      const fileName = `${id}.webp`;
      return await uploadVehicleImage(null, fileName, file);
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
    if (!isSimpleApiWriteEnabled()) {
      return { error: new Error('Escrituras en simple-api deshabilitadas.') };
    }

    if (!user?.id) {
      return { error: new Error('Debes iniciar sesión para publicar vehículos.') };
    }

    if (!state?.listing_type) {
      return { error: new Error('Debes seleccionar un tipo de publicación.') };
    }

    const { listing, vehicle } = buildVehicleInsertPayload({ state, images });

    const isPublishing = listing.status === 'published';
    const listingId = state.vehicle_id ? String(state.vehicle_id) : null;

    const contactEmail =
      normalizeContactValue(listing.contact_email) ??
      normalizeContactValue((user as any)?.email);

    const contactPhone =
      normalizeContactValue(listing.contact_phone) ??
      normalizeContactValue((user as any)?.phone);

    const contactWhatsapp =
      normalizeContactValue(listing.contact_whatsapp) ??
      normalizeContactValue((user as any)?.whatsapp) ??
      normalizeContactValue((user as any)?.profile?.whatsapp) ??
      normalizeContactValue((user as any)?.user_metadata?.whatsapp);

    const companyPublicProfile = (currentCompany?.company as any)?.public_profile;
    const hasAnyPublicPage = Boolean(companyPublicProfile);
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

    listing.contact_email = contactEmail;
    listing.contact_phone = contactPhone;
    listing.contact_whatsapp = contactWhatsapp;
    listing.metadata = mergeMetadata(listing.metadata, {
      owner_id: user.id,
      company_id: currentCompany?.companyId ?? null,
      scope: currentCompany?.companyId ? 'company' : 'individual',
    });

    const chosenTypeKey = state?.vehicle?.type_key ?? null;
    const chosenTypeId =
      state?.vehicle?.type_id ??
      (Array.isArray(state?.vehicle?.type_ids) ? state.vehicle.type_ids?.[0] : null) ??
      null;
    if (chosenTypeKey || chosenTypeId) {
      listing.metadata = mergeMetadata(listing.metadata, {
        type_key: chosenTypeKey,
        type_id: chosenTypeId,
      });
    }

    if ('company_id' in listing) {
      delete (listing as any).company_id;
    }

    if (chosenTypeId) {
      vehicle.vehicle_type_id = chosenTypeId;
    }

    const preparedImages = await buildImageRows(images || []);
    listing.metadata = attachMediaMetadata(listing.metadata, preparedImages);

    const rawDocuments = (state?.media as any)?.documents;
    const documentItems: any[] = Array.isArray(rawDocuments) ? rawDocuments : [];
    const desiredDocuments: PreparedDocument[] = documentItems
      .filter((it) => it && typeof it === 'object')
      .map((it) => ({
        record_id: typeof it.record_id === 'string' ? it.record_id : null,
        name: typeof it.name === 'string' ? it.name : 'documento',
        type: typeof it.type === 'string' ? it.type : '',
        size: typeof it.size === 'number' ? it.size : 0,
        is_public: !!it.is_public,
        path:
          typeof it.path === 'string'
            ? extractDocumentPath(it.path)
            : typeof it.url === 'string'
            ? extractDocumentPath(it.url)
            : null,
        file: it.file instanceof File ? (it.file as File) : null,
      }));

    const preparedDocuments: PreparedDocument[] = await Promise.all(
      desiredDocuments.map(async (item) => {
        if (item.path) {
          return item;
        }
        if (!item.file) {
          return item;
        }
        const uploadedPath = await uploadDocumentFile(user.id, listingId, item.file);
        return {
          ...item,
          path: uploadedPath,
        };
      })
    );

    const apiDocuments = preparedDocuments
      .filter((d) => !!d.path)
      .map((d) => ({
        record_id: d.record_id ?? undefined,
        name: d.name,
        type: d.type || null,
        size: d.size || null,
        is_public: !!d.is_public,
        path: String(d.path),
      }));

    (listing as any).document_urls = preparedDocuments
      .filter((d) => d.is_public)
      .map((d) => d.path)
      .filter(Boolean);

    const apiListingPayload = (() => {
      const payload = { ...(listing as Record<string, unknown>) };
      delete (payload as any).vertical_id;
      delete (payload as any).public_profile_id;
      delete (payload as any).user_id;
      delete (payload as any).created_at;
      delete (payload as any).updated_at;
      delete (payload as any).published_at;
      delete (payload as any).views;
      return payload;
    })();

    try {
      const apiListingId = await submitVehicleViaSimpleApi({
        listingId,
        listingPayload: apiListingPayload,
        vehiclePayload: vehicle as Record<string, unknown>,
        images: preparedImages,
        documents: apiDocuments,
      });
      return { id: apiListingId };
    } catch (error) {
      const raw = String((error as any)?.message || 'simple-api upsert autos failed');
      const knownLimitError = parseSdkLimitError(raw);
      if (knownLimitError) {
        return { error: knownLimitError };
      }

      if (!isSimpleApiStrictWriteEnabled()) {
        logWarn('[submitVehicle] simple-api write failed', raw);
      }

      return {
        error: new Error(raw || 'No pudimos guardar la publicación en el backend principal. Intenta nuevamente.'),
      };
    }
  }

  return { submit };
}
