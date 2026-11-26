'use client';

import { useEffect, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { PanelButton, PanelCard, PanelNotice } from '@simple/ui/panel';
import { usePanelFormatters } from '@simple/auth';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';

type Team = {
    workspace: { name: string; canManage: boolean } | null;
    members: Array<{ id: string; userId?: string; name: string; role: string; hasAgenda?: boolean }>;
    agendas: Array<{ id: string; slug?: string; name?: string; displayName?: string }>;
    assignments: Array<{ membershipId: string; professionalId: string }>;
    seatSummary?: {
        activeAgendas: number;
        includedSeats: number;
        maxSeats: number;
        extraSeats?: number;
        extraSeatUnitNetClp?: number;
        totalMonthlyNetClp?: number;
    };
};
type TeamOverview = {
    summaryByProfessional: Array<{
        professionalId: string;
        displayName: string;
        slug: string;
        upcomingCount: number;
        completedCount: number;
        paidRevenue: number;
        pendingRevenue: number;
    }>;
    upcomingAppointments: Array<{
        id: string;
        professionalId: string;
        professionalName: string;
        clientName: string | null;
        startsAt: string;
        status: string;
        paymentStatus: string;
    }>;
};
type Appointment = { id: string; clientName: string | null; startsAt: string; status: string; paymentStatus: string };
type Service = { id: string; name: string; isOnline: boolean; isPresential: boolean };
type Slots = { slots: Array<{ startsAt: string }>; timezone: string; expectedStartsAt?: string };

async function teamRequest<T>(path = '', options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}/api/agenda/team${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? 'No pudimos completar esta acción. Revisa tu acceso e inténtalo de nuevo.');
    }
    return body as T;
}

