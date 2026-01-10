import type { SupabaseClient } from "@supabase/supabase-js";

function extractBucketPath(url: string, bucket: string): string | null {
  if (!url) return null;
  try {
    const match = url.match(new RegExp(`/${bucket}/(.+)$`));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function normalizeBucketPath(raw: string | null | undefined, bucket: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return extractBucketPath(raw, bucket);
  return raw;
}

export class SupabaseStorageService {
  constructor(private supabase: SupabaseClient) {}

  async uploadFile(
    bucket: string,
    fileName: string,
    file: File,
    options: { contentType?: string; cacheControl?: string; upsert?: boolean } = {}
  ): Promise<string | null> {
    const { contentType = "image/webp", cacheControl = "3600", upsert = true } = options;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert, contentType, cacheControl });

    if (error) {
      console.error(`[Storage] upload error for bucket ${bucket}`, error);
      // Propagar el error para que el consumidor muestre el detalle real (RLS, tamaño, tipo, etc.)
      throw error;
    }

    return data?.path ?? null;
  }

  getPublicUrl(bucket: string, path: string): string {
    return this.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<boolean> {
    if (!path) return true;
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error(`[Storage] delete error for bucket ${bucket}`, error);
      return false;
    }
    return true;
  }

  async deleteFiles(bucket: string, paths: string[]): Promise<boolean> {
    const cleanPaths = paths.filter(Boolean);
    if (cleanPaths.length === 0) return true;
    const { error } = await this.supabase.storage.from(bucket).remove(cleanPaths);
    if (error) {
      console.error(`[Storage] delete many error for bucket ${bucket}`, error);
      return false;
    }
    return true;
  }

  extractPathFromUrl(url: string, bucket: string): string | null {
    return extractBucketPath(url, bucket);
  }
}

const AVATAR_BUCKET = "avatars";
const COVER_BUCKET = "covers";
const VEHICLE_BUCKET = "vehicles";

export async function uploadAvatar(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<string | null> {
  const service = new SupabaseStorageService(supabase);
  const fileName = `${userId}/${Date.now()}.webp`;
  return service.uploadFile(AVATAR_BUCKET, fileName, file);
}

export async function deleteAvatar(
  supabase: SupabaseClient,
  path: string
): Promise<boolean> {
  const service = new SupabaseStorageService(supabase);
  const cleanPath = normalizeBucketPath(path, AVATAR_BUCKET);
  if (!cleanPath) return true;
  return service.deleteFile(AVATAR_BUCKET, cleanPath);
}

export async function uploadPortada(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<string | null> {
  const service = new SupabaseStorageService(supabase);
  const fileName = `${userId}/${Date.now()}.webp`;
  const path = await service.uploadFile(COVER_BUCKET, fileName, file);
  return path;
}

export function getPortadaUrl(supabase: SupabaseClient, path: string): string {
  const service = new SupabaseStorageService(supabase);
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return service.getPublicUrl(COVER_BUCKET, path);
}

export async function deletePortada(
  supabase: SupabaseClient,
  path: string
): Promise<boolean> {
  const service = new SupabaseStorageService(supabase);
  const cleanPath = normalizeBucketPath(path, COVER_BUCKET);
  if (!cleanPath) return true;
  return service.deleteFile(COVER_BUCKET, cleanPath);
}

export async function deleteVehicleImage(
  supabase: SupabaseClient,
  path: string
): Promise<boolean> {
  const service = new SupabaseStorageService(supabase);
  const cleanPath = normalizeBucketPath(path, VEHICLE_BUCKET);
  if (!cleanPath) return true;
  return service.deleteFile(VEHICLE_BUCKET, cleanPath);
}

export function extractPathFromUrl(url: string): string | null {
  return extractBucketPath(url, VEHICLE_BUCKET);
}
