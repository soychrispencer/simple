import { logError } from "./logger";

type DatabaseClient = any;

export class StorageMediaService {
  constructor(private _client: DatabaseClient) {}

  async uploadFile(_bucket: string, _fileName: string, file: File): Promise<string | null> {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "vehicles");
      const response = await fetch("/api/upload", { method: "POST", body: form });
      if (!response.ok) return null;
      const payload = await response.json().catch(() => null);
      return payload?.path ? String(payload.path) : payload?.url ? String(payload.url) : null;
    } catch (error) {
      logError("uploadFile error", error);
      return null;
    }
  }

  getPublicUrl(_bucket: string, path: string): string {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    return `/${path}`;
  }

  async deleteFile(_bucket: string, _path: string): Promise<boolean> {
    return true;
  }

  async deleteFiles(_bucket: string, _paths: string[]): Promise<boolean> {
    return true;
  }

  extractPathFromUrl(url: string, bucket: string): string | null {
    try {
      const match = url.match(new RegExp(`/${bucket}/(.+)$`));
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

function normalizeBucketPath(raw: string | null | undefined, bucket: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) {
    const match = raw.match(new RegExp(`/${bucket}/(.+)$`));
    return match ? match[1] : null;
  }
  return raw;
}

let defaultStorageService: StorageMediaService | null = null;

export function getStorageService(client?: DatabaseClient): StorageMediaService {
  if (!defaultStorageService) {
    defaultStorageService = new StorageMediaService(client ?? null);
  }
  return defaultStorageService;
}

export async function uploadAvatar(client: DatabaseClient, file: File, userId: string): Promise<string | null> {
  const service = new StorageMediaService(client);
  const fileName = `${userId}/${Date.now()}.webp`;
  return service.uploadFile("avatars", fileName, file);
}

export function getAvatarUrl(_client: DatabaseClient, path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export async function deleteAvatar(_client: DatabaseClient, _path: string): Promise<boolean> {
  return true;
}

export async function uploadPortada(client: DatabaseClient, file: File, userId: string): Promise<string | null> {
  const service = new StorageMediaService(client);
  const fileName = `${userId}/${Date.now()}.webp`;
  return service.uploadFile("covers", fileName, file);
}

export function getPortadaUrl(_client: DatabaseClient, path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export async function deletePortada(_client: DatabaseClient, _path: string): Promise<boolean> {
  return true;
}

export async function uploadVehicleImage(client: DatabaseClient, fileName: string, file: File) {
  const service = new StorageMediaService(client);
  const path = await service.uploadFile("vehicles", fileName, file);
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function getVehicleImageUrl(_client: DatabaseClient, path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export async function deleteVehicleImage(_client: DatabaseClient, _path: string) {
  return true;
}

export function extractPathFromUrl(url: string): string | null {
  const service = new StorageMediaService(null);
  return service.extractPathFromUrl(url, "vehicles");
}

export async function deleteVehicleImages(_client: DatabaseClient, urls: string[]) {
  const service = new StorageMediaService(null);
  const _paths = urls.map((url) => service.extractPathFromUrl(url, "vehicles")).filter(Boolean) as string[];
  return true;
}
