'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconHistory,
    IconLoader2,
    IconMusic,
    IconNotebook,
    IconPhone,
    IconSearch,
} from '@tabler/icons-react';
import { PanelCard, RelationshipNotesPanel } from '@simple/ui/panel';
import {
    serenatasApi,
    type OwnerContact,
    type OwnerContactDetail,
    type Serenata,
} from '@/lib/serenatas-api';
import { panelSectionHref } from '@/lib/panel-routes';
import { money, serenataStatusLabel } from '@/components/panel/shared';

const TIMELINE_LABELS: Record<string, string> = {
    'relationship.created': 'Relación iniciada',
    'serenata.requested': 'Solicitud marketplace',
    'serenata.created': 'Serenata registrada',
    'serenata.offer_sent': 'Oferta enviada',
    'serenata.offer_accepted': 'Oferta aceptada',
    'serenata.status_changed': 'Cambio de estado',
    'serenata.reviewed': 'Reseña del cliente',
    'serenata.setlist_confirmed': 'Repertorio confirmado',
    'payment.paid': 'Pago recibido',
    'payment.recorded': 'Pago registrado',
    'payment.refunded': 'Pago devuelto',
    'conversation.started': 'Conversación iniciada',
    'conversation.message_sent': 'Mensaje enviado',
    'note.written': 'Nota interna',
};

function sourceLabel(sources: string[]) {
    const hasOwn = sources.includes('own_lead');
    const hasPlatform = sources.includes('platform_lead');
    if (hasOwn && hasPlatform) return 'Propias y aplicación';
    if (hasOwn) return 'Propias';
    if (hasPlatform) return 'Aplicación';
    return '—';
}

function statusLabel(status: string) {
    return serenataStatusLabel(status as Serenata['status']);
}

function timelineLabel(type: string) {
    return TIMELINE_LABELS[type] ?? type;
}

function timelineSecondary(event: OwnerContactDetail['events'][number]) {
    const payload = event.payload ?? {};
    const parts: string[] = [];
    if (typeof payload.fromStatus === 'string' && typeof payload.toStatus === 'string') {
        parts.push(`${statusLabel(payload.fromStatus)} → ${statusLabel(payload.toStatus)}`);
    } else if (typeof payload.toStatus === 'string') {
        parts.push(statusLabel(payload.toStatus));
    }
    if (typeof payload.rating === 'number') parts.push(`${payload.rating}★`);
    if (typeof payload.reason === 'string' && payload.reason.trim()) {
        parts.push(payload.reason.trim());
    }
    return parts.join(' · ');
}

