'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconHistory,
    IconLoader2,
    IconMessageCircle,
    IconNotebook,
    IconSearch,
} from '@tabler/icons-react';
import {
    fetchMarketplaceContactDetail,
    fetchMarketplaceContacts,
    type MarketplaceContact,
    type MarketplaceContactDetail,
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
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'leads' | 'historial' | 'notas'>('leads');

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            const next = await fetchMarketplaceContactDetail(vertical, buyerUserId);
            if (!cancelled) {
                setDetail(next);
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [buyerUserId, vertical]);

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
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                    <IconArrowLeft size={16} stroke={1.75} />
                    Volver a contactos
                </button>
                <PanelCard className="p-6 text-sm text-fg-muted">Contacto no encontrado.</PanelCard>
            </div>
        );
    }

    const { contact, leads, events } = detail;

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
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
                                        <span className="text-xs font-medium text-accent">
                                            {lead.unreadCount} sin leer
                                        </span>
                                    ) : null}
                                    <Link
                                        href={`/panel/mensajes?thread=${encodeURIComponent(lead.threadId)}`}
                                        className="text-sm font-medium text-accent hover:underline"
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
                                {listingTitle ? (
                                    <p className="mt-1 text-sm text-fg-muted">{listingTitle}</p>
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
                                                    <span className="ml-2 text-xs font-medium text-accent">
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
