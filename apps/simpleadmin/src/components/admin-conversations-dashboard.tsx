'use client';

import { Fragment, useMemo, useState } from 'react';
import { IconAlertTriangle, IconCalendarDue, IconCheck, IconChevronDown, IconChevronUp, IconMessageCircle, IconPlus, IconRefresh, IconSearch, IconSend, IconUsers } from '@tabler/icons-react';
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
import { ContactManagementPanel, NewContactDialog } from './conversations/contact-management-panel';
import { RecordOutboundMessageDialog } from './conversations/record-outbound-message-dialog';
import { useAdminConversations, type ConversationStatusFilter } from './conversations/use-admin-conversations';

const STATUS_OPTIONS: Array<{ value: ConversationStatusFilter; label: string }> = [
    { value: 'all', label: 'Todos los contactos' }, { value: 'pending', label: 'Mensajes pendientes' }, { value: 'done', label: 'Sin respuesta pendiente' },
];
const VERTICAL_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos los servicios' }, { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'propiedades', label: 'SimplePropiedades' }, { value: 'autos', label: 'SimpleAutos' },
    { value: 'serenatas', label: 'SimpleSerenatas' }, { value: 'platform', label: 'SimplePlataforma' },
    { value: 'general', label: 'Otro / general' }, { value: 'unclassified', label: 'Sin clasificar' },
];
const STAGE_FILTER_OPTIONS = [
    { value: 'all', label: 'Todas las etapas' }, { value: 'new', label: 'Nuevo contacto' }, { value: 'contacted', label: 'Contactado' },
    { value: 'registered', label: 'Registrado' }, { value: 'setup_pending', label: 'Configuración pendiente' },
    { value: 'activated', label: 'Activado' }, { value: 'first_booking', label: 'Primera reserva' },
    { value: 'paid', label: 'Pagó' }, { value: 'paused', label: 'En pausa' }, { value: 'closed', label: 'Cerrado' },
];
const FOLLOW_UP_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos los seguimientos' }, { value: 'overdue', label: 'Vencidos' },
    { value: 'today', label: 'Para hoy' }, { value: 'next7', label: 'Próximos 7 días' },
];
const VERTICAL_LABELS: Record<string, string> = {
    agenda: 'SimpleAgenda', propiedades: 'SimplePropiedades', autos: 'SimpleAutos', serenatas: 'SimpleSerenatas', platform: 'SimplePlataforma', general: 'Otro / general',
};
const PURPOSE_LABELS: Record<string, string> = {
    alliance: 'Alianza o inmobiliaria', app_invitation: 'Invitación a probar una aplicación', client_prospecting: 'Posible cliente',
    follow_up: 'Seguimiento', support: 'Soporte', other: 'Otro motivo comercial',
};
const CHANNEL_LABELS: Record<string, string> = {
    whatsapp_personal: 'WhatsApp personal', whatsapp_business: 'WhatsApp Business de Simple', email: 'Correo electrónico',
    whatsapp: 'WhatsApp', web_form: 'Formulario web', instagram_dm: 'Mensaje de Instagram', phone: 'Teléfono', meeting: 'Reunión', other: 'Otro canal',
};
const STAGE_LABELS: Record<string, string> = {
    new: 'Nuevo', contacted: 'Contactado', registered: 'Registrado', setup_pending: 'Configuración pendiente',
    activated: 'Activado', first_booking: 'Primera reserva', paid: 'Pagó', paused: 'En pausa', closed: 'Cerrado',
};
const ORIGIN_LABELS: Record<string, string> = {
    unknown: 'Por identificar', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp',
    website: 'Sitio web', referral: 'Recomendación', personal_network: 'Red personal', organic_search: 'Búsqueda', direct: 'Contacto directo', other: 'Otro',
};
const ACTIVITY_LABELS: Record<string, string> = {
    message_inbound: 'Mensaje recibido', message_outbound: 'Mensaje enviado', call: 'Llamada', meeting: 'Reunión',
    support: 'Soporte', note: 'Nota', other: 'Otra actividad', 'crm.contact_created': 'Contacto registrado', 'crm.contact_updated': 'Ficha actualizada',
};

