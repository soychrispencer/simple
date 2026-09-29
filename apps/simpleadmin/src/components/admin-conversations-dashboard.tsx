'use client';

import { useState } from 'react';
import { IconAlertTriangle, IconCheck, IconMessageCircle, IconPlus, IconRefresh } from '@tabler/icons-react';
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
import { useAdminConversations, type ConversationStatusFilter } from './conversations/use-admin-conversations';

const STATUS_OPTIONS: Array<{ value: ConversationStatusFilter; label: string }> = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'done', label: 'Respondidas' },
    { value: 'all', label: 'Todas' },
];

function formatHours(hours: number): string {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 48) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} d`;
}

export function AdminConversationsDashboard() {
    const [status, setStatus] = useState<ConversationStatusFilter>('pending');
    const [showCapture, setShowCapture] = useState(false);
    const { items, summary, loading, error, busyThreadId, load, markDone, capture } = useAdminConversations(status);

    return (
        <div className="container-app panel-page space-y-5 py-6">
            <PanelPageHeader
                title="Conversaciones"
                description="Contactos pendientes de atención."
                actions={(
                    <>
                        <PanelButton variant="secondary" onClick={() => void load()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>
                        <PanelButton onClick={() => setShowCapture(true)}><IconPlus size={16} /> Registrar WhatsApp</PanelButton>
                    </>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <PanelStatCard label="Sin responder" value={String(summary.pendingCount)} meta="Pendientes" icon={<IconMessageCircle size={18} />} />
                <PanelStatCard label="Más de 24 horas" value={String(summary.overdueCount)} meta="Prioridad" icon={<IconAlertTriangle size={18} />} />
                <PanelStatCard label="Respondidas" value={String(summary.doneCount)} meta="Historial" icon={<IconCheck size={18} />} />
            </div>

            <div className="w-full max-w-xs">
                <ModernSelect value={status} onChange={(value) => setStatus(value as ConversationStatusFilter)} options={STATUS_OPTIONS} ariaLabel="Filtrar conversaciones" />
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(160px,1fr)_minmax(200px,1.4fr)_90px_140px]">
                    <span>Contacto</span><span>Último mensaje</span><span>Espera</span><span className="text-right">Estado</span>
                </PanelListHeader>
                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={4} /></PanelListRow>
                ) : items.length === 0 ? (
                    <PanelListRow className="p-5"><PanelEmptyState title="Sin conversaciones" description="No hay contactos para este filtro." /></PanelListRow>
                ) : items.map((item) => (
                    <PanelListRow key={item.threadId} className="grid gap-3 p-4 md:grid-cols-[minmax(160px,1fr)_minmax(200px,1.4fr)_90px_140px] md:items-center">
                        <div>
                            <p className="text-sm font-medium text-[var(--fg)]">{item.name || item.phone || item.threadId}</p>
                            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{item.phone || 'Sin teléfono'}{item.sourceVertical ? ` · ${item.sourceVertical}` : ''}</p>
                        </div>
                        <p className="line-clamp-2 text-sm text-[var(--fg-secondary)]">{item.lastMessage || 'Sin mensaje'}</p>
                        <p className="text-sm text-[var(--fg-muted)]">{item.status === 'pending' ? formatHours(item.hoursPending) : 'Hecho'}</p>
                        <div className="flex justify-start md:justify-end">
                            {item.status === 'pending' ? (
                                <PanelButton variant="secondary" size="sm" disabled={busyThreadId === item.threadId} onClick={() => void markDone(item.threadId)}><IconCheck size={14} /> Respondido</PanelButton>
                            ) : <PanelStatusBadge label="Cerrada" tone="success" />}
                        </div>
                    </PanelListRow>
                ))}
            </PanelList>

            {showCapture ? <CaptureConversationDialog onClose={() => setShowCapture(false)} onCapture={capture} /> : null}
        </div>
    );
}
