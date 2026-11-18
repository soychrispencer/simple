import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import { PanelPageHeader } from '@simple/ui/panel';
import { AgendaGoogleCalendarIntegrationCard } from '@/components/panel/agenda-google-calendar-integration-card';

export default function CalendariosPage() {
    return (
        <div className="container-app panel-page max-w-4xl min-w-0 space-y-5 py-4 lg:py-8">
            <Link href="/panel/agenda" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-fg">
                <IconArrowLeft size={16} aria-hidden /> Volver a la agenda
            </Link>
            <PanelPageHeader
                title="Calendarios"
                description="Conecta tu Google Calendar para recibir las citas de tu perfil profesional."
            />
            <AgendaGoogleCalendarIntegrationCard />
            <Link href="/panel/mi-negocio/agenda#horario" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                Gestionar horarios y bloqueos de SimpleAgenda
            </Link>
        </div>
    );
}
