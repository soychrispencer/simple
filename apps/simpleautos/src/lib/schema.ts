import type { PublicListing } from './public-listings';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleautos.cl';

// ─── Price parser ────────────────────────────────────────────────────────────

function parsePrice(priceStr: string): { price: number; currency: string } | null {
    const ufMatch = priceStr.match(/UF\s*([\d.,]+)/i);
    if (ufMatch) {
        const n = parseFloat(ufMatch[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(n) && n > 0) return { price: n, currency: 'CLF' };
    }
    const digits = priceStr.replace(/[^\d]/g, '');
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n > 0) return { price: n, currency: 'CLP' };
    return null;
}

// ─── Vehicle JSON-LD ─────────────────────────────────────────────────────────

export function buildVehicleJsonLd(item: PublicListing): object {
    const offer = parsePrice(item.price);
    const pageUrl = `${APP_URL}${item.href}`;
    const sectionPath = item.section === 'rent' ? '/arriendos' : item.section === 'auction' ? '/subastas' : '/ventas';
    const sectionLabel = item.sectionLabel;

    const vehicle: Record<string, unknown> = {
        '@type': 'Vehicle',
        name: item.title,
        url: pageUrl,
        itemCondition: 'https://schema.org/UsedCondition',
    };

    if (item.description) vehicle.description = item.description;
    if (item.images.length > 0) vehicle.image = item.images;
    if (item.location) vehicle.vehicleConfiguration = item.location;

    if (offer) {
        vehicle.offers = {
            '@type': 'Offer',
            price: offer.price,
            priceCurrency: offer.currency,
            availability: 'https://schema.org/InStock',
            url: pageUrl,
            ...(item.seller ? {
                seller: {
                    '@type': 'Person',
                    name: item.seller.name,
                },
            } : {}),
        };
    }

    const breadcrumb = {
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: APP_URL },
            { '@type': 'ListItem', position: 2, name: sectionLabel, item: `${APP_URL}${sectionPath}` },
            { '@type': 'ListItem', position: 3, name: item.title },
        ],
    };

    return {
        '@context': 'https://schema.org',
        '@graph': [vehicle, breadcrumb],
    };
}

// ─── JsonLd component ────────────────────────────────────────────────────────

import { createElement } from 'react';

export function JsonLd({ data }: { data: object }) {
    return createElement('script', {
        type: 'application/ld+json',
        dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
    });
}
