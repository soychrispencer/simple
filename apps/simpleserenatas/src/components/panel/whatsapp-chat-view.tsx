'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconBrandWhatsapp, IconCopy, IconExternalLink, IconRefresh } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelEmptyState, PanelNotice } from '@simple/ui/panel';
import type { Serenata } from '@/lib/serenatas-api';
import { formatDate, money, serenataStatusLabel } from './shared';

type WhatsAppChatViewProps = {
    serenatas: Serenata[];
    refresh: () => Promise<void>;
};

const MESSAGE_TEMPLATES = [
    {
        label: 'Confirmar disponibilidad',
        text: 'Hola, soy de SimpleSerenatas. Recibimos tu solicitud y estamos revisando la disponibilidad para tu serenata.',
    },
    {
        label: 'Pedir datos',
        text: 'Hola, soy de SimpleSerenatas. Para coordinar mejor la serenata, ¿me confirmas dirección exacta, referencia del lugar y horario ideal?',
    },
    {
        label: 'Recordatorio',
        text: 'Hola, te escribo desde SimpleSerenatas para confirmar que tu serenata sigue programada. Cualquier cambio me avisas por aquí.',
    },
    {
        label: 'Cierre',
        text: 'Hola, gracias por coordinar tu serenata con nosotros. Si necesitas otra fecha o quieres recomendar el servicio, puedes escribirnos por este chat.',
    },
] as const;

function normalizePhoneForWhatsApp(phone: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('56')) return digits;
    if (digits.length === 9) return `56${digits}`;
    if (digits.length === 8) return `569${digits}`;
    return digits;
}

function defaultMessage(item: Serenata | null): string {
    if (!item) return '';
    const parts = [
        `Hola ${item.recipientName}, soy de SimpleSerenatas.`,
        `Te escribo por tu solicitud de serenata para el ${formatDate(item.eventDate)}${item.eventTime ? ` a las ${item.eventTime}` : ''}.`,
        '¿Me confirmas que los datos están correctos para coordinar?',
    ];
    return parts.join(' ');
}

export function WhatsAppChatView({ serenatas, refresh }: WhatsAppChatViewProps) {
    const conversations = useMemo(
        () =>
            serenatas
                .filter((item) => item.clientPhone)
                .sort((a, b) => `${b.eventDate} ${b.eventTime ?? ''}`.localeCompare(`${a.eventDate} ${a.eventTime ?? ''}`)),
        [serenatas],
    );
    const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
    const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0] ?? null;
    const [message, setMessage] = useState(() => defaultMessage(selected));
    const [copied, setCopied] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (selectedId || !conversations[0]) return;
        setSelectedId(conversations[0].id);
        setMessage(defaultMessage(conversations[0]));
    }, [conversations, selectedId]);

    function selectConversation(item: Serenata) {
        setSelectedId(item.id);
        setMessage(defaultMessage(item));
        setCopied(false);
    }

    async function copyMessage() {
        if (!message.trim()) return;
        await navigator.clipboard.writeText(message.trim());
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    }

    async function handleRefresh() {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }

    const phone = normalizePhoneForWhatsApp(selected?.clientPhone ?? null);
    const whatsappHref = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message.trim() || defaultMessage(selected))}`
        : null;

    if (conversations.length === 0) {
        return (
            <PanelCard>
                <PanelEmptyState
                    title="Aún no hay conversaciones"
                    description="Cuando una solicitud tenga teléfono o WhatsApp, aparecerá aquí para que puedas responder desde el panel."
                />
            </PanelCard>
        );
    }

    return (
        <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <PanelNotice tone="neutral" className="xl:col-span-2">
                Esta sección centraliza las solicitudes con teléfono y prepara mensajes para WhatsApp. La conversación queda
                asociada a cada solicitud para que el equipo responda más rápido.
            </PanelNotice>

            <PanelCard className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-fg">Conversaciones</h2>
                        <p className="text-sm text-fg-muted">{conversations.length} solicitudes con contacto</p>
                    </div>
                    <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:bg-bg-subtle"
                        aria-label="Actualizar conversaciones"
                        onClick={() => void handleRefresh()}
                    >
                        <IconRefresh size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="grid max-h-[34rem] gap-2 overflow-auto pr-1">
                    {conversations.map((item) => {
                        const active = selected?.id === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className="rounded-xl border p-3 text-left transition-colors"
                                style={{
                                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                                    background: active ? 'var(--accent-soft)' : 'var(--surface)',
                                }}
                                onClick={() => selectConversation(item)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-fg">{item.recipientName}</p>
                                        <p className="truncate text-xs text-fg-muted">{item.clientPhone}</p>
                                    </div>
                                    <span className="rounded-full bg-bg-muted px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                                        {serenataStatusLabel(item.status)}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-fg-secondary">
                                    {formatDate(item.eventDate)}
                                    {item.eventTime ? ` · ${item.eventTime}` : ''}
                                    {item.price ? ` · ${money(item.price)}` : ''}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </PanelCard>

            <PanelCard className="min-w-0">
                {selected ? (
                    <div className="grid gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <IconBrandWhatsapp size={20} style={{ color: '#22c55e' }} aria-hidden />
                                    <h2 className="text-lg font-semibold text-fg">{selected.recipientName}</h2>
                                </div>
                                <p className="mt-1 text-sm text-fg-muted">
                                    {selected.clientPhone} · {formatDate(selected.eventDate)}
                                    {selected.eventTime ? ` · ${selected.eventTime}` : ''}
                                </p>
                            </div>
                            <span className="w-fit rounded-full bg-bg-muted px-3 py-1 text-xs font-medium text-fg-secondary">
                                {selected.source === 'own_lead' ? 'Cliente propio' : 'SimpleSerenatas'}
                            </span>
                        </div>

                        <div className="rounded-xl border border-border bg-bg-subtle p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-fg-muted">Solicitud</p>
                            <p className="mt-2 text-sm text-fg-secondary">
                                {selected.address}
                                {selected.comuna ? `, ${selected.comuna}` : ''}
                                {selected.region ? `, ${selected.region}` : ''}
                            </p>
                            {selected.message ? <p className="mt-2 text-sm text-fg-muted">"{selected.message}"</p> : null}
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-semibold text-fg">Plantillas rápidas</p>
                            <div className="flex flex-wrap gap-2">
                                {MESSAGE_TEMPLATES.map((template) => (
                                    <button
                                        key={template.label}
                                        type="button"
                                        className="rounded-full border border-border px-3 py-1.5 text-sm text-fg-secondary hover:bg-bg-subtle"
                                        onClick={() => setMessage(template.text)}
                                    >
                                        {template.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="grid gap-2">
                            <span className="text-sm font-semibold text-fg">Mensaje</span>
                            <textarea
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                rows={7}
                                className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-3 text-sm text-fg outline-none focus:border-accent"
                            />
                        </label>

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <PanelButton type="button" variant="secondary" onClick={() => void copyMessage()}>
                                <IconCopy size={16} />
                                {copied ? 'Copiado' : 'Copiar mensaje'}
                            </PanelButton>
                            <PanelButton
                                type="button"
                                variant="primary"
                                disabled={!whatsappHref}
                                onClick={() => {
                                    if (whatsappHref) window.open(whatsappHref, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                <IconExternalLink size={16} />
                                Abrir WhatsApp
                            </PanelButton>
                        </div>
                    </div>
                ) : null}
            </PanelCard>
        </div>
    );
}
