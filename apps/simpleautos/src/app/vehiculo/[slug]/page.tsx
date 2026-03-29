import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicListing } from '@/lib/public-listings';
import VehicleDetailClient from './VehicleDetailClient';

interface Props {
    params: Promise<{ slug: string }> | { slug: string };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleautos.cl';
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    const item = await fetchPublicListing(slug);

    if (!item) {
        return {
            title: 'Publicación no encontrada | SimpleAutos',
        };
    }

    const title = `${item.title} - ${item.price} | SimpleAutos`;
    const description = item.description 
        ? item.description.slice(0, 160) 
        : `Mira este ${item.title} en SimpleAutos. Ubicado en ${item.location || 'Chile'}.`;
    
    const ogImage = item.images?.[0] || '/og-default.png';

    return {
        metadataBase: new URL(APP_URL),
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: item.title,
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
    };
}

export default async function VehicleDetailPage({ params }: Props) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    const item = await fetchPublicListing(slug);

    if (!item) {
        notFound();
    }

    return <VehicleDetailClient item={item} />;
}
