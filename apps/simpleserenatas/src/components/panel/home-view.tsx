'use client';

import { PanelButton, PanelCard, PanelStatusBadge } from '@simple/ui';
import type { ActiveProfile, Invitation, Serenata, SerenataGroup } from '@/lib/serenatas-api';
import { EmptyBlock, SerenataRow } from './shared';

type Section = 'home' | 'contratar' | 'serenatas' | 'groups' | 'invitations' | 'agenda' | 'map' | 'profile';

export function HomeView(props: {
    profile: ActiveProfile;
    serenatas: Serenata[];
    groups: SerenataGroup[];
    invitations: Invitation[];
    setSection: (section: Section) => void;
    openClientRequest?: () => void;
}) {
    const upcoming = props.serenatas.filter((item) => item.status === 'scheduled').slice(0, 3);
    const pendingApp = props.profile === 'coordinator'
        ? props.serenatas.filter((item) => item.source === 'platform_lead' && item.status === 'pending')
        : [];
    const reviewPending = () => {
        if (typeof window !== 'undefined') window.localStorage.setItem('serenatas-filter', 'pending');
        props.setSection('serenatas');
    };

    if (props.profile === 'client') {
        const pending = props.serenatas.filter((item) => item.status === 'payment_pending' || item.status === 'pending' || item.status === 'accepted_pending_group').length;
        const confirmed = props.serenatas.filter((item) => item.status === 'scheduled').length;
        const completed = props.serenatas.filter((item) => item.status === 'completed').length;

        return (
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                <PanelCard>
                    <div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cliente</p>
                            <h2 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                                Tus serenatas
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Revisa el estado de cada serenata que contrataste y mantén los datos del evento listos para el coordinador.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <Stat label="Contratadas" value={props.serenatas.length} />
                        <Stat label="En proceso" value={pending} />
                        <Stat label="Confirmadas" value={confirmed} />
                    </div>
                </PanelCard>

                <PanelCard>
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Acciones rápidas</h3>
                    <div className="mt-4 grid gap-2">
                        <PanelButton onClick={() => props.openClientRequest?.() ?? props.setSection('contratar')}>Contratar serenata</PanelButton>
                        <PanelButton variant="secondary" onClick={() => props.setSection('serenatas')}>Ver mis serenatas</PanelButton>
                        <PanelButton variant="secondary" onClick={() => props.setSection('profile')}>Mi cuenta</PanelButton>
                    </div>
                </PanelCard>

                <PanelCard className="md:col-span-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Estado de tus serenatas</h3>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Tus serenatas contratadas, confirmadas y completadas.
                            </p>
                        </div>
                        {completed > 0 ? <PanelStatusBadge tone="neutral" label={`${completed} completada${completed === 1 ? '' : 's'}`} /> : null}
                    </div>
                    <div className="mt-4 grid gap-3">
                        {props.serenatas.length === 0 ? (
                            <EmptyBlock title="Sin serenatas contratadas" description="Contrata una serenata para ver aquí el seguimiento del evento." />
                        ) : props.serenatas.slice(0, 4).map((item) => <SerenataRow key={item.id} item={item} context="client" />)}
                    </div>
                </PanelCard>

                <PanelCard className="md:col-span-2">
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Próximas serenatas</h3>
                    <div className="mt-4 grid gap-3">
                        {upcoming.length === 0 ? <EmptyBlock title="Sin serenatas confirmadas" description="Cuando un coordinador confirme una serenata, aparecerá aquí." /> : upcoming.map((item) => <SerenataRow key={item.id} item={item} context="client" />)}
                    </div>
                </PanelCard>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <PanelCard>
                <div>
                    <div>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{props.profile === 'coordinator' ? 'Coordinación' : props.profile === 'musician' ? 'Músico' : 'Cliente'}</p>
                        <h2 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                            {props.profile === 'coordinator' ? 'Solicitudes y grupos en orden' : props.profile === 'musician' ? 'Tus invitaciones y agenda' : 'Tus serenatas en un solo lugar'}
                        </h2>
                    </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Stat label={props.profile === 'coordinator' ? 'Solicitudes' : 'Serenatas'} value={props.serenatas.length} />
                    <Stat label="Grupos" value={props.groups.length} />
                    <Stat label="Invitaciones" value={props.invitations.length} />
                </div>
            </PanelCard>

            <PanelCard>
                <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Acciones rápidas</h3>
                <div className="mt-4 grid gap-2">
                    {props.profile === 'coordinator' ? (
                        <>
                            <PanelButton onClick={() => props.setSection('serenatas')}>Crear serenata</PanelButton>
                            <PanelButton variant="secondary" onClick={() => props.setSection('groups')}>Organizar grupos</PanelButton>
                            <PanelButton variant="secondary" onClick={() => props.setSection('map')}>Ver ruta</PanelButton>
                        </>
                    ) : props.profile === 'musician' ? (
                        <>
                            <PanelButton onClick={() => props.setSection('invitations')}>Ver invitaciones</PanelButton>
                            <PanelButton variant="secondary" onClick={() => props.setSection('agenda')}>Ver agenda</PanelButton>
                            <PanelButton variant="secondary" onClick={() => props.setSection('profile')}>Editar perfil</PanelButton>
                        </>
                    ) : (
                        <>
                            <PanelButton onClick={() => props.setSection('serenatas')}>Ver Mis Serenatas</PanelButton>
                            <PanelButton variant="secondary" onClick={() => props.setSection('profile')}>Mi cuenta</PanelButton>
                        </>
                    )}
                </div>
            </PanelCard>

            {props.profile === 'coordinator' ? (
                <PanelCard className="md:col-span-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Solicitudes de la aplicación</h3>
                                {pendingApp.length > 0 ? <PanelStatusBadge tone="info" label={`${pendingApp.length} pendiente${pendingApp.length === 1 ? '' : 's'}`} /> : null}
                            </div>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Revisa serenatas disponibles para aceptar antes de organizar grupo y ruta.
                            </p>
                        </div>
                        <PanelButton variant={pendingApp.length > 0 ? 'primary' : 'secondary'} onClick={reviewPending}>
                            Revisar
                        </PanelButton>
                    </div>
                    <div className="mt-4 grid gap-3">
                        {pendingApp.length === 0 ? (
                            <EmptyBlock title="Sin solicitudes pendientes" description="Cuando la aplicación te ofrezca una serenata, aparecerá aquí." />
                        ) : pendingApp.slice(0, 3).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={reviewPending}
                                className="flex items-center justify-between gap-3 rounded-xl border p-4 text-left"
                                style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-soft)' }}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.recipientName}</p>
                                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{item.eventTime} · {item.comuna ?? 'Sin comuna'}</p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(item.price ?? 0)}
                                </span>
                            </button>
                        ))}
                    </div>
                </PanelCard>
            ) : null}

            <PanelCard className="md:col-span-2">
                <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Próximas serenatas</h3>
                <div className="mt-4 grid gap-3">
                    {upcoming.length === 0 ? <EmptyBlock title="Sin serenatas próximas" description="Cuando exista agenda, aparecerá aquí." /> : upcoming.map((item) => <SerenataRow key={item.id} item={item} />)}
                </div>
            </PanelCard>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
            <p className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{label}</p>
        </div>
    );
}
