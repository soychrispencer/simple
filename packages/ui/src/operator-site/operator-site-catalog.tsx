'use client';

import { useState } from 'react';
import {
    formatOperatorPromotionLabel,
    formatOperatorServicePrice,
} from '@simple/utils';
import type { OperatorSiteCatalog } from './types.js';

/** Packs y promociones (los servicios se eligen en el flujo de reserva). */
export function OperatorSiteOffersBlock({ catalog }: { catalog: OperatorSiteCatalog }) {
    const { packs, promotions } = catalog;
    const [copiedPromoId, setCopiedPromoId] = useState<string | null>(null);
    if (packs.length === 0 && promotions.length === 0) return null;

    const handleCopyCode = (promoId: string, code: string) => {
        void navigator.clipboard.writeText(code).then(() => {
            setCopiedPromoId(promoId);
            setTimeout(() => setCopiedPromoId((curr) => (curr === promoId ? null : curr)), 1800);
        }).catch(() => {});
    };

    return (
        <div className="os-offers-block">
            {packs.length > 0 ? (
                <div className="os-catalog-subsection">
                    <h3 className="os-catalog-subsection__title">Packs</h3>
                    <div className="os-catalog-list">
                        {packs.map((pack) => (
                            <article key={pack.id} className="os-catalog-list-card">
                                <div>
                                    <p className="os-catalog-list-card__title">{pack.name}</p>
                                    {pack.description ? (
                                        <p className="os-catalog-list-card__desc">{pack.description}</p>
                                    ) : null}
                                    <p className="os-catalog-list-card__meta">
                                        {pack.sessionsCount} sesiones
                                        {pack.validityDays ? ` · vigencia ${pack.validityDays} días` : ''}
                                    </p>
                                </div>
                                <p className="os-catalog-list-card__price">
                                    {formatOperatorServicePrice({
                                        pricingMode: 'fixed',
                                        price: pack.price,
                                        currency: pack.currency,
                                    })}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            ) : null}

            {promotions.length > 0 ? (
                <div className="os-catalog-subsection">
                    <h3 className="os-catalog-subsection__title">Promociones</h3>
                    <div className="os-catalog-list">
                        {promotions.map((promo) => (
                            <article key={promo.id} className="os-catalog-promo">
                                <div>
                                    <p className="os-catalog-promo__label">{promo.label}</p>
                                    {promo.description ? (
                                        <p className="os-catalog-promo__desc">{promo.description}</p>
                                    ) : null}
                                    {promo.code ? (
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                            <p className="os-catalog-promo__code">Código: {promo.code}</p>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyCode(promo.id, promo.code!)}
                                                className="rounded-md border border-current/25 px-2 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
                                            >
                                                {copiedPromoId === promo.id ? 'Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                                <span className="os-catalog-promo__badge">
                                    {formatOperatorPromotionLabel(promo)}
                                </span>
                            </article>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

/** @deprecated Usar OperatorSiteOffersBlock dentro de la sección de reserva. */
export function OperatorSiteCatalogSection({ catalog }: { catalog: OperatorSiteCatalog }) {
    return <OperatorSiteOffersBlock catalog={catalog} />;
}
