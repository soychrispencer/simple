'use client';

import { useEffect, useState } from 'react';
import { IconCalendar, IconCheck, IconClock, IconSparkles, IconUserPlus } from '@tabler/icons-react';
import {
    PanelEmptyState,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelNotice,
    PanelStatCard,
    PanelStatusBadge,
    SkeletonList,
} from '@simple/ui/panel';
import { fetchAdminAgendaActivation, type AdminAgendaActivationSnapshot } from '@/lib/api';

const STAGE_LABELS: Record<string, string> = {
    registered: 'Registrado', setup_pending: 'Configuración pendiente', ready_to_publish: 'Listo para publicar',
    published: 'Agenda publicada', first_booking: 'Primera reserva',
};

function formatDate(value: string | null): string {
    if (!value) return 'Sin ingreso registrado';
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value));
}

export function AgendaActivationSummary() {
    const [data, setData] = useState<AdminAgendaActivationSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        void fetchAdminAgendaActivation().then((result) => {
            if (active) setData(result);
        }).catch((cause) => {
            if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la medición de SimpleAgenda.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, []);

    const itemsToSetup = data?.items.filter((item) => !item.firstBooking).slice(0, 8) ?? [];

    return (
        <section className="mb-6 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div>
                <h2 className="text-base font-semibold text-[var(--fg)]">Activación de SimpleAgenda</h2>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">Consideramos configuración completa cuando tiene datos básicos, un servicio activo y disponibilidad. Publicación y primera reserva se miden aparte.</p>
            </div>
            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <PanelStatCard label="Registrados" value={String(data?.summary.registered ?? 0)} meta="Acceso a SimpleAgenda" icon={<IconUserPlus size={17} />} />
                <PanelStatCard label="Configuración completa" value={String(data?.summary.setupComplete ?? 0)} meta="Perfil, servicio y disponibilidad" icon={<IconCheck size={17} />} />
                <PanelStatCard label="Agenda publicada" value={String(data?.summary.published ?? 0)} meta="Visible para recibir reservas" icon={<IconCalendar size={17} />} />
                <PanelStatCard label="Primera reserva" value={String(data?.summary.firstBooking ?? 0)} meta="Señal de valor recibido" icon={<IconSparkles size={17} />} />
                <PanelStatCard label="Plan Pro activo" value={String(data?.summary.proActive ?? 0)} meta="Conversión de pago" icon={<IconClock size={17} />} />
            </div>
            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(180px,1fr)_minmax(150px,.9fr)_minmax(180px,1.2fr)_minmax(130px,.7fr)]">
                    <span>Usuario</span><span>Etapa</span><span>Siguiente paso sugerido</span><span>Último ingreso</span>
                </PanelListHeader>
                {loading ? <PanelListRow className="p-0"><SkeletonList count={3} /></PanelListRow>
                    : itemsToSetup.length === 0 ? <PanelListRow className="p-4"><PanelEmptyState title="Sin usuarios pendientes" description="Los usuarios registrados ya llegaron a su primera reserva." /></PanelListRow>
                        : itemsToSetup.map((item) => (
                            <PanelListRow key={item.userId} className="grid gap-2 p-4 md:grid-cols-[minmax(180px,1fr)_minmax(150px,.9fr)_minmax(180px,1.2fr)_minmax(130px,.7fr)] md:items-center">
                                <div className="min-w-0"><p className="truncate text-sm font-medium text-[var(--fg)]">{item.name}</p><p className="truncate text-xs text-[var(--fg-muted)]">{item.email}</p></div>
                                <PanelStatusBadge label={STAGE_LABELS[item.activationStage] || item.activationStage} tone={item.firstBooking ? 'success' : 'warning'} />
                                <p className="text-xs text-[var(--fg-secondary)]">{item.missing.length ? item.missing.join(' · ') : item.isPublished ? 'Ayudar a conseguir la primera reserva' : 'Publicar la agenda'}</p>
                                <p className="text-xs text-[var(--fg-muted)]">{formatDate(item.lastLoginAt)}</p>
                            </PanelListRow>
                        ))}
            </PanelList>
            {data && data.items.length > 8 ? <p className="text-xs text-[var(--fg-muted)]">Mostrando 8 de {data.items.length} cuentas. Usa el listado inferior para buscar una cuenta concreta.</p> : null}
        </section>
    );
}
