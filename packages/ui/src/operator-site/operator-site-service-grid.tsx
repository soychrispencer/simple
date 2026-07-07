'use client';

import Image from 'next/image';
import { IconCalendarEvent, IconClock } from '@tabler/icons-react';
import {
    formatBusinessServiceModality,
    formatOperatorServicePrice,
    resolveAppMediaUrl,
} from '@simple/utils';
import type { OperatorSiteServiceItem } from './types.js';

export function OperatorSiteServiceGrid({
    services,
    imageFallbackUrl,
    onBook,
    variant = 'grid',
}: {
    services: OperatorSiteServiceItem[];
    imageFallbackUrl?: string | null;
    onBook?: (serviceId: string) => void;
    variant?: 'grid' | 'carousel';
}) {
    if (services.length === 0) return null;

    const fallback = resolveAppMediaUrl(imageFallbackUrl);
    const rootClass = variant === 'carousel' ? 'os-service-scroller' : 'os-service-grid';

    const grid = (
        <div className={rootClass}>
            {services.map((item) => {
                const imageSrc = resolveAppMediaUrl(item.imageUrl) ?? fallback;
                const modality = formatBusinessServiceModality(item);
                const price = formatOperatorServicePrice({
                    pricingMode: 'fixed',
                    price: item.price,
                    currency: item.currency,
                });

                return (
                    <article key={item.id} className={`os-service-card${variant === 'carousel' ? ' os-service-card--carousel' : ''}`}>
                        <div className="os-service-card__media">
                            {imageSrc ? (
                                <Image
                                    src={imageSrc}
                                    alt={item.name}
                                    fill
                                    className="os-service-card__image"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="os-service-card__placeholder" aria-hidden />
                            )}
                            <div className="os-service-card__overlay" aria-hidden />
                            <div className="os-service-card__badges">
                                {item.isOnline ? <span className="os-service-card__badge">Online</span> : null}
                                {item.isPresential ? <span className="os-service-card__badge">Presencial</span> : null}
                            </div>
                            <p className="os-service-card__price-tag">{price}</p>
                        </div>
                        <div className="os-service-card__body">
                            <h3 className="os-service-card__title">{item.name}</h3>
                            {item.description ? (
                                <p className="os-service-card__desc">{item.description}</p>
                            ) : null}
                            <div className="os-service-card__meta">
                                <span className="os-service-card__meta-item">
                                    <IconClock size={14} />
                                    {item.durationMinutes} min
                                </span>
                                {modality ? <span>{modality}</span> : null}
                            </div>
                            <button
                                type="button"
                                className="os-service-card__cta"
                                onClick={() => onBook?.(item.id)}
                            >
                                <IconCalendarEvent size={16} />
                                Reservar
                            </button>
                        </div>
                    </article>
                );
            })}
        </div>
    );

    if (variant === 'carousel') {
        return (
            <div className="os-service-scroller-wrap">
                {grid}
                <p className="os-service-scroller-hint" aria-hidden>Desliza para ver más</p>
            </div>
        );
    }

    return grid;
}
