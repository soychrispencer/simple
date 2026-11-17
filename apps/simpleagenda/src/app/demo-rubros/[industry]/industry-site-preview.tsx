'use client';

import { AgendaOperatorSite } from '@simple/ui/operator-site';
import type { IndustrySiteDemo } from '@/lib/industry-site-demos';

function DemoBookingSample() {
    return (
        <div id="demo-reserva-muestra" className="os-demo-booking" aria-label="Ejemplo de horarios disponibles">
            <p className="os-demo-booking__label">Próximas horas disponibles</p>
            <div className="os-demo-booking__times" aria-hidden="true">
                <span>Mar · 10:30</span>
                <span>Mar · 12:00</span>
                <span>Mié · 16:00</span>
            </div>
            <div className="os-demo-booking__button" aria-hidden="true">Reservar una hora</div>
            <p className="os-demo-booking__note">Ejemplo visual · no se crean reservas</p>
        </div>
    );
}

function scrollToDemoBooking() {
    document.getElementById('demo-reserva-muestra')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function IndustrySitePreview({ demo }: { demo: IndustrySiteDemo }) {
    const booking = demo.appearance.layout === 'booking'
        ? (
            <section className="os-section os-demo-booking-section" aria-label="Ejemplo de reserva online">
                <div className="os-section__inner">
                    <div className="os-booking-panel">
                        <h2 className="os-booking-panel__title">Reserva online</h2>
                        <p className="os-booking-panel__lead">Elige una hora disponible para ver cómo se presenta la reserva.</p>
                        <div className="os-booking-shell"><DemoBookingSample /></div>
                    </div>
                </div>
            </section>
        )
        : <DemoBookingSample />;

    return (
        <AgendaOperatorSite
            profile={demo.profile}
            typeLabel="Profesional independiente"
            businessLabel={demo.businessLabel}
            socialLinks={[]}
            schedule={demo.schedule}
            catalog={demo.catalog}
            onServiceBook={scrollToDemoBooking}
            appearance={demo.appearance}
            booking={booking}
        />
    );
}
