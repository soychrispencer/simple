import type { MusicianDirectoryItem } from '@/lib/serenatas-api';

/** Etiqueta corta de ubicación del músico (comuna/región base). */
export function musicianLocationLabel(musician: Pick<MusicianDirectoryItem, 'comuna' | 'region'>): string {
    if (musician.comuna?.trim()) return musician.comuna.trim();
    if (musician.region?.trim()) return musician.region.trim();
    return 'Sin ubicación';
}
