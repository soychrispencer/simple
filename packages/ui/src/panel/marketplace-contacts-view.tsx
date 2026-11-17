'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconCheck,
    IconHistory,
    IconLoader2,
    IconMessageCircle,
    IconNotebook,
    IconPlus,
    IconSearch,
} from '@tabler/icons-react';
import {
    createMarketplaceContactTask,
    fetchMarketplaceContactDetail,
    fetchMarketplaceContactAssignment,
    fetchMarketplaceContactTasks,
    fetchMarketplaceContacts,
    updateMarketplaceContactAssignment,
    updateMarketplaceContactTask,
    type MarketplaceContact,
    type MarketplaceContactAssignmentContext,
    type MarketplaceContactDetail,
    type MarketplaceContactStage,
    type MarketplaceContactTask,
    type MessageVertical,
} from '@simple/utils';
import { PanelCard } from './panel-card.js';
import { PanelEmptyState } from './panel-display.js';
import { PanelSectionPage } from './panel-section-page.js';
import { RelationshipNotesPanel } from './relationship-notes-panel.js';

const TIMELINE_LABELS: Record<string, string> = {
    'lead.opened': 'Lead abierto',
    'conversation.started': 'Conversación iniciada',
    'conversation.message_sent': 'Mensaje enviado',
    'engagement.saved': 'Aviso guardado',
    'engagement.followed': 'Siguieron tu perfil',
    'note.written': 'Nota interna',
    'relationship.stage_changed': 'Etapa actualizada',
    'visit.scheduled': 'Visita agendada',
    'task.created': 'Seguimiento creado',
    'task.completed': 'Seguimiento completado',
};

const STAGE_LABELS: Record<MarketplaceContactStage, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    visit_scheduled: 'Visita agendada',
    negotiation: 'En negociación',
    won: 'Cerrado',
    lost: 'No concretado',
};

type MarketplaceContactsVertical = Extract<MessageVertical, 'autos' | 'propiedades'>;

export type MarketplaceContactsCopy = {
    title: string;
    description: string;
    empty: string;
    entityLabel: string;
};

const DEFAULT_COPY: Record<MarketplaceContactsVertical, MarketplaceContactsCopy> = {
    autos: {
        title: 'Contactos',
        description: 'Personas que te escribieron, guardaron avisos o te siguen.',
        empty: 'Cuando alguien guarde un aviso, te siga o te escriba, aparecerá aquí.',
        entityLabel: 'publicaciones',
    },
    propiedades: {
        title: 'Contactos',
        description: 'Personas que te escribieron, guardaron propiedades o te siguen.',
        empty: 'Cuando alguien guarde un aviso, te siga o te escriba, aparecerá aquí.',
        entityLabel: 'propiedades',
    },
};

function sourceLabel(sources: MarketplaceContact['sources'] | undefined) {
    if (!sources?.length) return null;
    const labels: string[] = [];
    if (sources.includes('message')) labels.push('Mensaje');
    if (sources.includes('saved')) labels.push('Guardó');
    if (sources.includes('follow')) labels.push('Te sigue');
    return labels.join(' · ');
}

function timelineLabel(type: string) {
    return TIMELINE_LABELS[type] ?? type;
}

