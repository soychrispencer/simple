'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { fetchPublicProfile } from '@/lib/public-listings';
import { mapPublicProfileOperatorProducts } from '@simple/utils';
import { BusinessOperatorProductsCatalog, PanelBlockHeader } from '@simple/ui/panel';
import { PanelCard } from '@simple/ui/panel';

export function SellerProductsCrossSell({
    sellerUsername,
    sellerName,
    profileHref,
    limit = 4,
}: {
    sellerUsername: string;
    sellerName: string;
    profileHref?: string | null;
    limit?: number;
}) {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<ReturnType<typeof mapPublicProfileOperatorProducts>>([]);

    useEffect(() => {
        void fetchPublicProfile(sellerUsername).then((data) => {
            if (!data?.profile || data.catalog.products.length === 0) {
                setProducts([]);
            } else {
                setProducts(mapPublicProfileOperatorProducts(data.profile, data.catalog.products).slice(0, limit));
            }
            setLoading(false);
        });
    }, [limit, sellerUsername]);

    if (loading || products.length === 0) return null;

    return (
        <PanelCard size="lg" className="space-y-4 p-4 md:p-6">
            <PanelBlockHeader
                title="Productos de este vendedor"
                description={`Artículos que ${sellerName} ofrece en su tienda.`}
                className="mb-0"
                actions={profileHref ? (
                    <Link href={`${profileHref}?tab=productos`} className="inline-flex items-center gap-1 text-sm font-medium text-fg-secondary hover:text-fg">
                        Ver tienda
                        <IconArrowRight size={14} />
                    </Link>
                ) : undefined}
            />
            <BusinessOperatorProductsCatalog vertical="propiedades" products={products} showConsult={false} />
        </PanelCard>
    );
}
