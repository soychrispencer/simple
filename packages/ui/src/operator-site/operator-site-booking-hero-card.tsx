'use client';

import { IconCalendarEvent, IconChevronRight } from '@tabler/icons-react';
import { formatOperatorServicePrice } from '@simple/utils';
import type { OperatorSiteCatalog } from './types.js';

export function OperatorSiteBookingHeroCard({
    catalog,
    onBook,
    onViewAll,
}: {
    catalog: OperatorSiteCatalog;
    onBook: (serviceId: string) => void;
    onViewAll: () => void;
}) {
    const services = catalog.services.slice(0, 3);

    return (
        <div className="os-hero__booking-widget os-glass">
            <p className="os-hero__booking-label">Reserva online</p>
            <p className="os-hero__booking-hint">Elige un servicio y agenda en minutos.</p>

            {services.length > 0 ? (
                <div className="os-hero__booking-services">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            type="button"
                            className="os-hero__booking-service"
                            onClick={() => onBook(service.id)}
                        >
                            <span className="min-w-0 text-left">
                                <span className="os-hero__booking-service-name">{service.name}</span>
                                <span className="os-hero__booking-service-meta">
                                    {service.durationMinutes} min ·{' '}
                                    {formatOperatorServicePrice({
                                        pricingMode: 'fixed',
                                        price: service.price,
                                        currency: service.currency,
                                    })}
                                </span>
                            </span>
                            <IconCalendarEvent size={16} className="shrink-0" />
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-(--fg-secondary) py-2">
                    Configura tus servicios para activar reservas en línea.
                </p>
            )}

            <button type="button" className="os-hero__booking-all" onClick={onViewAll}>
                Ver todos los servicios
                <IconChevronRight size={16} />
            </button>
        </div>
    );
}
