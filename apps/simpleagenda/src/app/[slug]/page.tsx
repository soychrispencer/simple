import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgendaPublicSite, type AgendaPublicProfile } from './agenda-public-site';
import { NotPublishedPage } from './not-published-page';

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');

type ProfileResult =
    | { status: 'found'; profile: AgendaPublicProfile }
    | { status: 'not_published'; displayName: string }
    | { status: 'not_found' };

async function getProfessionalProfile(slug: string): Promise<ProfileResult> {
    if (slug.includes('.')) return { status: 'not_found' };
    try {
        const res = await fetch(`${API_BASE}/api/public/agenda/${slug}`, { cache: 'no-store' });
        if (res.status === 403) {
            const body = await res.json().catch(() => ({})) as { reason?: string; displayName?: string };
            if (body.reason === 'not_published') {
                return { status: 'not_published', displayName: body.displayName ?? '' };
            }
        }
        if (!res.ok) return { status: 'not_found' };
        const data = await res.json() as { ok: boolean; profile: AgendaPublicProfile };
        return data.ok ? { status: 'found', profile: data.profile } : { status: 'not_found' };
    } catch {
        return { status: 'not_found' };
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
        return { title: 'Perfil en configuración' };
    }
    if (result.status === 'not_found') {
        return { title: 'Perfil no encontrado' };
    }

    const { profile } = result;
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
    const result = await getProfessionalProfile(slug);

    if (result.status === 'not_found') return notFound();
    if (result.status === 'not_published') {
        return <NotPublishedPage displayName={result.displayName} />;
    }

    return <AgendaPublicSite profile={result.profile} />;
}