function ReceptionSchedule({ agenda, appointment, onSave, onClose }: {
    agenda: string;
    appointment: Appointment | null;
    onSave: () => void;
    onClose: () => void;
}) {
    const route = `/agendas/${encodeURIComponent(agenda)}`;
    const [services, setServices] = useState<Service[]>([]);
    const [allowsManualBooking, setAllowsManualBooking] = useState(true);
    const [bookingPath, setBookingPath] = useState<string | null>(null);
    const [serviceId, setServiceId] = useState('');
    const [date, setDate] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [modality, setModality] = useState('');
    const [slots, setSlots] = useState<Slots | null>(null);
    const [selected, setSelected] = useState('');
    const [error, setError] = useState('');
    const [working, setWorking] = useState(false);
    const target = appointment ? { appointmentId: appointment.id } : { serviceId };
    const service = services.find((item) => item.id === serviceId);

    useEffect(() => {
        if (appointment) return;
        let active = true;
        void teamRequest<{ services: Service[]; allowsManualBooking: boolean; bookingPath: string | null }>(`${route}/services`)
            .then((value) => {
                if (!active) return;
                setServices(value.services);
                setAllowsManualBooking(value.allowsManualBooking);
                setBookingPath(value.bookingPath);
            }).catch((failure: Error) => { if (active) setError(failure.message); });
        return () => { active = false; };
    }, [route, appointment]);

    async function searchSlots() {
        setWorking(true);
        setError('');
        setSelected('');
        setSlots(null);
        try {
            const query = new URLSearchParams({ date, ...(appointment ? { appointmentId: appointment.id } : { serviceId }) });
            setSlots(await teamRequest<Slots>(`${route}/schedule?${query}`));
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'No pudimos consultar las horas.');
        } finally {
            setWorking(false);
        }
    }

    async function submit() {
        if (working || !selected) return;
        setWorking(true);
        setError('');
        try {
            await teamRequest(`${route}/schedule`, {
                method: 'POST',
                body: JSON.stringify({ ...target, startsAt: selected, expectedStartsAt: slots?.expectedStartsAt ?? appointment?.startsAt,
                    clientName: name || undefined, clientEmail: email || undefined, modality: modality || undefined }),
            });
            onSave();
        } catch (failure) {
            setSelected('');
            setSlots(null);
            setError(failure instanceof Error ? failure.message : 'No pudimos guardar la cita.');
        } finally {
            setWorking(false);
        }
    }

    return (
        <div className="space-y-4 rounded-2xl border border-(--border) p-4">
            <h3 className="font-semibold">{appointment ? 'Cambiar horario' : 'Nueva cita'}</h3>
            {!appointment && !allowsManualBooking && (
                <PanelNotice tone="info">
                    Esta agenda pide anticipo.
                    {bookingPath ? <a href={bookingPath} target="_blank" rel="noreferrer" className="ml-1 font-semibold underline">Abrir enlace de reservas</a>
                        : ' El profesional debe publicar su enlace de reservas antes de compartirlo.'}
                </PanelNotice>
            )}
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
                <fieldset className="grid gap-4 sm:grid-cols-2" disabled={working}>
                    {!appointment && allowsManualBooking && (
                        <>
                            <label className="block text-sm font-medium">Servicio
                                <select className="form-input mt-1" required value={serviceId} onChange={(event) => {
                                    setServiceId(event.target.value); setModality(''); setSlots(null); setSelected('');
                                }}>
                                    <option value="">Selecciona un servicio</option>
                                    {services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                            {service?.isOnline && service.isPresential && (
                                <label className="block text-sm font-medium">Modalidad
                                    <select className="form-input mt-1" required value={modality} onChange={(event) => setModality(event.target.value)}>
                                        <option value="">Selecciona</option><option value="online">Online</option><option value="presential">Presencial</option>
                                    </select>
                                </label>
                            )}
                            <label className="block text-sm font-medium">Nombre del cliente
                                <input className="form-input mt-1" value={name} required maxLength={160} onChange={(event) => setName(event.target.value)} />
                            </label>
                            <label className="block text-sm font-medium">Correo para el comprobante
                                <input className="form-input mt-1" value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
                            </label>
                        </>
                    )}
                    {(appointment || allowsManualBooking) && (
                        <label className="block text-sm font-medium">Fecha
                            <input className="form-input mt-1" type="date" required value={date} onChange={(event) => {
                                setDate(event.target.value); setSlots(null); setSelected('');
                            }} />
                        </label>
                    )}
                </fieldset>
                {(appointment || allowsManualBooking) && (
                    <PanelButton type="button" variant="secondary" disabled={working || !date || (!appointment && !serviceId)} onClick={() => void searchSlots()}>
                        Ver horas
                    </PanelButton>
                )}
                {slots && (slots.slots.length ? (
                    <div className="flex flex-wrap gap-2" aria-label="Horas disponibles">
                        {slots.slots.map(({ startsAt }) => (
                            <button key={startsAt} type="button" aria-pressed={selected === startsAt} disabled={working}
                                onClick={() => setSelected(startsAt)}
                                className="min-h-11 rounded-lg border border-(--border) px-3 text-sm aria-pressed:border-(--accent) aria-pressed:bg-(--accent-subtle)">
                                {new Date(startsAt).toLocaleTimeString('es-CL', { timeZone: slots.timezone, hour: '2-digit', minute: '2-digit' })}
                            </button>
                        ))}
                    </div>
                ) : <p role="status" className="text-sm text-fg-muted">No hay horas disponibles para esa fecha.</p>)}
                {error && <PanelNotice tone="error">{error}</PanelNotice>}
                <div className="flex flex-wrap gap-2">
                    <PanelButton type="submit" disabled={!selected || working}>{appointment ? 'Guardar nuevo horario' : 'Crear cita'}</PanelButton>
                    <PanelButton type="button" variant="secondary" disabled={working} onClick={onClose}>Cerrar</PanelButton>
                </div>
            </form>
        </div>
    );
}

