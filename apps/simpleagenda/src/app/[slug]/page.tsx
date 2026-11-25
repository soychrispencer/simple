import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgendaPublicSite, type AgendaPublicProfile } from './agenda-public-site';
import { NotPublishedPage } from './not-published-page';
import { DEMO_PROFILES } from './demo-profiles';

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');

type ProfileResult =
    | { status: 'found'; profile: AgendaPublicProfile }
    | { status: 'not_published'; displayName: string }
    | { status: 'not_found' }
    | { status: 'unavailable' };

async function getProfessionalProfile(slug: string): Promise<ProfileResult> {
    if (slug.includes('.')) return { status: 'not_found' };

    // Si es un perfil demo modelo, proveemos datos garantizados y realistas
    if (DEMO_PROFILES[slug]) {
        return { status: 'found', profile: DEMO_PROFILES[slug] };
    }

    try {
        const res = await fetch(`${API_BASE}/api/public/agenda/${slug}`, { cache: 'no-store' });
        if (res.status === 403) {
            const body = await res.json().catch(() => ({})) as { reason?: string; displayName?: string };
            if (body.reason === 'not_published') {
                return { status: 'not_published', displayName: body.displayName ?? '' };
            }
        }
        if (res.status >= 500 || res.status === 429) return { status: 'unavailable' };
        if (!res.ok) return { status: 'not_found' };
        const data = await res.json() as { ok: boolean; profile: AgendaPublicProfile };
        return data.ok ? { status: 'found', profile: data.profile } : { status: 'not_found' };
    } catch {
        return { status: 'unavailable' };
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const result = await getProfessionalProfile(slug);
    if (result.status === 'not_published') {
        return { title: 'Perfil en configuración | SimpleAgenda' };
    }
    if (result.status === 'not_found') {
        return { title: 'Perfil no encontrado | SimpleAgenda' };
    }
    if (result.status === 'unavailable') {
        return { title: 'Agenda temporalmente no disponible | SimpleAgenda' };
    }

    const { profile } = result;
    const professionOrHeadline = profile.profession || profile.headline || 'Atención profesional';
    const locationCity = profile.city ? ` en ${profile.city}` : '';
    const ogTitle = `${profile.displayName} · Reserva tu hora online`;
    const seoTitle = profile.landingPage?.seoTitle
        || `${profile.displayName} — ${professionOrHeadline}${locationCity} | SimpleAgenda`;

    const description = profile.landingPage?.seoDescription
        || profile.bio?.slice(0, 160)
        || `Reserva tu cita online con ${profile.displayName} (${professionOrHeadline}${locationCity}). Elige fecha y hora según disponibilidad en tiempo real.`;

    const rawImage = profile.coverUrl || profile.avatarUrl;
    const absoluteImage = rawImage
        ? rawImage.startsWith('http://') || rawImage.startsWith('https://')
            ? rawImage
            : `${APP_URL}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
        : `${APP_URL}/hero/consultation-hero.webp`;

    const canonicalUrl = profile.customDomain ? `https://${profile.customDomain}` : `${APP_URL}/${slug}`;

    return {
        title: seoTitle,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: ogTitle,
            description,
            type: 'website',
            siteName: 'SimpleAgenda',
            url: canonicalUrl,
            images: [
                {
                    url: absoluteImage,
                    width: 1200,
                    height: 630,
                    alt: profile.displayName,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle,
            description,
            images: [absoluteImage],
        },
    };
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const result = await getProfessionalProfile(slug);

    if (result.status === 'not_found') return notFound();
    if (result.status === 'not_published') {
        return <NotPublishedPage displayName={result.displayName} />;
    }
    if (result.status === 'unavailable') throw new Error('No se pudo cargar la agenda pública.');

    return <AgendaPublicSite profile={result.profile} />;
}
