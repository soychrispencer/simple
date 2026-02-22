type DatabaseClient = any;

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

export class StorageService {
  constructor(private _client: DatabaseClient) {}

  async uploadFile(
    bucket: string,
    fileName: string,
    file: File,
    options: { contentType?: string; cacheControl?: string; upsert?: boolean } = {}
  ): Promise<string | null> {
    const _ = { fileName, ...options };
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", bucket || "uploads");
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        throw new Error(String((payload as { error?: unknown }).error || "upload_failed"));
      }
      const path = String((payload as { path?: unknown }).path || "");
      const url = String((payload as { url?: unknown }).url || "");
      if (path) return path;
      if (url) return url;
      return null;
    } catch (error) {
      console.error(`[Storage] upload error for bucket ${bucket}`, error);
      throw error;
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    if (path.startsWith(`${bucket}/`)) return `/${path}`;
    return `/${bucket}/${path}`;
  }

  async deleteFile(bucket: string, path: string): Promise<boolean> {
    const _ = { bucket, path };
    if (!path) return true;
    return true;
  }

  async deleteFiles(bucket: string, paths: string[]): Promise<boolean> {
    const _ = bucket;
    const cleanPaths = paths.filter(Boolean);
    if (cleanPaths.length === 0) return true;
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
  client: DatabaseClient,
  file: File,
  userId: string
): Promise<string | null> {
  const service = new StorageService(client);
  const fileName = `${userId}/${Date.now()}.webp`;
  return service.uploadFile(AVATAR_BUCKET, fileName, file);
}

export async function deleteAvatar(
  client: DatabaseClient,
  path: string
): Promise<boolean> {
  const service = new StorageService(client);
  const cleanPath = normalizeBucketPath(path, AVATAR_BUCKET);
  if (!cleanPath) return true;
  return service.deleteFile(AVATAR_BUCKET, cleanPath);
}

export async function uploadPortada(
  client: DatabaseClient,
  file: File,
  userId: string
): Promise<string | null> {
  const service = new StorageService(client);
  const fileName = `${userId}/${Date.now()}.webp`;
  const path = await service.uploadFile(COVER_BUCKET, fileName, file);
  return path;
}

export function getPortadaUrl(client: DatabaseClient, path: string): string {
  const service = new StorageService(client);
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return service.getPublicUrl(COVER_BUCKET, path);
}

export async function deletePortada(
  client: DatabaseClient,
  path: string
): Promise<boolean> {
  const service = new StorageService(client);
  const cleanPath = normalizeBucketPath(path, COVER_BUCKET);
  if (!cleanPath) return true;
  return service.deleteFile(COVER_BUCKET, cleanPath);
}

export async function deleteVehicleImage(
  client: DatabaseClient,
  path: string
): Promise<boolean> {
  const service = new StorageService(client);
  const cleanPath = normalizeBucketPath(path, VEHICLE_BUCKET);
  if (!cleanPath) return true;
  return service.deleteFile(VEHICLE_BUCKET, cleanPath);
}

export function extractPathFromUrl(url: string): string | null {
  return extractBucketPath(url, VEHICLE_BUCKET);
}
