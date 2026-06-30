import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgendaPublicSite, type AgendaPublicProfile } from './agenda-public-site';

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');

async function getProfessionalProfile(slug: string): Promise<AgendaPublicProfile | null> {
    if (slug.includes('.')) return null;
    try {
        const res = await fetch(`${API_BASE}/api/public/agenda/${slug}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json() as { ok: boolean; profile: AgendaPublicProfile };
        return data.ok ? data.profile : null;
    } catch {
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const profile = await getProfessionalProfile(slug);
    if (!profile) {
        return { title: 'Perfil no encontrado' };
    }

    const title = profile.headline
        ? `${profile.displayName} — ${profile.headline}`
        : profile.profession
            ? `${profile.displayName} — ${profile.profession}`
            : profile.displayName;

    const description = profile.bio?.slice(0, 160)
        ?? `Reserva cita con ${profile.displayName}. Agenda online con SimpleAgenda.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'profile',
            url: `${APP_URL}/${slug}`,
            images: profile.coverUrl || profile.avatarUrl
                ? [{ url: profile.coverUrl ?? profile.avatarUrl ?? '', width: 1200, height: 630, alt: profile.displayName }]
                : undefined,
        },
    };
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const profile = await getProfessionalProfile(slug);
    if (!profile) return notFound();

    return <AgendaPublicSite profile={profile} />;
}
