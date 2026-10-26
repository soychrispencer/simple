'use client';

import { Fragment, useState } from 'react';
import { IconAlertTriangle, IconCheck, IconChevronDown, IconChevronUp, IconMessageCircle, IconPlus, IconRefresh, IconSend } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import {
    PanelButton,
    PanelEmptyState,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelNotice,
    PanelPageHeader,
    PanelStatCard,
    PanelStatusBadge,
    SkeletonList,
} from '@simple/ui/panel';
import { CaptureConversationDialog } from './conversations/capture-conversation-dialog';
import { RecordOutboundMessageDialog } from './conversations/record-outbound-message-dialog';
import { useAdminConversations, type ConversationStatusFilter } from './conversations/use-admin-conversations';

const STATUS_OPTIONS: Array<{ value: ConversationStatusFilter; label: string }> = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'done', label: 'Respondidas' },
    { value: 'all', label: 'Todas' },
];

const VERTICAL_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos los servicios' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'serenatas', label: 'SimpleSerenatas' },
    { value: 'platform', label: 'SimplePlataforma' },
    { value: 'general', label: 'Otro / general' },
    { value: 'unclassified', label: 'Sin clasificar' },
];

const VERTICAL_LABELS: Record<string, string> = {
    agenda: 'SimpleAgenda', propiedades: 'SimplePropiedades', autos: 'SimpleAutos',
    serenatas: 'SimpleSerenatas', platform: 'SimplePlataforma', general: 'Otro / general',
};

const PURPOSE_LABELS: Record<string, string> = {
    alliance: 'Alianza o inmobiliaria', app_invitation: 'Invitación a probar una aplicación',
    client_prospecting: 'Posible cliente', follow_up: 'Seguimiento', support: 'Soporte', other: 'Otro motivo comercial',
};

const CHANNEL_LABELS: Record<string, string> = {
    whatsapp_personal: 'WhatsApp personal', whatsapp_business: 'WhatsApp Business de Simple', email: 'Correo electrónico',
    whatsapp: 'WhatsApp', web_form: 'Formulario web',
};

