import type { MusicianDirectoryItem } from '@/lib/serenatas-api';

/** Etiqueta corta de ubicación para dueños (zonas de trabajo o comuna base). */
export function musicianLocationLabel(musician: MusicianDirectoryItem): string {
    const zones = musician.workZones ?? [];
    if (zones.length > 0) {
        if (zones.length <= 2) return zones.join(', ');
        return `${zones.slice(0, 2).join(', ')} +${zones.length - 2}`;
    }
    return musician.comuna ?? musician.region ?? 'Sin comuna';
}
