import { API_BASE } from '@simple/config';

export type MarketplaceProfessional = {
    slug: string;
    displayName: string | null;
    profession: string | null;
    headline: string | null;
    avatarUrl: string | null;
    city: string | null;
    region: string | null;
    countryCode: string;
    servesOnline: boolean;
    servesPresential: boolean;
};

export const DIRECTORY_FALLBACK_PROFESSIONALS: MarketplaceProfessional[] = [
    {
        slug: 'dra-valentina',
        displayName: 'Dra. Valentina Muñoz',
        profession: 'Psicóloga Clínica & Terapeuta',
        headline: 'Atención psicológica individual y terapia de adultos en Providencia y teleconsulta online.',
        avatarUrl: '/hero/doctor-profile.jpg',
        city: 'Providencia',
        region: 'RM',
        countryCode: 'CL',
        servesOnline: true,
        servesPresential: true,
    },
    {
        slug: 'esteban-carrasco',
        displayName: 'Esteban Carrasco',
        profession: 'Barbero Profesional & Estilista',
        headline: 'Cortes clásicos, perfilado de barba y asesoría de imagen masculina en Viña del Mar.',
        avatarUrl: '/hero/barber-profile.jpg',
        city: 'Viña del Mar',
        region: 'Valparaíso',
        countryCode: 'CL',
        servesOnline: false,
        servesPresential: true,
    },
    {
        slug: 'camila-silva',
        displayName: 'Camila Silva',
        profession: 'Nutricionista Deportiva & Clínica',
        headline: 'Planes nutricionales personalizados, composición corporal y optimización de rendimiento.',
        avatarUrl: '/hero/nutrition-profile.jpg',
        city: 'Las Condes',
        region: 'RM',
        countryCode: 'CL',
        servesOnline: true,
        servesPresential: true,
    },
];

type MarketplaceProfessionalsResponse = {
    ok?: boolean;
    items?: MarketplaceProfessional[];
    error?: string;
};

export async function fetchMarketplaceProfessionals(input?: {
    limit?: number;
    offset?: number;
}): Promise<{ ok: true; items: MarketplaceProfessional[] } | { ok: false; error: string }> {
    const params = new URLSearchParams();
    params.set('limit', String(input?.limit ?? 24));
    params.set('offset', String(input?.offset ?? 0));

    const response = await fetch(`${API_BASE}/api/public/agenda/marketplace/professionals?${params.toString()}`);
    const data = (await response.json().catch(() => null)) as MarketplaceProfessionalsResponse | null;

    if (!response.ok || !data?.ok) {
        return { ok: false, error: data?.error ?? 'No pudimos cargar profesionales.' };
    }

    return { ok: true, items: data.items ?? [] };
}

export function resolveProfessionalMediaUrl(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        return trimmed;
    }
    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
        const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        return `${API_BASE}${clean}`;
    }
    if (trimmed.startsWith('/')) {
        return trimmed;
    }
    return `${API_BASE}/${trimmed}`;
}
