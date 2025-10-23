import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Servicio genérico para operaciones de Supabase Storage
 * Reemplaza la funcionalidad de avatarStorage.ts, portadaStorage.ts y vehicleStorage.ts
 */
export class SupabaseStorageService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Sube un archivo a un bucket específico
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
      console.error(`Error uploading file to ${bucket}:`, error);
      return null;
    }

    return data?.path ?? null;
  }

  /**
   * Obtiene la URL pública de un archivo
   * @param bucket - Nombre del bucket
   * @param path - Ruta del archivo
   * @returns URL pública
   */
  getPublicUrl(bucket: string, path: string): string {
    return this.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Elimina un archivo de un bucket
   * @param bucket - Nombre del bucket
   * @param path - Ruta del archivo a eliminar
   * @returns true si se eliminó correctamente
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error(`Error deleting file from ${bucket}:`, error);
      return false;
    }
    return true;
  }

  /**
   * Elimina múltiples archivos de un bucket
   * @param bucket - Nombre del bucket
   * @param paths - Array de rutas de archivos a eliminar
   * @returns true si se eliminaron correctamente
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<boolean> {
    if (paths.length === 0) return true;

    const { error } = await this.supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.error(`Error deleting files from ${bucket}:`, error);
      return false;
    }
    return true;
  }

  /**
   * Extrae el path de un archivo desde una URL pública de Supabase
   * @param url - URL pública completa
   * @param bucket - Nombre del bucket
   * @returns Path del archivo o null si no es válido
   */
  extractPathFromUrl(url: string, bucket: string): string | null {
    try {
      // URL típica: https://[project].supabase.co/storage/v1/object/public/{bucket}/path
      const match = url.match(new RegExp(`/${bucket}/(.+)$`));
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
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
  const fileName = `${userId}-${Date.now()}.webp`;
  const path = await service.uploadFile('avatars', fileName, file);
  return path ? service.getPublicUrl('avatars', path) : null;
}

export function getAvatarUrl(supabase: SupabaseClient, path: string): string {
  const service = new SupabaseStorageService(supabase);
  return service.getPublicUrl('avatars', path);
}

export async function deleteAvatar(supabase: SupabaseClient, path: string): Promise<boolean> {
  const service = new SupabaseStorageService(supabase);
  return service.deleteFile('avatars', path);
}

// Cover functions
export async function uploadPortada(supabase: SupabaseClient, file: File, userId: string): Promise<string | null> {
  const service = new SupabaseStorageService(supabase);
  const fileName = `${userId}-${Date.now()}.webp`;
  const path = await service.uploadFile('covers', fileName, file);
  return path ? service.getPublicUrl('covers', path) : null;
}

export function getPortadaUrl(supabase: SupabaseClient, path: string): string {
  const service = new SupabaseStorageService(supabase);
  return service.getPublicUrl('covers', path);
}

export async function deletePortada(supabase: SupabaseClient, path: string): Promise<boolean> {
  const service = new SupabaseStorageService(supabase);
  return service.deleteFile('covers', path);
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
  const service = new SupabaseStorageService({} as any); // Solo para usar el método
  return service.extractPathFromUrl(url, 'vehicles');
}

export async function deleteVehicleImages(supabase: SupabaseClient, urls: string[]) {
  const service = new SupabaseStorageService(supabase);
  const paths = urls.map(url => service.extractPathFromUrl(url, 'vehicles')).filter(Boolean) as string[];
  return service.deleteFiles('vehicles', paths);
}