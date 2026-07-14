'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import {
    fetchPublicOperatorProductById,
    formatOperatorProductPrice,
    resolveAppMediaUrl,
    resolveOperatorProductCategoryLabel,
    type PublicOperatorProductItem,
    type PublicProfileVertical,
} from '@simple/utils';
import { PanelCard } from './panel-card.js';
import { PanelNotice } from './panel-primitives.js';
import { getPanelButtonClassName, getPanelButtonStyle } from './panel-button.js';

export function CatalogProductDetailPage({ vertical }: { vertical: PublicProfileVertical }) {
    const params = useParams();
    const id = typeof params.id === 'string' ? params.id : '';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [item, setItem] = useState<PublicOperatorProductItem | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            setError('Producto no encontrado');
            return;
        }
        setLoading(true);
        void fetchPublicOperatorProductById(vertical, id).then((result) => {
            setItem(result.item ?? null);
            setError(result.ok ? '' : (result.error ?? 'Producto no encontrado'));
            setLoading(false);
        });
    }, [vertical, id]);

    if (loading) {
        return (
            <div className="container-app flex items-center gap-2 py-16 text-sm text-(--fg-muted)">
                <IconLoader2 size={16} className="animate-spin" /> Cargando…
            </div>
        );
    }

    if (!item) {
        return (
            <div className="container-app space-y-4 py-16">
                <PanelNotice tone="warning">{error || 'Producto no encontrado'}</PanelNotice>
                <Link href="/productos" className="inline-flex items-center gap-2 text-sm font-medium text-(--fg)">
                    <IconArrowLeft size={16} /> Volver a productos
                </Link>
            </div>
        );
    }

    const imageSrc = resolveAppMediaUrl(item.imageUrl)
        ?? resolveAppMediaUrl(item.provider.coverImageUrl)
        ?? resolveAppMediaUrl(item.provider.avatarImageUrl);
    const priceLabel = formatOperatorProductPrice({
        price: item.price,
        promoPrice: item.promoPrice,
        currency: item.currency,
    });

    return (
        <div className="container-app py-8 md:py-12">
            <Link href="/productos" className="mb-6 inline-flex items-center gap-2 text-sm text-(--fg-muted) hover:text-(--fg)">
                <IconArrowLeft size={16} /> Productos
            </Link>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-(--bg-subtle)">
                    {imageSrc ? (
                        <Image src={imageSrc} alt={item.name} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" unoptimized />
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-(--fg-muted)">Sin imagen</div>
                    )}
                </div>
                <PanelCard size="md" className="space-y-4 p-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-(--fg-muted)">
                        {resolveOperatorProductCategoryLabel(vertical, item.category)}
                    </p>
                    <h1 className="text-3xl font-semibold text-(--fg)">{item.name}</h1>
                    <p className="text-2xl font-semibold text-(--fg)">{priceLabel}</p>
                    {item.description ? <p className="text-sm leading-relaxed text-(--fg-secondary)">{item.description}</p> : null}
                    <div className="border-t border-(--border) pt-4">
                        <p className="text-sm text-(--fg-secondary)">
                            Vendido por{' '}
                            <Link href={item.provider.profileHref} className="font-medium text-(--fg) underline-offset-2 hover:underline">
                                {item.provider.name}
                            </Link>
                            {item.provider.city || item.provider.region
                                ? ` · ${item.provider.city ?? item.provider.region}`
                                : ''}
                        </p>
                    </div>
                    <Link
                        href={item.provider.profileHref}
                        className={getPanelButtonClassName({ className: 'w-full justify-center' })}
                        style={getPanelButtonStyle('primary')}
                    >
                        Contactar
                    </Link>
                </PanelCard>
            </div>
        </div>
    );
}
