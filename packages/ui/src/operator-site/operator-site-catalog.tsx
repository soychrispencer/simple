'use client';

import {
    formatOperatorPromotionLabel,
    formatOperatorServicePrice,
} from '@simple/utils';
import type { OperatorSiteCatalog } from './types.js';

/** Packs y promociones (los servicios se eligen en el flujo de reserva). */
export function OperatorSiteOffersBlock({ catalog }: { catalog: OperatorSiteCatalog }) {
    const { packs, promotions } = catalog;
    if (packs.length === 0 && promotions.length === 0) return null;

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
                                        <p className="os-catalog-promo__code">Código: {promo.code}</p>
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