function formatOccurredAt(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function ContactDetail({
    contactId,
    onBack,
}: {
    contactId: string;
    onBack: () => void;
}) {
    const [detail, setDetail] = useState<OwnerContactDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'serenatas' | 'historial' | 'notas'>('serenatas');

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(null);
            const response = await serenatasApi.ownerContactDetail(contactId);
            if (cancelled) return;
            if (!response.ok || !response.contact) {
                setError(response.error || 'No encontramos este contacto.');
                setDetail(null);
            } else {
                setDetail({
                    contact: response.contact,
                    serenatas: response.serenatas ?? [],
                    events: response.events ?? [],
                });
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [contactId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
                <IconLoader2 size={18} className="animate-spin" />
                Cargando contacto…
            </div>
        );
    }

    if (error || !detail) {
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
                <PanelCard className="p-6 text-sm text-fg-muted">{error ?? 'Contacto no encontrado.'}</PanelCard>
            </div>
        );
    }

    const { contact, serenatas, events } = detail;

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
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                    {contact.phone ? (
                        <span className="inline-flex items-center gap-1">
                            <IconPhone size={14} stroke={1.75} />
                            {contact.phone}
                        </span>
                    ) : null}
                    {contact.email ? <span>{contact.email}</span> : null}
                    {sourceLabel(contact.sources) ? <span>{sourceLabel(contact.sources)}</span> : null}
                    {contact.clientId ? (
                        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                            Cuenta Portal
                        </span>
                    ) : null}
                </p>
                <p className="mt-2 text-sm text-fg-muted">
                    {contact.serenataCount}{' '}
                    {contact.serenataCount === 1 ? 'serenata' : 'serenatas'}
                    {contact.completedCount > 0
                        ? ` · ${contact.completedCount} completada${contact.completedCount === 1 ? '' : 's'}`
                        : ''}
                </p>
            </div>

            <div className="flex gap-1 border-b border-(--border)">
                <button
                    type="button"
                    onClick={() => setTab('serenatas')}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                        tab === 'serenatas'
                            ? 'border-accent text-(--fg)'
                            : 'border-transparent text-fg-muted hover:text-(--fg)'
                    }`}
                >
                    <IconMusic size={15} stroke={1.75} />
                    Serenatas ({serenatas.length})
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
                <RelationshipNotesPanel vertical="serenatas" personId={contactId} />
            ) : tab === 'serenatas' ? (
                serenatas.length === 0 ? (
                    <PanelCard className="p-6 text-sm text-fg-muted">Sin serenatas asociadas.</PanelCard>
                ) : (
                    <ul className="divide-y divide-(--border) rounded-lg border border-(--border) bg-(--surface)">
                        {serenatas.map((item) => (
                            <li
                                key={item.id}
                                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-(--fg)">
                                        {item.recipientName}
                                        {item.comuna ? ` · ${item.comuna}` : ''}
                                    </p>
                                    <p className="mt-0.5 text-sm text-fg-muted">
                                        {statusLabel(item.status)}
                                        {item.eventDate ? ` · ${item.eventDate}` : ''}
                                        {item.eventTime ? ` ${item.eventTime}` : ''}
                                        {item.price != null ? ` · ${money(item.price)}` : ''}
                                    </p>
                                </div>
                                <Link
                                    href={panelSectionHref(
                                        item.status === 'scheduled' || item.status === 'completed'
                                            ? 'agenda'
                                            : 'solicitudes',
                                        { serenata: item.id },
                                    )}
                                    className="shrink-0 text-sm font-medium text-accent hover:underline"
                                >
                                    Abrir
                                </Link>
                            </li>
                        ))}
                    </ul>
                )
            ) : events.length === 0 ? (
                <PanelCard className="p-6 text-sm text-fg-muted">
                    Aún no hay eventos en el historial. Se irán registrando con nuevas solicitudes y cambios de estado.
                </PanelCard>
            ) : (
                <ul className="space-y-3">
                    {events.map((event) => {
                        const secondary = timelineSecondary(event);
                        return (
                            <li
                                key={event.id}
                                className="rounded-lg border border-(--border) bg-(--surface) px-4 py-3"
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="font-medium text-(--fg)">{timelineLabel(event.type)}</p>
                                    <time className="text-xs text-fg-muted" dateTime={event.occurredAt}>
                                        {formatOccurredAt(event.occurredAt)}
                                    </time>
                                </div>
                                {secondary ? (
                                    <p className="mt-1 text-sm text-fg-muted">{secondary}</p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export function ContactosView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('contacto');

    const [items, setItems] = useState<OwnerContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            const response = await serenatasApi.ownerContacts();
            if (!cancelled) {
                setItems(response.ok ? response.items : []);
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return items;
        return items.filter((item) => {
            const hay = [item.displayName, item.phone ?? '', item.email ?? ''].join(' ').toLowerCase();
            return hay.includes(needle);
        });
    }, [items, query]);

    const openContact = (id: string) => {
        router.push(panelSectionHref('contactos', { contacto: id }));
    };

    const clearContact = () => {
        router.push(panelSectionHref('contactos'));
    };

    if (selectedId) {
        return <ContactDetail contactId={selectedId} onBack={clearContact} />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
                <IconLoader2 size={18} className="animate-spin" />
                Cargando contactos…
            </div>
        );
    }

    return (
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
                    placeholder="Buscar por nombre, teléfono o email"
                    className="w-full rounded-lg border border-(--border) bg-(--surface) py-2.5 pl-9 pr-3 text-sm text-(--fg) outline-none focus:border-accent"
                />
            </div>

            {filtered.length === 0 ? (
                <PanelCard className="p-6 text-sm text-fg-muted">
                    {items.length === 0
                        ? 'Aún no tienes contratantes. Aparecerán aquí cuando recibas o registres serenatas.'
                        : 'Ningún contacto coincide con la búsqueda.'}
                </PanelCard>
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
                                    <p className="truncate font-medium text-(--fg)">{contact.displayName}</p>
                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                                        {contact.phone ? (
                                            <span className="inline-flex items-center gap-1">
                                                <IconPhone size={14} stroke={1.75} />
                                                {contact.phone}
                                            </span>
                                        ) : null}
                                        <span>
                                            {contact.serenataCount}{' '}
                                            {contact.serenataCount === 1 ? 'serenata' : 'serenatas'}
                                            {contact.completedCount > 0
                                                ? ` · ${contact.completedCount} completada${contact.completedCount === 1 ? '' : 's'}`
                                                : ''}
                                        </span>
                                        <span>{sourceLabel(contact.sources)}</span>
                                    </p>
                                </div>
                                <span className="shrink-0 text-xs text-fg-muted">
                                    Última: {statusLabel(contact.lastStatus)}
                                    {contact.lastEventDate ? ` · ${contact.lastEventDate}` : ''}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