export default function EquipoAgendaPage() {
    const [team, setTeam] = useState<Team | null>(null);
    const [overview, setOverview] = useState<TeamOverview | null>(null);
    const [member, setMember] = useState('');
    const [agenda, setAgenda] = useState('');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirming, setConfirming] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState('');
    const [schedule, setSchedule] = useState<Appointment | 'new' | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('admin');
    const [inviting, setInviting] = useState(false);
    const fmt = usePanelFormatters();

    useEffect(() => {
        let active = true;
        void teamRequest<Team>().then((value) => {
            if (!active) return;
            setTeam(value);
            if (value.workspace?.canManage) {
                void teamRequest<TeamOverview>('/overview')
                    .then((ov) => { if (active) setOverview(ov); })
                    .catch(() => {});
            }
        })
            .catch((failure: Error) => { if (active) setError(failure.message); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!agenda || !team?.workspace || team.workspace.canManage) return;
        let active = true;
        setBusy(true);
        setError('');
        setAppointments([]);
        void teamRequest<{ appointments: Appointment[] }>(`/agendas/${encodeURIComponent(agenda)}/appointments`)
            .then((value) => { if (active) setAppointments(value.appointments); })
            .catch((failure: Error) => { if (active) setError(failure.message); })
            .finally(() => { if (active) setBusy(false); });
        return () => { active = false; };
    }, [agenda, team, refresh]);

    const assigned = team?.assignments.some((item) => item.membershipId === member && item.professionalId === agenda);
    async function toggleAssignment(targetMember = member, targetAgenda = agenda, nextEnabled = !assigned) {
        setBusy(true);
        setError('');
        setConfirmation('');
        try {
            await teamRequest('/assignment', {
                method: 'PUT',
                body: JSON.stringify({ membershipId: targetMember, professionalId: targetAgenda, enabled: nextEnabled }),
            });
            setTeam(await teamRequest<Team>());
            setConfirmation(nextEnabled ? 'Acceso de recepción asignado.' : 'Acceso retirado.');
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'No pudimos guardar el acceso.');
        } finally {
            setBusy(false);
        }
    }

    async function sendTeamInvite(event: React.FormEvent) {
        event.preventDefault();
        const email = inviteEmail.trim();
        if (!email || inviting) return;
        setInviting(true);
        setError('');
        setConfirmation('');
        try {
            const response = await fetch(`${API_BASE}/api/accounts/current/invitations?vertical=agenda`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role: inviteRole }),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok || !body?.ok) {
                throw new Error(body?.error ?? 'No pudimos enviar la invitación.');
            }
            setInviteEmail('');
            setConfirmation(`Invitación enviada a ${email}. Cuando la acepte, podrás activar su agenda aquí.`);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'No pudimos enviar la invitación.');
        } finally {
            setInviting(false);
        }
    }

    async function activateTeamAgenda(membershipId: string) {
        setBusy(true);
        setError('');
        setConfirmation('');
        try {
            await teamRequest('/agendas', {
                method: 'POST',
                body: JSON.stringify({ membershipId }),
            });
            setTeam(await teamRequest<Team>());
            setConfirmation('Agenda profesional activada para el integrante.');
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'No pudimos activar la agenda.');
        } finally {
            setBusy(false);
        }
    }

    async function confirmAppointment(id: string) {
        setConfirming(id);
        setError('');
        setConfirmation('');
        try {
            await teamRequest(`/agendas/${encodeURIComponent(agenda)}/appointments/${encodeURIComponent(id)}/confirm`, { method: 'POST' });
            setAppointments((items) => items.map((item) => item.id === id ? { ...item, status: 'confirmed' } : item));
            setConfirmation('Cita confirmada.');
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'No pudimos confirmar la cita.');
        } finally {
            setConfirming(null);
        }
    }

    return (
        <AgendaMiNegocioShell activeKey="equipo" title="Recepción" description="Asigna asistentes para que gestionen citas de cada profesional." showPublishToggle={false}>
            {error && <PanelNotice tone="error">{error}</PanelNotice>}
            {confirmation && <PanelNotice tone="success">{confirmation}</PanelNotice>}
            {!team && !error && (
                <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
                    Cargando recepción…
                </p>
            )}
            {team && !team.workspace && <PanelNotice tone="info">Elige un espacio de negocio compatible para configurar accesos de recepción.</PanelNotice>}
            {team?.workspace && (
                <div className="space-y-4">
                    {team.workspace.canManage && team.seatSummary ? (
                        <PanelCard size="lg" className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="font-semibold">Profesionales del equipo</h2>
                                    <p className="text-xs text-fg-muted">
                                        Cada profesional tiene su propia agenda, horarios y enlace público dentro del centro.
                                    </p>
                                </div>
                                <span className="rounded-full border border-(--border) px-3 py-1 text-xs font-semibold">
                                    {team.seatSummary.activeAgendas} / {team.seatSummary.includedSeats} incluidos · máx. {team.seatSummary.maxSeats}
                                    {team.seatSummary.extraSeats ? ` (+${team.seatSummary.extraSeats} extra)` : ''}
                                </span>
                            </div>
                            {team.seatSummary.totalMonthlyNetClp ? (
                                <p className="text-xs text-fg-muted">
                                    Valor plan Equipos estimado: <strong>${team.seatSummary.totalMonthlyNetClp.toLocaleString('es-CL')} + IVA / mes</strong>
                                    {team.seatSummary.extraSeats
                                        ? ` (incluye ${team.seatSummary.extraSeats} adicional${team.seatSummary.extraSeats === 1 ? '' : 'es'} a +$${(team.seatSummary.extraSeatUnitNetClp ?? 4990).toLocaleString('es-CL')} + IVA c/u)`
                                        : ' (hasta 3 profesionales incluidos)'}
                                </p>
                            ) : null}
                            {team.agendas.length > 0 ? (
                                <ul className="divide-y divide-(--border)">
                                    {team.agendas.map((ag) => (
                                        <li key={ag.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                            <span className="font-medium">{ag.displayName || ag.name || 'Agenda profesional'}</span>
                                            {ag.slug ? (
                                                <a
                                                    href={`/${ag.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-medium text-accent-ink hover:underline"
                                                >
                                                    /{ag.slug}
                                                </a>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            {team.members.some((m) => !m.hasAgenda && m.role !== 'agent') ? (
                                <div className="border-t border-(--border) pt-3 space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                                        Integrantes sin agenda activa
                                    </p>
                                    <ul className="space-y-2">
                                        {team.members.filter((m) => !m.hasAgenda && m.role !== 'agent').map((m) => (
                                            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                                <span>{m.name}</span>
                                                <PanelButton
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={busy}
                                                    onClick={() => void activateTeamAgenda(m.id)}
                                                >
                                                    Activar agenda
                                                </PanelButton>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            <form onSubmit={(e) => void sendTeamInvite(e)} className="border-t border-(--border) pt-3 flex flex-wrap items-end gap-2">
                                <label className="flex-1 min-w-[200px] text-xs font-medium text-fg-secondary">
                                    Invitar por correo
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="profesional@centro.cl"
                                        className="form-input mt-1"
                                        disabled={inviting}
                                    />
                                </label>
                                <label className="text-xs font-medium text-fg-secondary">
                                    Rol
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value === 'agent' ? 'agent' : 'admin')}
                                        className="form-input mt-1"
                                        disabled={inviting}
                                    >
                                        <option value="admin">Profesional</option>
                                        <option value="agent">Recepción</option>
                                    </select>
                                </label>
                                <PanelButton type="submit" size="sm" disabled={inviting || !inviteEmail.trim()}>
                                    {inviting ? 'Enviando…' : 'Enviar invitación'}
                                </PanelButton>
                            </form>
                        </PanelCard>
                    ) : null}
                    {team.workspace.canManage && overview && overview.summaryByProfessional.length > 0 ? (
                        <PanelCard size="lg" className="space-y-4">
                            <div>
                                <h2 className="font-semibold">Resumen del centro (mes actual)</h2>
                                <p className="text-xs text-fg-muted">
                                    Citas próximas, atenciones completadas e ingresos por cada profesional del equipo.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {overview.summaryByProfessional.map((item) => (
                                    <div key={item.professionalId} className="rounded-xl border border-(--border) p-3 space-y-1">
                                        <p className="text-sm font-semibold truncate">{item.displayName}</p>
                                        <p className="text-xs text-fg-muted">
                                            {item.upcomingCount} próximas · {item.completedCount} completadas
                                        </p>
                                        <p className="text-xs font-medium">
                                            Pagado: ${Math.round(item.paidRevenue).toLocaleString('es-CL')}
                                            {item.pendingRevenue > 0 ? ` · Pendiente: $${Math.round(item.pendingRevenue).toLocaleString('es-CL')}` : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {overview.upcomingAppointments.length > 0 ? (
                                <div className="border-t border-(--border) pt-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                                        Próximas citas del equipo
                                    </p>
                                    <ul className="divide-y divide-(--border)">
                                        {overview.upcomingAppointments.slice(0, 10).map((appt) => (
                                            <li key={appt.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                                                <span>
                                                    <strong>{appt.professionalName}</strong> · {appt.clientName ?? 'Paciente'}
                                                </span>
                                                <span className="text-fg-muted">
                                                    {fmt.dateShort(appt.startsAt)} {fmt.time(appt.startsAt)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </PanelCard>
                    ) : null}
                    <PanelCard size="lg" className="space-y-4">
                    <h2 className="font-semibold">{team.workspace.name}</h2>
                    <p className="text-sm text-fg-muted">Recepción gestiona las citas de cada agenda asignada.</p>
                    {team.workspace.canManage && (
                        <label className="block text-sm font-medium">Asistente
                            <select className="form-input mt-1" value={member} disabled={busy} onChange={(event) => setMember(event.target.value)}>
                                <option value="">Selecciona un asistente</option>
                                {team.members.filter((item) => item.role === 'agent').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="block text-sm font-medium">Agenda
                        <select className="form-input mt-1" value={agenda} disabled={Boolean(confirming || schedule) || (busy && team.workspace.canManage)} onChange={(event) => setAgenda(event.target.value)}>
                            <option value="">Selecciona una agenda</option>
                            {team.agendas.map((item) => <option key={item.id} value={item.id}>{item.displayName || item.name || 'Agenda profesional'}</option>)}
                        </select>
                    </label>
                    {!team.workspace.canManage && agenda && (schedule ? (
                        <ReceptionSchedule agenda={agenda} appointment={schedule === 'new' ? null : schedule}
                            onSave={() => {
                                setSchedule(null);
                                setConfirmation('Cita guardada.');
                                setRefresh((value) => value + 1);
                            }}
                            onClose={() => setSchedule(null)}
                        />
                    ) : <PanelButton type="button" onClick={() => setSchedule('new')}>Nueva cita</PanelButton>)}
                    {team.workspace.canManage ? (
                        <div className="space-y-4">
                            <PanelButton disabled={!member || !agenda || busy} onClick={() => void toggleAssignment()}>
                                {assigned ? 'Retirar acceso' : 'Dar acceso a recepción'}
                            </PanelButton>
                            {team.assignments.length > 0 ? (
                                <div className="border-t border-(--border) pt-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Accesos activos</p>
                                    <ul className="divide-y divide-(--border)">
                                        {team.assignments.map((item) => {
                                            const mName = team.members.find((m) => m.id === item.membershipId)?.name ?? 'Asistente';
                                            const ag = team.agendas.find((a) => a.id === item.professionalId);
                                            const aName = ag?.displayName || ag?.name || 'Agenda profesional';
                                            return (
                                                <li key={`${item.membershipId}:${item.professionalId}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                                    <span><strong>{mName}</strong> → {aName}</span>
                                                    <PanelButton
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        disabled={busy}
                                                        onClick={() => void toggleAssignment(item.membershipId, item.professionalId, false)}
                                                    >
                                                        Retirar
                                                    </PanelButton>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ) : (
                                <p className="text-xs text-fg-muted">Aún no hay asistentes con acceso asignado.</p>
                            )}
                        </div>
                    ) : busy ? <p role="status">Cargando citas…</p> : agenda && (
                        appointments.length ? <ul className="divide-y divide-(--border)">
                            {appointments.map((item) => (
                                <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                                    <span>{item.clientName ?? 'Cita'} · {fmt.dateShort(item.startsAt)} {fmt.time(item.startsAt)}</span>
                                    <span>{item.paymentStatus === 'pending' ? 'Pago pendiente' : item.status === 'confirmed' ? 'Confirmada' : 'Por confirmar'}</span>
                                    {new Date(item.startsAt).getTime() > Date.now() && (
                                        <PanelButton type="button" size="sm" variant="secondary" disabled={Boolean(schedule || confirming)} onClick={() => setSchedule(item)}>
                                            Cambiar horario
                                        </PanelButton>
                                    )}
                                    {item.status === 'pending' && ['paid', 'not_required'].includes(item.paymentStatus) && new Date(item.startsAt).getTime() > Date.now() && (
                                        <PanelButton size="sm" variant="secondary" disabled={Boolean(schedule || confirming)} onClick={() => void confirmAppointment(item.id)}>
                                            {confirming === item.id ? 'Confirmando…' : 'Confirmar cita'}
                                        </PanelButton>
                                    )}
                                </li>
                            ))}
                        </ul> : <p className="text-sm text-fg-muted">No hay próximas citas para esta agenda.</p>
                    )}
                    </PanelCard>
                </div>
            )}
        </AgendaMiNegocioShell>
    );
}