function formatHours(hours: number): string {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 48) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} d`;
}
function formatActivityDate(value: string): string {
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function chileToday(): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
}
function addDateDays(value: string, days: number): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

export function AdminConversationsDashboard() {
    const [status, setStatus] = useState<ConversationStatusFilter>('all');
    const [vertical, setVertical] = useState('all');
    const [stage, setStage] = useState('all');
    const [followUpFilter, setFollowUpFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showCapture, setShowCapture] = useState(false);
    const [showOutbound, setShowOutbound] = useState(false);
    const [showNewContact, setShowNewContact] = useState(false);
    const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
    const { items, summary, loading, error, busyThreadId, load, markDone, capture, recordOutbound, createContact, updateContact, logActivity } = useAdminConversations(status, vertical);

    const visibleItems = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase('es-CL');
        const today = chileToday();
        const nextWeek = addDateDays(today, 7);
        return items.filter((item) => {
            if (stage !== 'all' && item.contactStage !== stage) return false;
            if (followUpFilter === 'overdue' && !item.followUpDue) return false;
            if (followUpFilter === 'today' && item.nextFollowUpDate !== today) return false;
            if (followUpFilter === 'next7' && (!item.nextFollowUpDate || item.nextFollowUpDate < today || item.nextFollowUpDate > nextWeek)) return false;
            if (!needle) return true;
            return [item.name, item.phone, item.email, item.company, item.origin, item.originDetail, item.referredBy, item.relationshipContext, item.lastMessage]
                .some((value) => value?.toLocaleLowerCase('es-CL').includes(needle));
        }).sort((a, b) => {
            if (a.followUpDue !== b.followUpDue) return a.followUpDue ? -1 : 1;
            const aDate = a.nextFollowUpDate || '9999-12-31';
            const bDate = b.nextFollowUpDate || '9999-12-31';
            if (aDate !== bDate) return aDate.localeCompare(bDate);
            if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
            return new Date(b.pendingSince).getTime() - new Date(a.pendingSince).getTime();
        });
    }, [items, search, stage, followUpFilter]);

    return (
        <div className="container-app panel-page space-y-5 py-6">
            <PanelPageHeader
                title="Contactos y actividad"
                description="Administra en SimpleAdmin a quién conoces, de dónde llegó, qué necesita y cuál es el próximo paso."
                actions={(
                    <>
                        <PanelButton variant="secondary" onClick={() => void load()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>
                        <PanelButton variant="secondary" onClick={() => setShowCapture(true)}><IconMessageCircle size={16} /> Registrar respuesta</PanelButton>
                        <PanelButton variant="secondary" onClick={() => setShowOutbound(true)}><IconSend size={16} /> Registrar envío</PanelButton>
                        <PanelButton onClick={() => setShowNewContact(true)}><IconPlus size={16} /> Nuevo contacto</PanelButton>
                    </>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <PanelStatCard label="Contactos con respuesta pendiente" value={String(summary.pendingCount)} meta="Requieren seguimiento" icon={<IconMessageCircle size={18} />} />
                <PanelStatCard label="Más de 24 horas" value={String(summary.overdueCount)} meta="Prioridad de respuesta" icon={<IconAlertTriangle size={18} />} />
                <PanelStatCard label="Seguimientos vencidos" value={String(summary.followUpDueCount)} meta="Próxima acción atrasada" icon={<IconCalendarDue size={18} />} />
                <PanelStatCard label="Sin respuesta pendiente" value={String(summary.doneCount)} meta="Contactos registrados" icon={<IconUsers size={18} />} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="relative block"><span className="sr-only">Buscar contactos</span><IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" /><input className="form-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, teléfono, origen…" /></label>
                <ModernSelect value={vertical} onChange={setVertical} options={VERTICAL_FILTER_OPTIONS} ariaLabel="Filtrar por servicio" />
                <ModernSelect value={status} onChange={(value) => setStatus(value as ConversationStatusFilter)} options={STATUS_OPTIONS} ariaLabel="Filtrar contactos por respuesta" />
                <ModernSelect value={stage} onChange={setStage} options={STAGE_FILTER_OPTIONS} ariaLabel="Filtrar por etapa comercial" />
                <ModernSelect value={followUpFilter} onChange={setFollowUpFilter} options={FOLLOW_UP_FILTER_OPTIONS} ariaLabel="Filtrar seguimientos por fecha" />
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(180px,1fr)_minmax(180px,1.2fr)_minmax(140px,.8fr)_minmax(185px,220px)]">
                    <span>Contacto y contexto</span><span>Última actividad</span><span>Etapa / seguimiento</span><span className="text-right">Ficha / historial</span>
                </PanelListHeader>
                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={4} /></PanelListRow>
                ) : visibleItems.length === 0 ? (
                    <PanelListRow className="p-5"><PanelEmptyState title={items.length ? 'Sin resultados' : 'Aún no hay contactos'} description={items.length ? 'Prueba con otra búsqueda o cambia los filtros.' : 'Registra el primer contacto o una conversación para comenzar el seguimiento en SimpleAdmin.'} /></PanelListRow>
                ) : visibleItems.map((item) => (
                    <Fragment key={item.threadId}>
                        <PanelListRow className="grid gap-3 p-4 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1.2fr)_minmax(140px,.8fr)_minmax(185px,220px)] md:items-center">
                            <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-[var(--fg)]">{item.name || item.email || item.phone || item.threadId}{item.company ? ` · ${item.company}` : ''}</p>
                                <p className="mt-0.5 break-words text-xs text-[var(--fg-muted)]">{item.email ? <a className="break-all underline underline-offset-2" href={`mailto:${encodeURIComponent(item.email)}`}>{item.email}</a> : item.phone || 'Sin teléfono'}</p>
                                <p className="mt-1 break-words text-xs font-medium text-[var(--accent)]">{item.relatedVerticals.length ? item.relatedVerticals.map((service) => VERTICAL_LABELS[service] || service).join(' · ') : VERTICAL_LABELS[item.sourceVertical || ''] || 'Sin clasificar'}{item.purpose ? ` · ${PURPOSE_LABELS[item.purpose] || item.purpose}` : ''}</p>
                                <p className="mt-0.5 break-words text-xs text-[var(--fg-muted)]">Origen: {ORIGIN_LABELS[item.origin || ''] || item.origin || CHANNEL_LABELS[item.channel] || item.channel}{item.originDetail ? ` · ${item.originDetail}` : ''}{item.referredBy ? ` · Referido por ${item.referredBy}` : ''}</p>
                            </div>
                            <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-[var(--fg-secondary)]">{item.lastMessage || 'Sin actividad registrada todavía'}</p>
                            <div className="space-y-1 text-xs">
                                <PanelStatusBadge label={STAGE_LABELS[item.contactStage] || item.contactStage} tone={item.contactStage === 'paid' || item.contactStage === 'activated' ? 'success' : 'neutral'} />
                                {item.nextAction ? <p className="break-words text-[var(--fg)]">{item.nextAction}</p> : <p className="text-[var(--fg-muted)]">Sin próximo paso</p>}
                                {item.nextFollowUpDate ? <p className={item.followUpDue ? 'font-medium text-amber-700' : 'text-[var(--fg-muted)]'}>{item.followUpDue ? 'Vencido · ' : 'Fecha · '}{item.nextFollowUpDate}</p> : null}
                                {item.status === 'pending' ? <p className="text-[var(--fg-muted)]">Respuesta pendiente · {formatHours(item.hoursPending)}</p> : null}
                            </div>
                            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                                <PanelButton variant="secondary" size="sm" onClick={() => setExpandedThreadId(expandedThreadId === item.threadId ? null : item.threadId)}>
                                    {expandedThreadId === item.threadId ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />} Ficha e historial ({item.eventCount})
                                </PanelButton>
                                {item.status === 'pending' ? (
                                    <PanelButton variant="secondary" size="sm" disabled={busyThreadId === item.threadId} onClick={() => void markDone(item.threadId)}><IconCheck size={14} /> Marcar respondido</PanelButton>
                                ) : null}
                            </div>
                        </PanelListRow>
                        {expandedThreadId === item.threadId ? (
                            <PanelListRow className="p-0">
                                <ContactManagementPanel item={item} onSaveProfile={updateContact} onLogActivity={logActivity} />
                                <div className="space-y-3 border-t border-[var(--border)] px-4 py-5 md:px-8">
                                    <div><h3 className="text-sm font-semibold text-[var(--fg)]">Historial completo</h3><p className="text-xs text-[var(--fg-muted)]">Mensajes y gestiones guardados manualmente en SimpleAdmin.</p></div>
                                    {item.activities.length === 0 ? <p className="text-sm text-[var(--fg-muted)]">Todavía no hay actividad en el historial.</p> : (
                                        <ol className="space-y-3">
                                            {item.activities.map((activity) => (
                                                <li key={activity.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
                                                        <span className={`font-semibold ${activity.direction === 'outbound' ? 'text-[var(--accent)]' : activity.direction === 'inbound' ? 'text-emerald-600' : ''}`}>
                                                            {activity.direction === 'status' ? 'Estado actualizado' : ACTIVITY_LABELS[activity.kind || ''] || (activity.direction === 'outbound' ? 'Mensaje enviado' : activity.direction === 'inbound' ? 'Mensaje recibido' : 'Gestión')}
                                                        </span>
                                                        {activity.channel ? <span>{CHANNEL_LABELS[activity.channel] || activity.channel}</span> : null}
                                                        <time dateTime={activity.occurredAt}>{formatActivityDate(activity.occurredAt)}</time>
                                                        {(activity.sourceVertical || activity.purpose) ? <span>{VERTICAL_LABELS[activity.sourceVertical || ''] || ''}{activity.purpose ? ` · ${PURPOSE_LABELS[activity.purpose] || activity.purpose}` : ''}</span> : null}
                                                    </div>
                                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--fg)]">{activity.message || 'Ficha del contacto actualizada.'}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            </PanelListRow>
                        ) : null}
                    </Fragment>
                ))}
            </PanelList>

            {showCapture ? <CaptureConversationDialog onClose={() => setShowCapture(false)} onCapture={capture} /> : null}
            {showOutbound ? <RecordOutboundMessageDialog onClose={() => setShowOutbound(false)} onSave={recordOutbound} /> : null}
            {showNewContact ? <NewContactDialog onClose={() => setShowNewContact(false)} onCreate={createContact} /> : null}
        </div>
    );
}
