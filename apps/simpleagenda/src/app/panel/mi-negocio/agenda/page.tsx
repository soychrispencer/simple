'use client';

import {
    PanelBlockHeader,
} from '@simple/ui/panel';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { AgendaScheduleContent } from '@/components/panel/agenda-schedule-content';
import { AgendaConfiguracionesContent } from '@/components/panel/agenda-configuraciones-content';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';

export default function AgendaYReservasPage() {
    return (
        <AgendaMiNegocioShell
            activeKey="agenda"
            tabs={businessSectionTabs}
            title="Agenda y reservas"
            description="Organiza cuándo pueden reservarte y cómo se confirman, pagan y gestionan las citas."
        >
            <div className="space-y-8">
                <section id="horario" className="scroll-mt-24 space-y-4">
                    <PanelBlockHeader
                        title="Horario y disponibilidad"
                        description="Define tus días de atención, pausas y fechas en que no recibirás reservas."
                        className="mb-0"
                    />
                    <AgendaScheduleContent />
                </section>

                <section id="reservas" className="scroll-mt-24 space-y-4 border-t border-[var(--border)] pt-7">
                    <PanelBlockHeader
                        title="Reservas, pagos y avisos"
                        description="Ajusta confirmaciones, condiciones de reserva, cobros y notificaciones."
                        className="mb-0"
                    />
                    <AgendaConfiguracionesContent />
                </section>
            </div>
        </AgendaMiNegocioShell>
    );
}
