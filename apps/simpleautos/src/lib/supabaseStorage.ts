import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from './logger';

/**
 * Servicio gen�rico para operaciones de Supabase Storage
 * Reemplaza la funcionalidad de avatarStorage.ts, portadaStorage.ts y vehicleStorage.ts
 */
export class SupabaseStorageService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Sube un archivo a un bucket espec�fico
   * @param bucket - Nombre del bucket (ej: 'avatars', 'covers', 'vehicles')
   * @param fileName - Nombre del archivo
   * @param file - Archivo a subir
   * @param options - Opciones adicionales para la subida
   * @returns Ruta del archivo subido o null si hay error
   */
  async uploadFile(
    bucket: string,
    fileName: string,
    file: File,
    options: { contentType?: string; cacheControl?: string; upsert?: boolean } = {}
  ): Promise<string | null> {
    const { contentType = 'image/webp', cacheControl = '3600', upsert = true } = options;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert, contentType, cacheControl });

    if (error) {
      logError(`Error uploading file to ${bucket}`, error, { bucket, fileName });
      return null;
    }

    return data?.path ?? null;
  }

  /**
   * Obtiene la URL p�blica de un archivo
   * @param bucket - Nombre del bucket
   * @param path - Ruta del archivo
   * @returns URL p�blica
   */
  getPublicUrl(bucket: string, path: string): string {
    return this.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Elimina un archivo de un bucket
   * @param bucket - Nombre del bucket
   * @param path - Ruta del archivo a eliminar
   * @returns true si se elimin� correctamente
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      logError(`Error deleting file from ${bucket}`, error, { bucket, path });
      return false;
    }
    return true;
  }

  /**
   * Elimina m�ltiples archivos de un bucket
   * @param bucket - Nombre del bucket
   * @param paths - Array de rutas de archivos a eliminar
   * @returns true si se eliminaron correctamente
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<boolean> {
    if (paths.length === 0) return true;

    const { error } = await this.supabase.storage.from(bucket).remove(paths);
    if (error) {
      logError(`Error deleting files from ${bucket}`, error, { bucket, count: paths.length });
      return false;
    }
    return true;
  }

  /**
   * Extrae el path de un archivo desde una URL p�blica de Supabase
   * @param url - URL p�blica completa
   * @param bucket - Nombre del bucket
   * @returns Path del archivo o null si no es v�lido
   */
  extractPathFromUrl(url: string, bucket: string): string | null {
    try {
      // URL t�pica: https://[project].supabase.co/storage/v1/object/public/{bucket}/path
      const match = url.match(new RegExp(`/${bucket}/(.+)$`));
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

function normalizeBucketPath(raw: string | null | undefined, bucket: string): string | null {
  if (!raw) return null;
  if (raw.startsWith('http')) {
    const match = raw.match(new RegExp(`/${bucket}/(.+)$`));
    return match ? match[1] : null;
  }
  return raw;
}

// Instancia por defecto del servicio
let defaultStorageService: SupabaseStorageService | null = null;

export function getStorageService(supabase?: SupabaseClient): SupabaseStorageService {
  if (!defaultStorageService) {
    const client = supabase || require('./supabase/supabase').getSupabaseClient();
    defaultStorageService = new SupabaseStorageService(client);
  }
  return defaultStorageService;
}

// Funciones de conveniencia para uso directo

// Avatar functions
export async function uploadAvatar(supabase: SupabaseClient, file: File, userId: string): Promise<string | null> {
  const service = new SupabaseStorageService(supabase);
  const fileName = `${userId}/${Date.now()}.webp`;
  return service.uploadFile('avatars', fileName, file);
}

export function getAvatarUrl(supabase: SupabaseClient, path: string): string {
  const service = new SupabaseStorageService(supabase);
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return service.getPublicUrl('avatars', path);
}

export async function deleteAvatar(supabase: SupabaseClient, path: string): Promise<boolean> {
  const service = new SupabaseStorageService(supabase);
  const cleanPath = normalizeBucketPath(path, 'avatars');
  if (!cleanPath) return true;
  return service.deleteFile('avatars', cleanPath);
}

// Cover functions
export async function uploadPortada(supabase: SupabaseClient, file: File, userId: string): Promise<string | null> {
  const service = new SupabaseStorageService(supabase);
  const fileName = `${userId}/${Date.now()}.webp`;
  return service.uploadFile('covers', fileName, file);
}

export function getPortadaUrl(supabase: SupabaseClient, path: string): string {
  const service = new SupabaseStorageService(supabase);
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return service.getPublicUrl('covers', path);
}

export async function deletePortada(supabase: SupabaseClient, path: string): Promise<boolean> {
  const service = new SupabaseStorageService(supabase);
  const cleanPath = normalizeBucketPath(path, 'covers');
  if (!cleanPath) return true;
  return service.deleteFile('covers', cleanPath);
}

// Vehicle functions
export async function uploadVehicleImage(supabase: SupabaseClient, fileName: string, file: File) {
  const service = new SupabaseStorageService(supabase);
  const path = await service.uploadFile('vehicles', fileName, file);
  return path ? service.getPublicUrl('vehicles', path) : null;
}

export function getVehicleImageUrl(supabase: SupabaseClient, path: string): string {
  const service = new SupabaseStorageService(supabase);
  return service.getPublicUrl('vehicles', path);
}

export async function deleteVehicleImage(supabase: SupabaseClient, path: string) {
  const service = new SupabaseStorageService(supabase);
  return service.deleteFile('vehicles', path);
}

export function extractPathFromUrl(url: string): string | null {
  const service = new SupabaseStorageService({} as any); // Solo para usar el m�todo
  return service.extractPathFromUrl(url, 'vehicles');
}

export async function deleteVehicleImages(supabase: SupabaseClient, urls: string[]) {
  const service = new SupabaseStorageService(supabase);
  const paths = urls.map(url => service.extractPathFromUrl(url, 'vehicles')).filter(Boolean) as string[];
  return service.deleteFiles('vehicles', paths);
}

