'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    fetchMessageThreadDetail,
    fetchMessageThreads,
    sendThreadMessage,
    updateMessageThreadState,
    type MessageEntry,
    type MessageThread,
    type MessageVertical,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelEmptyState, PanelList, PanelListHeader, PanelPageHeader } from './panel-display.js';
import { PanelStatusBadge } from './panel-primitives.js';
import { PanelPillNav, PanelSearchField } from './panel-navigation.js';

export type PanelMessagesCopy = {
    title: string;
    description: string;
    emptyInbox: string;
    emptyArchived: string;
    emptySpam: string;
    footerHint: string;
    contextLabel: string;
    viewContextLink: string;
};

const DEFAULT_COPY: Record<MessageVertical, PanelMessagesCopy> = {
    autos: {
        title: 'Mensajes',
        description: 'Conversaciones reales entre compradores y vendedores',
        emptyInbox: 'Cuando un comprador te escriba desde una publicación aparecerá aquí.',
        emptyArchived: 'Todavía no has archivado conversaciones.',
        emptySpam: 'No hay conversaciones marcadas como spam.',
        footerHint: 'Cada conversación queda vinculada a la publicación correspondiente.',
        contextLabel: 'Publicación',
        viewContextLink: 'Ver publicación',
    },
    propiedades: {
        title: 'Mensajes',
        description: 'Conversaciones reales entre interesados y anunciantes',
        emptyInbox: 'Cuando un interesado te escriba desde una propiedad aparecerá aquí.',
        emptyArchived: 'Todavía no has archivado conversaciones.',
        emptySpam: 'No hay conversaciones marcadas como spam.',
        footerHint: 'Cada conversación queda vinculada a la propiedad correspondiente.',
        contextLabel: 'Publicación',
        viewContextLink: 'Ver publicación',
    },
    agenda: {
        title: 'Mensajes',
        description: 'Conversaciones con pacientes y consultas de tu agenda',
        emptyInbox: 'Cuando un paciente te escriba desde tu perfil o una reserva aparecerá aquí.',
        emptyArchived: 'Todavía no has archivado conversaciones.',
        emptySpam: 'No hay conversaciones marcadas como spam.',
        footerHint: 'Cada mensaje queda vinculado al contacto de la consulta.',
        contextLabel: 'Consulta',
        viewContextLink: 'Ver cita',
    },
    serenatas: {
        title: 'Mensajes',
        description: 'Conversaciones con clientes sobre serenatas y solicitudes',
        emptyInbox: 'Cuando un cliente te escriba desde una solicitud aparecerá aquí.',
        emptyArchived: 'Todavía no has archivado conversaciones.',
        emptySpam: 'No hay conversaciones marcadas como spam.',
        footerHint: 'Cada mensaje queda vinculado a la solicitud o evento.',
        contextLabel: 'Solicitud',
        viewContextLink: 'Ver solicitud',
    },
};

export type PanelMessagesInboxProps = {
    vertical: MessageVertical;
    copy?: Partial<PanelMessagesCopy>;
    className?: string;
    headerActions?: ReactNode;
};

