import type { PublicListing } from './public-listings';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simplepropiedades.app';

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

// ─── Property JSON-LD ────────────────────────────────────────────────────────

export function buildPropertyJsonLd(item: PublicListing): object {
    const offer = parsePrice(item.price);
    const pageUrl = `${APP_URL}${item.href}`;
    const sectionPath = item.section === 'rent' ? '/arriendos' : item.section === 'project' ? '/proyectos' : '/ventas';
    const sectionLabel = item.sectionLabel;

    const listing: Record<string, unknown> = {
        '@type': 'RealEstateListing',
        name: item.title,
        url: pageUrl,
    };

    if (item.description) listing.description = item.description;
    if (item.images.length > 0) listing.image = item.images;
    if (item.location) {
        listing.address = {
            '@type': 'PostalAddress',
            addressLocality: item.location,
            addressCountry: 'CL',
        };
    }

    if (offer) {
        listing.offers = {
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
        '@graph': [listing, breadcrumb],
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