function formatWhen(ts: number | null | string | undefined) {
    if (ts == null || ts === '') return '—';
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function ContactDetail({
    vertical,
    buyerUserId,
    onBack,
}: {
    vertical: MarketplaceContactsVertical;
    buyerUserId: string;
    onBack: () => void;
}) {
    const [detail, setDetail] = useState<MarketplaceContactDetail | null>(null);
    const [assignment, setAssignment] = useState<MarketplaceContactAssignmentContext | null>(null);
    const [tasks, setTasks] = useState<MarketplaceContactTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignmentSaving, setAssignmentSaving] = useState(false);
    const [assignmentError, setAssignmentError] = useState<string | null>(null);
    const [taskSaving, setTaskSaving] = useState(false);
    const [taskError, setTaskError] = useState<string | null>(null);
    const [taskFormOpen, setTaskFormOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDueAt, setTaskDueAt] = useState('');
    const [taskAssigneeId, setTaskAssigneeId] = useState('');
    const [tab, setTab] = useState<'leads' | 'historial' | 'notas' | 'seguimiento'>('leads');
    const configuredAgendaBase = process.env.NEXT_PUBLIC_SIMPLEAGENDA_URL?.trim();
    const [agendaBaseUrl, setAgendaBaseUrl] = useState(configuredAgendaBase || 'https://simpleagenda.app');

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            const [next, nextAssignment, nextTaskContext] = await Promise.all([
                fetchMarketplaceContactDetail(vertical, buyerUserId),
                fetchMarketplaceContactAssignment(vertical, buyerUserId),
                fetchMarketplaceContactTasks(vertical, buyerUserId),
            ]);
            if (!cancelled) {
                setDetail(next);
                setAssignment(nextAssignment);
                setTasks(nextTaskContext?.tasks ?? []);
                setTaskAssigneeId(nextAssignment?.assignedUserId ?? nextTaskContext?.viewerUserId ?? '');
                setTab('leads');
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [buyerUserId, vertical]);

    useEffect(() => {
        if (configuredAgendaBase || typeof window === 'undefined') return;
        if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            setAgendaBaseUrl(`${window.location.protocol}//${window.location.hostname}:3004`);
        }
    }, [configuredAgendaBase]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
                <IconLoader2 size={18} className="animate-spin" />
                Cargando contacto…
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline"
                >
                    <IconArrowLeft size={16} stroke={1.75} />
                    Volver a contactos
                </button>
                <PanelCard className="p-6 text-sm text-fg-muted">Contacto no encontrado.</PanelCard>
            </div>
        );
    }

    const { contact, leads, events } = detail;
    const assignedMember = assignment?.members.find((member) => member.userId === assignment.assignedUserId);
    const pendingTaskCount = tasks.filter((task) => task.status === 'open').length;

    function buildAgendaVisitHref(): string {
        const base = agendaBaseUrl.replace(/\/$/, '');
        const params = new URLSearchParams({
            nueva: '1',
            contactoId: buyerUserId,
            contactoNombre: contact.displayName,
        });
        const propertyId = leads.find((lead) => lead.listingId)?.listingId;
        if (propertyId) params.set('propiedadId', propertyId);
        return `${base}/panel/visitas-equipo?${params.toString()}`;
    }

    async function saveAssignment(input: { assignedUserId?: string | null; stage?: MarketplaceContactStage }) {
        if (!assignment || assignmentSaving) return;
        if (input.assignedUserId !== undefined && !assignment.canManage) return;
        if (input.stage !== undefined && !assignment.canUpdateStage) return;
        setAssignmentSaving(true);
        setAssignmentError(null);
        const result = await updateMarketplaceContactAssignment({ vertical, personId: buyerUserId, ...input });
        if (!result.ok) {
            setAssignmentError(result.error ?? 'No pudimos actualizar la asignación.');
        } else {
            setAssignment((current) => current ? { ...current, ...input } : current);
        }
        setAssignmentSaving(false);
    }

    async function createTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const title = taskTitle.trim();
        if (!title || taskSaving) return;
        const parsedDueAt = taskDueAt ? new Date(taskDueAt) : null;
        if (parsedDueAt && Number.isNaN(parsedDueAt.getTime())) {
            setTaskError('Elige una fecha válida.');
            return;
        }
        setTaskSaving(true);
        setTaskError(null);
        const result = await createMarketplaceContactTask({
            vertical,
            personId: buyerUserId,
            title,
            dueAt: parsedDueAt?.toISOString() ?? null,
            assignedUserId: assignment?.teamEnabled && assignment.canManage ? taskAssigneeId || null : undefined,
        });
        if (!result.ok || !result.task) {
            setTaskError(result.error ?? 'No pudimos guardar el seguimiento.');
        } else {
            setTasks((current) => [...current, result.task!].sort((a, b) => {
                if (!a.dueAt) return 1;
                if (!b.dueAt) return -1;
                return Date.parse(a.dueAt) - Date.parse(b.dueAt);
            }));
            setTaskTitle('');
            setTaskDueAt('');
            setTaskFormOpen(false);
        }
        setTaskSaving(false);
    }

    async function toggleTask(task: MarketplaceContactTask) {
        if (!task.canUpdate || taskSaving) return;
        const nextStatus = task.status === 'done' ? 'open' : 'done';
        setTaskSaving(true);
        setTaskError(null);
        const result = await updateMarketplaceContactTask(task.id, { status: nextStatus });
        if (!result.ok) {
            setTaskError(result.error ?? 'No pudimos actualizar el seguimiento.');
        } else {
            setTasks((current) => current.map((item) => item.id === task.id
                ? { ...item, status: nextStatus, completedAt: nextStatus === 'done' ? new Date().toISOString() : null }
                : item));
        }
        setTaskSaving(false);
    }

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline"
            >
                <IconArrowLeft size={16} stroke={1.75} />
                Volver a contactos
            </button>

            <div>
                <h2 className="type-section-title text-(--fg)">{contact.displayName}</h2>
                {contact.email ? (
                    <p className="mt-1 text-sm text-fg-muted">{contact.email}</p>
                ) : null}
                <p className="mt-2 text-sm text-fg-muted">
                    {sourceLabel(contact.sources) ? `${sourceLabel(contact.sources)} · ` : ''}
                    {contact.threadCount}{' '}
                    {contact.threadCount === 1 ? 'conversación' : 'conversaciones'}
                    {contact.unreadCount > 0 ? ` · ${contact.unreadCount} sin leer` : ''}
                </p>
            </div>

            {assignment?.workspaceEnabled ? (
                <div className="space-y-3 rounded-lg border border-(--border) bg-(--surface) px-4 py-3">
                    <div>
                        <p className="text-sm font-medium text-(--fg)">{assignment.teamEnabled ? 'Seguimiento del equipo' : 'Seguimiento comercial'}</p>
                        <p className="mt-0.5 text-xs text-fg-muted">Un estado claro y un próximo paso para que esta oportunidad avance.</p>
                    </div>
                    <div className={`grid gap-3 ${assignment.teamEnabled ? 'sm:grid-cols-2' : ''}`}>
                        {assignment.teamEnabled ? (
                            <label className="space-y-1.5">
                                <span className="text-xs font-medium text-fg-muted">Responsable</span>
                                {assignment.canManage ? (
                                    <select
                                        aria-label="Responsable del contacto"
                                        className="h-10 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm text-(--fg) outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                        value={assignment.assignedUserId ?? ''}
                                        disabled={assignmentSaving}
                                        onChange={(event) => void saveAssignment({ assignedUserId: event.target.value || null })}
                                    >
                                        <option value="">Sin asignar</option>
                                        {assignment.members.map((member) => (
                                            <option key={member.userId} value={member.userId}>
                                                {member.name} · {member.role === 'owner' ? 'Dueño' : member.role === 'admin' ? 'Administrador' : 'Agente'}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="flex h-10 items-center text-sm font-medium text-(--fg)">
                                        {assignedMember?.name ?? 'Sin asignar'}
                                    </p>
                                )}
                            </label>
                        ) : null}
                        <label className="space-y-1.5">
                            <span className="text-xs font-medium text-fg-muted">Etapa</span>
                            {assignment.canUpdateStage ? (
                                <select
                                    aria-label="Etapa del contacto"
                                    className="h-10 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm text-(--fg) outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                    value={assignment.stage}
                                    disabled={assignmentSaving}
                                    onChange={(event) => void saveAssignment({ stage: event.target.value as MarketplaceContactStage })}
                                >
                                    {Object.entries(STAGE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="flex h-10 items-center text-sm font-medium text-(--fg)">
                                    {STAGE_LABELS[assignment.stage]}
                                </p>
                            )}
                        </label>
                    </div>
                    {assignmentError ? <p role="alert" className="w-full text-sm text-red-700">{assignmentError}</p> : null}
                    {assignment.teamEnabled ? (
                        <a href={buildAgendaVisitHref()} target="_blank" rel="noreferrer" className="w-full text-sm font-medium text-accent-ink hover:underline">
                            Agendar una visita en SimpleAgenda
                        </a>
                    ) : null}
                </div>
            ) : null}

            <div className="flex gap-1 border-b border-(--border)">
                <button
                    type="button"
                    onClick={() => setTab('leads')}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                        tab === 'leads'
                            ? 'border-accent text-(--fg)'
                            : 'border-transparent text-fg-muted hover:text-(--fg)'
                    }`}
                >
                    <IconMessageCircle size={15} stroke={1.75} />
                    Conversaciones ({leads.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('historial')}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                        tab === 'historial'
                            ? 'border-accent text-(--fg)'
                            : 'border-transparent text-fg-muted hover:text-(--fg)'
                    }`}
                >
                    <IconHistory size={15} stroke={1.75} />
                    Historial ({events.length})
                </button>
                {assignment?.workspaceEnabled ? (
                    <button
                        type="button"
                        onClick={() => setTab('seguimiento')}
                        className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                            tab === 'seguimiento'
                                ? 'border-accent text-(--fg)'
                                : 'border-transparent text-fg-muted hover:text-(--fg)'
                        }`}
                    >
                        <IconCheck size={15} stroke={1.75} />
                        Seguimiento{pendingTaskCount > 0 ? ` (${pendingTaskCount})` : ''}
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => setTab('notas')}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                        tab === 'notas'
                            ? 'border-accent text-(--fg)'
                            : 'border-transparent text-fg-muted hover:text-(--fg)'
                    }`}
                >
                    <IconNotebook size={15} stroke={1.75} />
                    Notas
                </button>
            </div>

            {tab === 'notas' ? (
                <RelationshipNotesPanel vertical={vertical} personId={buyerUserId} />
            ) : tab === 'seguimiento' && assignment?.workspaceEnabled ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-(--fg)">Próximos pasos</h3>
                            <p className="mt-1 text-sm text-fg-muted">Deja claro qué falta hacer y cuándo retomarlo.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setTaskError(null);
                                setTaskFormOpen((open) => !open);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-(--border) bg-(--surface) px-3 text-sm font-medium text-(--fg) hover:bg-bg-subtle"
                        >
                            <IconPlus size={15} stroke={1.8} />
                            {taskFormOpen ? 'Cerrar' : 'Agregar seguimiento'}
                        </button>
                    </div>

                    {taskFormOpen ? (
                        <form onSubmit={(event) => void createTask(event)} className="space-y-3 rounded-lg border border-(--border) bg-(--surface) p-4">
                            <label className="block space-y-1.5">
                                <span className="text-xs font-medium text-fg-muted">¿Qué hay que hacer?</span>
                                <input
                                    autoFocus
                                    value={taskTitle}
                                    onChange={(event) => setTaskTitle(event.target.value)}
                                    maxLength={180}
                                    required
                                    placeholder="Ej.: Llamar para confirmar la visita"
                                    className="h-10 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm text-(--fg) outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-medium text-fg-muted">Fecha y hora (opcional)</span>
                                    <input
                                        type="datetime-local"
                                        value={taskDueAt}
                                        onChange={(event) => setTaskDueAt(event.target.value)}
                                        className="h-10 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm text-(--fg) outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                    />
                                </label>
                                {assignment.teamEnabled && assignment.canManage ? (
                                    <label className="block space-y-1.5">
                                        <span className="text-xs font-medium text-fg-muted">Responsable</span>
                                        <select
                                            value={taskAssigneeId}
                                            onChange={(event) => setTaskAssigneeId(event.target.value)}
                                            className="h-10 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm text-(--fg) outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                        >
                                            <option value="">Sin asignar</option>
                                            {assignment.members.map((member) => (
                                                <option key={member.userId} value={member.userId}>{member.name}</option>
                                            ))}
                                        </select>
                                    </label>
                                ) : null}
                            </div>
                            {taskError ? <p role="alert" className="text-sm text-red-700">{taskError}</p> : null}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTaskFormOpen(false)}
                                    className="h-9 rounded-lg px-3 text-sm font-medium text-fg-muted hover:bg-bg-subtle"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={taskSaving || !taskTitle.trim()}
                                    className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {taskSaving ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    ) : null}

                    {taskError && !taskFormOpen ? <p role="alert" className="text-sm text-red-700">{taskError}</p> : null}

                    {tasks.length === 0 ? (
                        <PanelCard className="p-6 text-sm text-fg-muted">
                            Aún no hay seguimientos. Agrega el próximo paso para mantener esta oportunidad en movimiento.
                        </PanelCard>
                    ) : (
                        <ul className="divide-y divide-(--border) rounded-lg border border-(--border) bg-(--surface)">
                            {tasks.map((task) => (
                                <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                                    {task.canUpdate ? (
                                        <button
                                            type="button"
                                            onClick={() => void toggleTask(task)}
                                            disabled={taskSaving}
                                            aria-label={task.status === 'done' ? 'Reabrir seguimiento' : 'Marcar seguimiento como listo'}
                                            className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border ${task.status === 'done' ? 'border-accent bg-accent text-accent-ink' : 'border-(--border) text-transparent hover:border-accent'}`}
                                        >
                                            <IconCheck size={13} stroke={2} />
                                        </button>
                                    ) : (
                                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${task.status === 'done' ? 'bg-accent' : 'bg-(--border)'}`} />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium ${task.status === 'done' ? 'text-fg-muted line-through' : 'text-(--fg)'}`}>
                                            {task.title}
                                        </p>
                                        <p className="mt-1 text-xs text-fg-muted">
                                            {task.status === 'done' ? 'Listo' : task.status === 'cancelled' ? 'Cancelado' : task.dueAt ? formatWhen(task.dueAt) : 'Sin fecha'}
                                            {task.assignedName ? ` · ${task.assignedName}` : ''}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : tab === 'leads' ? (
                leads.length === 0 ? (
                    <PanelEmptyState
                        title="Sin conversaciones"
                        description="Puede haber guardado avisos o seguido tu perfil. Revisa el historial."
                    />
                ) : (
                    <ul className="divide-y divide-(--border) rounded-lg border border-(--border) bg-(--surface)">
                        {leads.map((lead) => (
                            <li
                                key={lead.threadId}
                                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-(--fg)">
                                        {lead.listingTitle ?? 'Publicación'}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">
                                        {lead.lastMessagePreview || 'Sin mensajes'}
                                        {lead.lastMessageAt ? ` · ${formatWhen(lead.lastMessageAt)}` : ''}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                                    {lead.unreadCount > 0 ? (
                                        <span className="text-xs font-medium text-accent-ink">
                                            {lead.unreadCount} sin leer
                                        </span>
                                    ) : null}
                                    <Link
                                        href={`/panel/mensajes?thread=${encodeURIComponent(lead.threadId)}`}
                                        className="text-sm font-medium text-accent-ink hover:underline"
                                    >
                                        Abrir chat
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            ) : events.length === 0 ? (
                <PanelCard className="p-6 text-sm text-fg-muted">
                    Aún no hay eventos. Se registran mensajes, guardados y follows.
                </PanelCard>
            ) : (
                <ul className="space-y-3">
                    {events.map((event) => {
                        const listingTitle =
                            typeof event.payload?.listingTitle === 'string'
                                ? event.payload.listingTitle
                                : null;
                        const eventTitle =
                            typeof event.payload?.title === 'string'
                                ? event.payload.title
                                : null;
                        const startsAt =
                            typeof event.payload?.startsAt === 'string'
                                ? event.payload.startsAt
                                : null;
                        const dueAt =
                            typeof event.payload?.dueAt === 'string'
                                ? event.payload.dueAt
                                : null;
                        const stageFrom =
                            typeof event.payload?.from === 'string'
                                ? event.payload.from as MarketplaceContactStage
                                : null;
                        const stageTo =
                            typeof event.payload?.to === 'string'
                                ? event.payload.to as MarketplaceContactStage
                                : null;
                        return (
                            <li
                                key={event.id}
                                className="rounded-lg border border-(--border) bg-(--surface) px-4 py-3"
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="font-medium text-(--fg)">{timelineLabel(event.type)}</p>
                                    <time className="text-xs text-fg-muted" dateTime={event.occurredAt}>
                                        {formatWhen(event.occurredAt)}
                                    </time>
                                </div>
                                {eventTitle || listingTitle ? (
                                    <p className="mt-1 text-sm text-fg-muted">{eventTitle ?? listingTitle}</p>
                                ) : null}
                                {startsAt ? (
                                    <p className="mt-1 text-sm text-fg-muted">{formatWhen(startsAt)}</p>
                                ) : null}
                                {dueAt ? (
                                    <p className="mt-1 text-sm text-fg-muted">Fecha de seguimiento: {formatWhen(dueAt)}</p>
                                ) : null}
                                {stageFrom && stageTo ? (
                                    <p className="mt-1 text-sm text-fg-muted">
                                        {STAGE_LABELS[stageFrom] ?? stageFrom} → {STAGE_LABELS[stageTo] ?? stageTo}
                                    </p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export type MarketplaceContactsViewProps = {
    vertical: MarketplaceContactsVertical;
    copy?: Partial<MarketplaceContactsCopy>;
};

export function MarketplaceContactsView({ vertical, copy }: MarketplaceContactsViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('contacto');
    const resolved = { ...DEFAULT_COPY[vertical], ...copy };

    const [items, setItems] = useState<MarketplaceContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            const next = await fetchMarketplaceContacts(vertical);
            if (!cancelled) {
                setItems(next);
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [vertical]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return items;
        return items.filter((item) => {
            const hay = [item.displayName, item.email ?? '', item.lastListingTitle ?? ''].join(' ').toLowerCase();
            return hay.includes(needle);
        });
    }, [items, query]);

    const openContact = (id: string) => {
        router.push(`/panel/contactos?contacto=${encodeURIComponent(id)}`);
    };

    const clearContact = () => {
        router.push('/panel/contactos');
    };

    return (
        <PanelSectionPage title={resolved.title} description={resolved.description}>
            {selectedId ? (
                <ContactDetail
                    vertical={vertical}
                    buyerUserId={selectedId}
                    onBack={clearContact}
                />
            ) : loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
                    <IconLoader2 size={18} className="animate-spin" />
                    Cargando contactos…
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative">
                        <IconSearch
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar por nombre, email o publicación"
                            className="w-full rounded-lg border border-(--border) bg-(--surface) py-2.5 pl-9 pr-3 text-sm text-(--fg) outline-none focus:border-accent"
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <PanelEmptyState
                            title={items.length === 0 ? 'Sin contactos aún' : 'Sin resultados'}
                            description={
                                items.length === 0
                                    ? resolved.empty
                                    : 'Ningún contacto coincide con la búsqueda.'
                            }
                        />
                    ) : (
                        <ul className="divide-y divide-(--border) rounded-lg border border-(--border) bg-(--surface)">
                            {filtered.map((contact) => (
                                <li key={contact.id}>
                                    <button
                                        type="button"
                                        onClick={() => openContact(contact.id)}
                                        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-bg-subtle sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-(--fg)">
                                                {contact.displayName}
                                                {contact.unreadCount > 0 ? (
                                                    <span className="ml-2 text-xs font-medium text-accent-ink">
                                                        {contact.unreadCount} nuevos
                                                    </span>
                                                ) : null}
                                            </p>
                                            <p className="mt-0.5 truncate text-sm text-fg-muted">
                                                {sourceLabel(contact.sources)
                                                    ?? `${contact.threadCount} ${contact.threadCount === 1 ? 'conversación' : 'conversaciones'}`}
                                                {contact.lastListingTitle
                                                    ? ` · ${contact.lastListingTitle}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs text-fg-muted">
                                            {contact.lastMessageAt
                                                ? formatWhen(contact.lastMessageAt)
                                                : '—'}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </PanelSectionPage>
    );
}
