'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconCalendarEvent, IconLoader2, IconMapPin, IconPlus, IconUser } from '@tabler/icons-react';
import {
    createAgendaAccountVisit,
    fetchAgendaAccountVisits,
    searchAgendaAccountVisitMembers,
    updateAgendaAccountVisit,
    type AgendaAccountVisit,
    type AgendaAccountVisitMember,
    type AgendaAccountVisitsState,
} from '@simple/utils';
import { PanelButton, PanelCard, PanelNotice, PanelPageHeader } from '@simple/ui/panel';

const STATUS_LABELS: Record<AgendaAccountVisit['status'], string> = {
    scheduled: 'Agendada',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Realizada',
    no_show: 'No asistió',
};

function formatVisitDate(value: string): string {
    return new Date(value).toLocaleString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function initialDateTimeLocal(): string {
    const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
    date.setMinutes(0, 0, 0);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function MemberPicker({
    label,
    value,
    currentName,
    initialMembers,
    initialMembersHaveMore = false,
    unassignedLabel,
    disabled = false,
    compact = false,
    onChange,
}: {
    label: string;
    value: string;
    currentName?: string | null;
    initialMembers: AgendaAccountVisitMember[];
    initialMembersHaveMore?: boolean;
    unassignedLabel: string;
    disabled?: boolean;
    compact?: boolean;
    onChange: (userId: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [members, setMembers] = useState(initialMembers);
    const [hasMore, setHasMore] = useState(false);
    const [nextOffset, setNextOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [expanded, setExpanded] = useState(!compact);
    const queryRef = useRef(query);

    useEffect(() => {
        const trimmed = query.trim();
        setLoading(false);
        if (!trimmed) {
            setMembers(initialMembers);
            setHasMore(false);
            setNextOffset(initialMembers.length);
            setSearchError(false);
            setLoading(false);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(() => {
            setLoading(true);
            setSearchError(false);
            void searchAgendaAccountVisitMembers(trimmed).then((result) => {
                if (cancelled) return;
                if (!result) {
                    setMembers([]);
                    setHasMore(false);
                    setNextOffset(0);
                    setSearchError(true);
                    return;
                }
                setMembers(result.members);
                setHasMore(result.hasMore);
                setNextOffset(result.nextOffset);
            }).catch(() => {
                if (cancelled) return;
                setMembers([]);
                setHasMore(false);
                setNextOffset(0);
                setSearchError(true);
            }).finally(() => {
                if (!cancelled) setLoading(false);
            });
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [initialMembers, query]);

    async function loadMore() {
        const requestedQuery = query.trim();
        if (loading || !hasMore || !requestedQuery) return;
        setLoading(true);
        setSearchError(false);
        try {
            const result = await searchAgendaAccountVisitMembers(requestedQuery, nextOffset);
            if (queryRef.current.trim() !== requestedQuery) return;
            if (!result) setSearchError(true);
            else {
                setMembers((current) => {
                    const loadedIds = new Set(current.map((member) => member.userId));
                    return [...current, ...result.members.filter((member) => !loadedIds.has(member.userId))];
                });
                setHasMore(result.hasMore);
                setNextOffset(result.nextOffset);
            }
        } catch {
            if (queryRef.current.trim() === requestedQuery) setSearchError(true);
        } finally {
            if (queryRef.current.trim() === requestedQuery) setLoading(false);
        }
    }

    const selectedMemberIsListed = members.some((member) => member.userId === value);
    const selectedMemberName = members.find((member) => member.userId === value)?.name ?? currentName;
    const textClass = compact ? 'text-xs' : 'text-sm';
    return (
        <div className={`grid min-w-0 gap-1.5 ${compact ? 'w-40' : ''}`}>
            {compact ? (
                <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((open) => !open)}
                    disabled={disabled}
                    className="rounded-lg border px-2 py-2 text-left"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                >
                    <span className="block text-[11px]" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                    <span className="block truncate text-xs font-medium">{value ? selectedMemberName || 'Integrante asignado' : unassignedLabel}</span>
                </button>
            ) : <span className={`${textClass} font-medium`} style={{ color: 'var(--fg)' }}>{label}</span>}
            {expanded ? (
                <>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => {
                            queryRef.current = event.target.value;
                            setQuery(event.target.value);
                        }}
                        disabled={disabled}
                        aria-label={`Buscar ${label.toLowerCase()}`}
                        placeholder="Buscar por nombre o correo"
                        className={`h-9 min-w-0 rounded-lg border px-2 ${textClass}`}
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    />
                    <select
                        aria-label={label}
                        value={value}
                        disabled={disabled || loading}
                        onChange={(event) => onChange(event.target.value)}
                        className={`h-9 min-w-0 rounded-lg border px-2 ${textClass}`}
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    >
                        <option value="">{unassignedLabel}</option>
                        {value && !selectedMemberIsListed ? <option value={value}>{currentName || 'Integrante asignado'}</option> : null}
                        {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                    </select>
                    {loading ? <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Buscando integrantes…</span> : null}
                    {searchError ? <span className="text-xs" style={{ color: 'var(--danger)' }}>No pudimos buscar. Inténtalo nuevamente.</span> : null}
                    {!query.trim() && initialMembersHaveMore ? <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Busca por nombre para encontrar a más integrantes.</span> : null}
                    {hasMore && query.trim() ? (
                        <button type="button" disabled={loading} onClick={() => void loadMore()} className="text-left text-xs font-medium underline underline-offset-2" style={{ color: 'var(--fg-muted)' }}>
                            Mostrar más resultados
                        </button>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}

export default function TeamVisitsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [state, setState] = useState<AgendaAccountVisitsState | null>(null);
    const [loading, setLoading] = useState(true);
    const [openForm, setOpenForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [busyVisitId, setBusyVisitId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        visitType: 'property_visit' as AgendaAccountVisit['visitType'],
        listingId: '',
        contactUserId: '',
        contactName: '',
        contactPhone: '',
        assignedUserId: '',
        startsAt: '',
        durationMinutes: 30,
        location: '',
        internalNotes: '',
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchAgendaAccountVisits();
            setState(result);
            if (!result) setError('Revisa tu conexión e inténtalo nuevamente.');
        } catch {
            setState(null);
            setError('Revisa tu conexión e inténtalo nuevamente.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        if (!state?.enabled || searchParams.get('nueva') !== '1') return;
        const requestedContactId = searchParams.get('contactoId') ?? '';
        const contact = state.contacts.find((item) => item.id === requestedContactId);
        const requestedListingId = searchParams.get('propiedadId') ?? '';
        const requestedListing = state.listings.find((item) => item.id === requestedListingId);
        const hasContactOrListingContext = Boolean(requestedContactId || requestedListingId);
        const listingId = requestedListing?.id
            ?? (hasContactOrListingContext ? '' : state.listings[0]?.id ?? '');
        const contactUserId = contact?.id ?? '';
        setForm((current) => ({
            ...current,
            visitType: listingId ? 'property_visit' : 'brokerage_meeting',
            listingId,
            contactUserId,
            contactName: contact?.name ?? searchParams.get('contactoNombre') ?? '',
            startsAt: initialDateTimeLocal(),
        }));
        setOpenForm(true);
        router.replace('/panel/visitas-equipo', { scroll: false });
    }, [router, searchParams, state]);

    const listingNames = useMemo(() => new Map((state?.listings ?? []).map((listing) => [listing.id, listing.title])), [state?.listings]);
    const showTeamOverview = Boolean(state?.teamMode && state.canManage);

    function startCreate() {
        setError(null);
        setForm({
            visitType: state?.listings.length ? 'property_visit' : 'brokerage_meeting',
            listingId: state?.listings[0]?.id ?? '',
            contactUserId: '',
            contactName: '',
            contactPhone: '',
            assignedUserId: '',
            startsAt: initialDateTimeLocal(),
            durationMinutes: 30,
            location: '',
            internalNotes: '',
        });
        setOpenForm(true);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setError(null);
        const result = await createAgendaAccountVisit({
            visitType: form.visitType,
            listingId: form.listingId || null,
            contactUserId: form.contactUserId || null,
            contactName: form.contactName.trim(),
            contactPhone: form.contactPhone.trim(),
            assignedUserId: form.assignedUserId || null,
            startsAt: new Date(form.startsAt).toISOString(),
            durationMinutes: form.durationMinutes,
            location: form.location.trim(),
            internalNotes: form.internalNotes.trim(),
        });
        setSaving(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos agendar la visita.');
            return;
        }
        setOpenForm(false);
        await load();
    }

    async function changeVisit(visitId: string, patch: Parameters<typeof updateAgendaAccountVisit>[1]) {
        if (busyVisitId) return;
        setBusyVisitId(visitId);
        setError(null);
        const result = await updateAgendaAccountVisit(visitId, patch);
        if (!result.ok) setError(result.error ?? 'No pudimos guardar la visita.');
        else await load();
        setBusyVisitId(null);
    }

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title={showTeamOverview ? 'Visitas del equipo' : 'Mis visitas'}
                description={showTeamOverview
                    ? <>Gestiona las visitas y reuniones de {state?.accountName || 'tu equipo'} desde la cartera de SimplePropiedades. Cada integrante ve sus actividades y, si conecta Google Calendar en <a href="/panel/mi-cuenta/integraciones" className="font-medium underline underline-offset-2">Integraciones</a>, también las verá allí.</>
                    : state?.teamMode
                        ? <>Revisa las visitas y reuniones que te asignaron en {state?.accountName || 'tu equipo'}. Si conectas Google Calendar en <a href="/panel/mi-cuenta/integraciones" className="font-medium underline underline-offset-2">Integraciones</a>, también las verás allí.</>
                        : <>Organiza visitas a tus propiedades y reuniones con clientes. Si conectas Google Calendar desde <a href="/panel/mi-cuenta/integraciones" className="font-medium underline underline-offset-2">Integraciones</a>, también verás allí tus actividades.</>}
                actions={state?.enabled ? (
                    <PanelButton type="button" onClick={startCreate} disabled={loading}>
                        <IconPlus size={16} /> Agendar
                    </PanelButton>
                ) : undefined}
            />

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={18} className="animate-spin" /> Cargando visitas…
                </div>
            ) : !state ? (
                <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
                    <PanelNotice tone="error">No pudimos cargar las visitas. {error ?? 'Revisa tu conexión e inténtalo nuevamente.'}</PanelNotice>
                    <PanelButton type="button" variant="secondary" onClick={() => void load()} loading={loading}>
                        Reintentar
                    </PanelButton>
                </div>
            ) : !state.enabled ? (
                <PanelCard size="md" className="space-y-2">
                    <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Prepara tu espacio inmobiliario</h2>
                    <p className="text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                        Configura tu actividad en SimplePropiedades para coordinar visitas y reuniones desde SimpleAgenda.
                    </p>
                </PanelCard>
            ) : (
                <div className="grid gap-4">
                    {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

                    {openForm ? (
                        <PanelCard size="lg" className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Nueva visita o reunión</h2>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>Elige qué necesitas coordinar y con quién.</p>
                            </div>
                            <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    ¿Qué vas a coordinar?
                                    <select value={form.visitType} onChange={(event) => {
                                        const visitType = event.target.value as AgendaAccountVisit['visitType'];
                                        setForm((current) => ({
                                            ...current,
                                            visitType,
                                            listingId: visitType === 'brokerage_meeting' ? '' : current.listingId,
                                        }));
                                    }} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                                        <option value="property_visit">Visita a propiedad o proyecto</option>
                                        <option value="brokerage_meeting">Reunión comercial</option>
                                    </select>
                                </label>
                                <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    {form.visitType === 'property_visit' ? 'Propiedad o proyecto' : 'Propiedad relacionada'}
                                    <select required={form.visitType === 'property_visit'} value={form.listingId} onChange={(event) => setForm((current) => ({ ...current, listingId: event.target.value }))} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                                        <option value="">{form.visitType === 'property_visit' ? 'Selecciona una propiedad o proyecto' : 'Sin propiedad asociada'}</option>
                                        {state.listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
                                    </select>
                                </label>
                                <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Contacto
                                    <select value={form.contactUserId} onChange={(event) => {
                                        const contactUserId = event.target.value;
                                        const contact = state.contacts.find((item) => item.id === contactUserId);
                                        setForm((current) => ({ ...current, contactUserId, contactName: contact?.name ?? '' }));
                                    }} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                                        <option value="">Otro interesado</option>
                                        {state.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                                    </select>
                                </label>
                                <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Nombre del interesado
                                    <input required value={form.contactName} readOnly={Boolean(form.contactUserId)} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} maxLength={160} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }} />
                                </label>
                                <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Fecha y hora <span className="font-normal" style={{ color: 'var(--fg-muted)' }}>Revisaremos disponibilidad al guardar</span>
                                    <input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }} />
                                </label>
                                <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Duración
                                    <select value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                                        <option value={30}>30 minutos</option><option value={45}>45 minutos</option><option value={60}>1 hora</option><option value={90}>1 hora y media</option><option value={120}>2 horas</option>
                                    </select>
                                </label>
                                {state.canManage ? (
                                    <MemberPicker
                                        label="Responsable"
                                        value={form.assignedUserId}
                                        initialMembers={state.members}
                                        initialMembersHaveMore={state.membersHaveMore}
                                        unassignedLabel="Yo la atenderé"
                                        onChange={(assignedUserId) => setForm((current) => ({ ...current, assignedUserId }))}
                                    />
                                ) : null}
                                <details className="sm:col-span-2 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                                    <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>Más detalles (opcionales)</summary>
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                        <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            Teléfono
                                            <input value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} maxLength={30} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }} />
                                        </label>
                                        <label className="grid gap-1.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            Lugar
                                            <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} maxLength={255} placeholder={form.visitType === 'property_visit' ? 'Dirección de la propiedad' : 'Lugar de la reunión'} className="h-11 rounded-xl border px-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }} />
                                        </label>
                                        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2" style={{ color: 'var(--fg)' }}>
                                            Nota para el equipo
                                            <textarea value={form.internalNotes} onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))} maxLength={2000} rows={2} className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }} />
                                        </label>
                                    </div>
                                </details>
                                <div className="flex justify-end gap-2 sm:col-span-2">
                                    <PanelButton type="button" variant="ghost" onClick={() => setOpenForm(false)} disabled={saving}>Cancelar</PanelButton>
                                    <PanelButton type="submit" loading={saving} disabled={form.visitType === 'property_visit' && !form.listingId}>Guardar</PanelButton>
                                </div>
                            </form>
                        </PanelCard>
                    ) : null}

                    {state.listings.length === 0 ? (
                        <PanelNotice tone="neutral">Aún no tienes propiedades publicadas. Puedes agendar una reunión comercial mientras preparas tu cartera.</PanelNotice>
                    ) : null}

                    {state.visits.length === 0 ? (
                        <PanelCard size="md" className="py-10 text-center">
                            <IconCalendarEvent size={26} className="mx-auto" style={{ color: 'var(--fg-faint)' }} />
                            <p className="mt-3 font-semibold" style={{ color: 'var(--fg)' }}>Aún no hay visitas ni reuniones</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                {showTeamOverview
                                    ? 'Las visitas y reuniones de tu equipo aparecerán aquí.'
                                    : state.teamMode
                                        ? 'Las visitas que te asignen y las que coordines aparecerán aquí.'
                                        : 'Tus visitas y reuniones aparecerán aquí.'}
                            </p>
                            <PanelButton type="button" className="mt-4" onClick={startCreate}>Agendar</PanelButton>
                        </PanelCard>
                    ) : (
                        <div className="grid gap-3">
                            {state.visits.map((visit) => {
                                const listingTitle = listingNames.get(visit.listingId ?? '') ?? null;
                                const visitTitle = visit.visitType === 'brokerage_meeting'
                                    ? `Reunión comercial${listingTitle ? ` · ${listingTitle}` : ''}`
                                    : listingTitle ?? 'Propiedad retirada';
                                return (
                                    <PanelCard key={visit.id} size="md" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold" style={{ color: 'var(--fg)' }}>{visitTitle}</p>
                                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                <span className="inline-flex items-center gap-1"><IconCalendarEvent size={14} /> {formatVisitDate(visit.startsAt)} · {visit.durationMinutes} min</span>
                                                <span className="inline-flex items-center gap-1"><IconUser size={14} /> {visit.contactName}</span>
                                                {visit.location ? <span className="inline-flex items-center gap-1"><IconMapPin size={14} /> {visit.location}</span> : null}
                                            </p>
                                            {visit.internalNotes ? <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>{visit.internalNotes}</p> : null}
                                            <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                Responsable: {visit.assignedUserName ?? 'Sin asignar'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                            {state.canManage ? (
                                                <MemberPicker
                                                    label="Responsable"
                                                    value={visit.assignedUserId ?? ''}
                                                    currentName={visit.assignedUserName}
                                                    initialMembers={state.members}
                                                    initialMembersHaveMore={state.membersHaveMore}
                                                    unassignedLabel="Sin asignar"
                                                    disabled={busyVisitId === visit.id}
                                                    compact
                                                    onChange={(assignedUserId) => void changeVisit(visit.id, { assignedUserId: assignedUserId || null })}
                                                />
                                            ) : null}
                                            <select aria-label={`Estado de la visita de ${visit.contactName}`} value={visit.status} disabled={busyVisitId === visit.id} onChange={(event) => void changeVisit(visit.id, { status: event.target.value as AgendaAccountVisit['status'] })} className="h-9 rounded-lg border px-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                                                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                            </select>
                                        </div>
                                    </PanelCard>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
