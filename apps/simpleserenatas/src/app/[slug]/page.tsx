import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicMariachiBySlug } from '@/lib/fetch-public-mariachi';
import { isReservedPublicSlug } from '@/lib/public-mariachi-routes';
import { PublicMariachiPage } from '@/components/public/public-mariachi-page';

type PageProps = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (isReservedPublicSlug(slug)) return { title: 'Simple Serenatas' };
    const profile = await fetchPublicMariachiBySlug(slug);
    if (!profile) {
        return { title: 'Mariachi no encontrado · Simple Serenatas' };
    }
    const location = [profile.group.comunaBase, profile.group.region].filter(Boolean).join(', ');
    const description = profile.group.description?.trim()
        || `Contrata ${profile.group.name}${location ? ` en ${location}` : ''} con Simple Serenatas.`;
    return {
        title: `${profile.group.name} · Simple Serenatas`,
        description,
        openGraph: {
            title: profile.group.name,
            description,
            images: profile.group.coverUrl ? [{ url: profile.group.coverUrl }] : undefined,
        },
    };
}

export default async function MariachiPublicProfilePage({ params }: PageProps) {
    const { slug } = await params;
    if (isReservedPublicSlug(slug)) notFound();
    const profile = await fetchPublicMariachiBySlug(slug);
    if (!profile) notFound();
    return <PublicMariachiPage slug={slug} />;
}