function formatHours(hours: number): string {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 48) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} d`;
}

function formatActivityDate(value: string): string {
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AdminConversationsDashboard() {
    const [status, setStatus] = useState<ConversationStatusFilter>('pending');
    const [vertical, setVertical] = useState('all');
    const [showCapture, setShowCapture] = useState(false);
    const [showOutbound, setShowOutbound] = useState(false);
    const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
    const { items, summary, loading, error, busyThreadId, load, markDone, capture, recordOutbound } = useAdminConversations(status, vertical);

    return (
        <div className="container-app panel-page space-y-5 py-6">
            <PanelPageHeader
                title="Conversaciones"
                description="Registra envíos y respuestas para saber a quién contactaste, por qué servicio y con qué mensaje."
                actions={(
                    <>
                        <PanelButton variant="secondary" onClick={() => void load()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>
                        <PanelButton variant="secondary" onClick={() => setShowCapture(true)}><IconPlus size={16} /> Registrar respuesta</PanelButton>
                        <PanelButton onClick={() => setShowOutbound(true)}><IconSend size={16} /> Registrar envío</PanelButton>
                    </>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <PanelStatCard label="Sin responder" value={String(summary.pendingCount)} meta="Pendientes" icon={<IconMessageCircle size={18} />} />
                <PanelStatCard label="Más de 24 horas" value={String(summary.overdueCount)} meta="Prioridad" icon={<IconAlertTriangle size={18} />} />
                <PanelStatCard label="Respondidas" value={String(summary.doneCount)} meta="Historial" icon={<IconCheck size={18} />} />
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2">
                <div className="w-full max-w-xs"><ModernSelect value={vertical} onChange={setVertical} options={VERTICAL_FILTER_OPTIONS} ariaLabel="Filtrar por servicio" /></div>
                <div className="w-full max-w-xs"><ModernSelect value={status} onChange={(value) => setStatus(value as ConversationStatusFilter)} options={STATUS_OPTIONS} ariaLabel="Filtrar conversaciones" /></div>
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(160px,1fr)_minmax(200px,1.4fr)_90px_minmax(180px,220px)]">
                    <span>Contacto / servicio</span><span>Último mensaje</span><span>Espera</span><span className="text-right">Historial / estado</span>
                </PanelListHeader>
                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={4} /></PanelListRow>
                ) : items.length === 0 ? (
                    <PanelListRow className="p-5"><PanelEmptyState title="Sin conversaciones" description="No hay contactos para este filtro." /></PanelListRow>
                ) : items.map((item) => (
                    <Fragment key={item.threadId}>
                        <PanelListRow className="grid gap-3 p-4 md:grid-cols-[minmax(160px,1fr)_minmax(200px,1.4fr)_90px_minmax(180px,220px)] md:items-center">
                            <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-[var(--fg)]">{item.name || item.email || item.phone || item.threadId}{item.company ? ` · ${item.company}` : ''}</p>
                                <p className="mt-0.5 break-words text-xs text-[var(--fg-muted)]">{item.email ? <a className="break-all underline underline-offset-2" href={`mailto:${encodeURIComponent(item.email)}`}>{item.email}</a> : item.phone || 'Sin teléfono'}</p>
                                <p className="mt-1 text-xs font-medium text-[var(--accent)]">{VERTICAL_LABELS[item.sourceVertical || ''] || 'Sin clasificar'}{item.purpose ? ` · ${PURPOSE_LABELS[item.purpose] || item.purpose}` : ''}</p>
                                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{CHANNEL_LABELS[item.channel] || item.channel}</p>
                                {item.campaignName ? <p className="mt-0.5 break-words text-xs text-[var(--fg-muted)]">{item.campaignName}</p> : null}
                            </div>
                            <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-[var(--fg-secondary)]">{item.lastMessage || 'Sin mensaje registrado'}</p>
                            <p className="text-sm text-[var(--fg-muted)]">{item.status === 'pending' ? formatHours(item.hoursPending) : 'Hecho'}</p>
                            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                                <PanelButton variant="secondary" size="sm" onClick={() => setExpandedThreadId(expandedThreadId === item.threadId ? null : item.threadId)}>
                                    {expandedThreadId === item.threadId ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />} Historial ({item.eventCount})
                                </PanelButton>
                                {item.status === 'pending' ? (
                                    <PanelButton variant="secondary" size="sm" disabled={busyThreadId === item.threadId} onClick={() => void markDone(item.threadId)}><IconCheck size={14} /> Respondido</PanelButton>
                                ) : <PanelStatusBadge label="Cerrada" tone="success" />}
                            </div>
                        </PanelListRow>
                        {expandedThreadId === item.threadId ? (
                            <PanelListRow className="p-4 md:px-8">
                                <ol className="space-y-3">
                                    {item.activities.map((activity) => (
                                        <li key={activity.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
                                                <span className={`font-semibold uppercase tracking-wide ${activity.direction === 'outbound' ? 'text-[var(--accent)]' : activity.direction === 'inbound' ? 'text-emerald-600' : ''}`}>
                                                    {activity.direction === 'outbound' ? 'Enviado' : activity.direction === 'inbound' ? 'Recibido' : 'Gestión'}
                                                </span>
                                                <span>{activity.channel ? CHANNEL_LABELS[activity.channel] || activity.channel : ''}</span>
                                                <time dateTime={activity.occurredAt}>{formatActivityDate(activity.occurredAt)}</time>
                                                {(activity.sourceVertical || activity.purpose) ? <span>{VERTICAL_LABELS[activity.sourceVertical || ''] || ''}{activity.purpose ? ` · ${PURPOSE_LABELS[activity.purpose] || activity.purpose}` : ''}</span> : null}
                                                {activity.campaignName ? <span>{activity.campaignName}</span> : null}
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--fg)]">{activity.message || 'Sin texto registrado.'}</p>
                                        </li>
                                    ))}
                                </ol>
                                {item.eventCount > item.activities.length ? <p className="mt-2 text-xs text-[var(--fg-muted)]">Se muestran las 20 interacciones más recientes.</p> : null}
                            </PanelListRow>
                        ) : null}
                    </Fragment>
                ))}
            </PanelList>

            {showCapture ? <CaptureConversationDialog onClose={() => setShowCapture(false)} onCapture={capture} /> : null}
            {showOutbound ? <RecordOutboundMessageDialog onClose={() => setShowOutbound(false)} onSave={recordOutbound} /> : null}
        </div>
    );
}