export function PanelMessagesInbox({ vertical, copy, className, headerActions }: PanelMessagesInboxProps) {
    const text = { ...DEFAULT_COPY[vertical], ...copy };
    const searchParams = useSearchParams();
    const initialThreadId = searchParams.get('thread');
    const [threads, setThreads] = useState<MessageThread[]>([]);
    const [folder, setFolder] = useState<MessageThread['folder']>('inbox');
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(initialThreadId);
    const [query, setQuery] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);
    const [entries, setEntries] = useState<MessageEntry[]>([]);
    const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchField = (
        <PanelSearchField
            className="hidden w-64 sm:block"
            inputClassName="text-xs"
            placeholder="Buscar conversación"
            value={query}
            onChange={setQuery}
        />
    );

    useEffect(() => {
        let active = true;
        const run = async () => {
            setLoading(true);
            const items = await fetchMessageThreads(vertical, folder);
            if (!active) return;
            setThreads(items);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, [folder, vertical]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return threads;
        return threads.filter((item) =>
            item.listing?.title.toLowerCase().includes(normalized)
            || item.counterpart?.name.toLowerCase().includes(normalized)
            || item.lastMessagePreview?.toLowerCase().includes(normalized)
        );
    }, [query, threads]);

    useEffect(() => {
        if (filtered.length === 0) {
            if (initialThreadId && selectedId === initialThreadId) return;
            setSelectedId(null);
            setSelectedThread(null);
            setEntries([]);
            return;
        }
        if (initialThreadId && selectedId === initialThreadId) {
            setSelectedId(initialThreadId);
            return;
        }
        if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
            setSelectedId(filtered[0]?.id ?? null);
        }
    }, [filtered, initialThreadId, selectedId]);

    useEffect(() => {
        if (!selectedId) {
            setSelectedThread(null);
            setEntries([]);
            return;
        }
        let active = true;
        setDetailLoading(true);
        setError(null);
        const run = async () => {
            const detail = await fetchMessageThreadDetail(vertical, selectedId);
            if (!active) return;
            setSelectedThread(detail?.item ?? null);
            setEntries(detail?.entries ?? []);
            if (detail?.item?.folder && detail.item.folder !== folder) {
                setFolder(detail.item.folder);
            }
            setDetailLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, [folder, selectedId, vertical]);

    async function handleSend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedId || !draft.trim()) return;
        setSending(true);
        setError(null);
        const result = await sendThreadMessage(vertical, selectedId, draft.trim());
        setSending(false);
        if (!result.ok || !result.item || !result.entry) {
            setError(result.error || 'No pudimos enviar el mensaje.');
            return;
        }

        setDraft('');
        setSelectedThread(result.item);
        setEntries((current) => [...current, result.entry!]);
        setThreads((current) => [result.item!, ...current.filter((item) => item.id !== result.item!.id)]);
        if (result.item.folder !== folder) {
            setFolder(result.item.folder);
        }
    }

    async function handleThreadAction(action: 'archive' | 'unarchive' | 'spam' | 'unspam') {
        if (!selectedId) return;
        setError(null);
        const result = await updateMessageThreadState(vertical, selectedId, action);
        if (!result.ok || !result.item) {
            setError(result.error || 'No pudimos actualizar la conversación.');
            return;
        }

        setSelectedThread(result.item);
        setThreads((current) => {
            const next = current.filter((item) => item.id !== result.item!.id);
            if (result.item!.folder === folder) {
                return [result.item!, ...next];
            }
            return next;
        });
        if (result.item.folder !== folder) {
            setFolder(result.item.folder);
        }
    }

    const emptyFolderDescription =
        folder === 'inbox' ? text.emptyInbox : folder === 'archived' ? text.emptyArchived : text.emptySpam;

    return (
        <div className={className ?? 'container-app panel-page py-4 lg:py-8'}>
            <PanelPageHeader
                title={text.title}
                description={text.description}
                actions={headerActions ?? searchField}
            />

            <div className="mt-5">
                <PanelPillNav
                    items={[
                        { key: 'inbox', label: 'Inbox' },
                        { key: 'archived', label: 'Archivados' },
                        { key: 'spam', label: 'Spam' },
                    ]}
                    activeKey={folder}
                    onChange={(key) => setFolder(key as MessageThread['folder'])}
                    showMobileDropdown={false}
                    breakpoint="sm"
                    size="sm"
                    ariaLabel="Carpetas de mensajes"
                />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <PanelCard size="sm" className="overflow-hidden">
                    {loading ? (
                        <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Cargando conversaciones...
                        </div>
                    ) : filtered.length === 0 ? (
                        <PanelEmptyState title="Sin conversaciones" description={emptyFolderDescription} />
                    ) : (
                        <PanelList className="rounded-card border-0">
                            <PanelListHeader className="grid-cols-[1fr_70px] gap-4">
                                <span>Conversación</span>
                                <span>Tiempo</span>
                            </PanelListHeader>
                            {filtered.map((thread, index) => {
                                const selected = thread.id === selectedId;
                                return (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={() => setSelectedId(thread.id)}
                                        className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-left md:grid-cols-[1fr_70px] md:gap-4"
                                        style={{
                                            borderTop: index ? '1px solid var(--border)' : 'none',
                                            background: selected ? 'var(--bg-subtle)' : 'transparent',
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="min-w-0 truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                                    {thread.listing?.title ?? text.contextLabel}
                                                </p>
                                                {thread.unreadCount > 0 ? (
                                                    <span
                                                        className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                                        style={{
                                                            background: 'var(--button-primary-bg)',
                                                            color: 'var(--button-primary-color)',
                                                        }}
                                                    >
                                                        {thread.unreadCount}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-0.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {thread.counterpart?.name ?? 'Contacto'}
                                            </p>
                                            <p className="mt-1 truncate text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                                {thread.lastMessagePreview || 'Conversación iniciada'}
                                            </p>
                                        </div>
                                        <p className="text-xs md:text-right" style={{ color: 'var(--fg-muted)' }}>
                                            {thread.lastMessageAgo}
                                        </p>
                                    </button>
                                );
                            })}
                        </PanelList>
                    )}
                </PanelCard>

                <PanelCard size="sm">
                    {!selectedId ? (
                        <PanelEmptyState title="Selecciona una conversación" description="El detalle del hilo aparecerá aquí." />
                    ) : detailLoading || !selectedThread ? (
                        <div className="px-1 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Cargando mensajes...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                                            {selectedThread.listing?.title ?? text.contextLabel}
                                        </p>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            {selectedThread.counterpart?.name ?? 'Contacto'}
                                            {selectedThread.listing?.location
                                                ? ` · ${selectedThread.listing.location}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <PanelStatusBadge
                                            label={selectedThread.viewerRole === 'seller' ? 'Inbox vendedor' : 'Inbox comprador'}
                                            tone="neutral"
                                        />
                                        <PanelButton
                                            type="button"
                                            variant="secondary"
                                            onClick={() => void handleThreadAction(selectedThread.spam ? 'unspam' : 'spam')}
                                        >
                                            {selectedThread.spam ? 'Quitar spam' : 'Marcar spam'}
                                        </PanelButton>
                                        <PanelButton
                                            type="button"
                                            variant="secondary"
                                            onClick={() => void handleThreadAction(selectedThread.archived ? 'unarchive' : 'archive')}
                                        >
                                            {selectedThread.archived ? 'Mover a inbox' : 'Archivar'}
                                        </PanelButton>
                                    </div>
                                </div>
                                {selectedThread.listing?.href ? (
                                    <Link href={selectedThread.listing.href} className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                                        {text.viewContextLink}
                                    </Link>
                                ) : null}
                            </div>

                            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                {entries.length === 0 ? (
                                    <PanelEmptyState title="Sin mensajes todavía" description="El historial del hilo aparecerá aquí." />
                                ) : (
                                    entries.map((entry) => (
                                        <div key={entry.id} className={`flex ${entry.isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className="max-w-[85%] rounded-card border px-3.5 py-3"
                                                style={{
                                                    borderColor: entry.isMine ? 'var(--button-primary-border)' : 'var(--border)',
                                                    background: entry.isMine ? 'var(--button-primary-bg)' : 'var(--bg-subtle)',
                                                    color: entry.isMine ? 'var(--button-primary-color)' : 'var(--fg)',
                                                }}
                                            >
                                                <p className="whitespace-pre-wrap text-sm">{entry.body}</p>
                                                <p className="mt-1 text-[11px] opacity-70">{entry.createdAgo}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }} onSubmit={(event) => void handleSend(event)}>
                                <textarea
                                    className="form-textarea min-h-28 text-sm"
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder="Escribe tu respuesta..."
                                />
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs" style={{ color: error ? 'var(--color-error)' : 'var(--fg-muted)' }}>
                                        {error || text.footerHint}
                                    </div>
                                    <PanelButton type="submit" disabled={sending || !draft.trim()}>
                                        {sending ? 'Enviando...' : 'Enviar mensaje'}
                                    </PanelButton>
                                </div>
                            </form>
                        </div>
                    )}
                </PanelCard>
            </div>
        </div>
    );
}
