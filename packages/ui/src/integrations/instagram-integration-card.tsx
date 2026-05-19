'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    IconBrandInstagram,
    IconExternalLink,
    IconLoader2,
    IconPlugConnected,
    IconTrash,
} from '@tabler/icons-react';
import { PanelBlockHeader, PanelNotice, PanelStatusBadge, PanelSwitch } from '../panel/panel-primitives';
import { PanelButton } from '../panel/panel-button';
import { PanelCard } from '../panel/panel-card';

export type InstagramIntegrationAccount = {
    username: string;
    displayName: string | null;
    accountType: string | null;
    profilePictureUrl: string | null;
    status: 'connected' | 'error' | 'disconnected';
    autoPublishEnabled: boolean;
    captionTemplate: string | null;
    lastError: string | null;
    lastSyncedAt?: number | null;
    lastPublishedAt?: number | null;
    scopes?: string[];
};

export type InstagramIntegrationPublication = {
    id: string;
    listingTitle: string;
    status: 'published' | 'failed';
    instagramPermalink: string | null;
    errorMessage: string | null;
    publishedAt: number | null;
    createdAt: number;
};

export type InstagramIntegrationStatus = {
    configured: boolean;
    eligible: boolean;
    currentPlanId: string;
    account: InstagramIntegrationAccount | null;
    recentPublications: InstagramIntegrationPublication[];
};

export type InstagramIntegrationCardProps = {
    panelDescription: string;
    subscriptionsHref?: string;
    autoPublishDescription: string;
    autoPublishAriaLabel: string;
    captionPlaceholder: string;
    listingNoun?: string;
    buildConnectUrl: (returnTo: string) => string;
    fetchStatus: () => Promise<InstagramIntegrationStatus | null>;
    updateSettings: (input: {
        autoPublishEnabled: boolean;
        captionTemplate: string | null;
    }) => Promise<{ ok: boolean; account?: InstagramIntegrationAccount | null; error?: string }>;
    disconnect: () => Promise<{ ok: boolean; error?: string }>;
    renderProfileImage?: (account: InstagramIntegrationAccount) => ReactNode;
    renderConnectedAccountExtra?: (account: InstagramIntegrationAccount) => ReactNode;
    settingsFooter?: ReactNode | ((handlers: { setMessage: (message: string) => void; setError: (error: string) => void }) => ReactNode);
};

function formatDate(value: number | null | undefined): string {
    if (!value) return 'Aún sin actividad';
    return new Date(value).toLocaleString('es-CL');
}

export function InstagramIntegrationCard({
    panelDescription,
    subscriptionsHref = '/panel/suscripciones',
    autoPublishDescription,
    autoPublishAriaLabel,
    captionPlaceholder,
    listingNoun = 'avisos',
    buildConnectUrl,
    fetchStatus,
    updateSettings,
    disconnect,
    renderProfileImage,
    renderConnectedAccountExtra,
    settingsFooter,
}: InstagramIntegrationCardProps) {
    const [status, setStatus] = useState<InstagramIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
    const [captionTemplate, setCaptionTemplate] = useState('');

    const loadStatus = async () => {
        setLoading(true);
        const nextStatus = await fetchStatus();
        setStatus(nextStatus);
        setAutoPublishEnabled(nextStatus?.account?.autoPublishEnabled ?? false);
        setCaptionTemplate(nextStatus?.account?.captionTemplate ?? '');
        if (!nextStatus) {
            setError('No pudimos cargar la integración de Instagram.');
        }
        setLoading(false);
    };

    useEffect(() => {
        void loadStatus();
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);
        const instagramStatus = url.searchParams.get('instagram');
        const instagramMessage = url.searchParams.get('instagramMessage');
        if (!instagramStatus && !instagramMessage) return;

        if (instagramStatus === 'connected') {
            setMessage(instagramMessage || 'Cuenta de Instagram conectada correctamente.');
            setError(null);
            void loadStatus();
        } else if (instagramStatus === 'error') {
            setError(instagramMessage || 'No se pudo completar la conexión con Instagram.');
            setMessage(null);
        }

        url.searchParams.delete('instagram');
        url.searchParams.delete('instagramMessage');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }, []);

    const onConnect = () => {
        setError(null);
        window.location.assign(buildConnectUrl(window.location.href));
    };

    const onSave = async () => {
        setSaving(true);
        setError(null);
        setMessage(null);
        const result = await updateSettings({
            autoPublishEnabled,
            captionTemplate: captionTemplate.trim() || null,
        });
        setSaving(false);

        if (!result.ok || !result.account) {
            setError(result.error ?? 'No pudimos guardar la configuración de Instagram.');
            return;
        }

        setStatus((current) => (current ? { ...current, account: result.account ?? null } : current));
        setMessage('Configuración de Instagram guardada.');
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        setMessage(null);
        const result = await disconnect();
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar Instagram.');
            return;
        }
        setMessage('Instagram fue desconectado.');
        await loadStatus();
    };

    const defaultProfileImage = (account: InstagramIntegrationAccount) =>
        account.profilePictureUrl ? (
            <img
                src={account.profilePictureUrl}
                alt={account.username}
                className="h-12 w-12 rounded-full border border-(--border) object-cover"
            />
        ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-(--fg)">
                <IconBrandInstagram size={18} />
            </span>
        );

    return (
        <PanelCard size="lg">
            <PanelBlockHeader title="Instagram" description={panelDescription} className="mb-4" />

            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? (
                <div className="h-32 animate-pulse rounded-card bg-(--bg-muted)" />
            ) : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de Instagram.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    Instagram aún no está configurado en el backend. Falta `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` y
                    `INSTAGRAM_REDIRECT_URI`.
                </PanelNotice>
            ) : !status.eligible ? (
                <div className="space-y-4 rounded-card border border-(--border) bg-(--bg-subtle) p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--fg)">
                                <IconBrandInstagram size={18} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-(--fg)">Disponible para Pro y Empresa</p>
                                <p className="text-sm text-(--fg-secondary)">
                                    Tu plan actual es <span className="font-medium">{status.currentPlanId}</span>. Actualiza la
                                    suscripción para conectar Instagram y activar autopost.
                                </p>
                            </div>
                        </div>
                        <PanelStatusBadge label="Bloqueado" tone="warning" size="sm" />
                    </div>
                    <Link href={subscriptionsHref}>
                        <PanelButton variant="primary" className="w-full sm:w-auto">
                            <IconPlugConnected size={14} /> Ver suscripciones
                        </PanelButton>
                    </Link>
                </div>
            ) : !status.account ? (
                <div className="space-y-4 rounded-card border border-(--border) bg-(--bg-subtle) p-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--border) bg-(--surface) text-(--fg)">
                            <IconBrandInstagram size={18} />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-(--fg)">Conecta tu cuenta profesional</p>
                            <p className="text-sm text-(--fg-secondary)">
                                Requiere una cuenta profesional de Instagram. Después podrás publicar {listingNoun} activos sin salir del panel.
                            </p>
                        </div>
                    </div>
                    <PanelButton variant="primary" onClick={onConnect} className="w-full sm:w-auto">
                        <IconPlugConnected size={14} /> Conectar Instagram
                    </PanelButton>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="rounded-card border border-(--border) bg-(--bg-subtle) p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {renderProfileImage ? renderProfileImage(status.account) : defaultProfileImage(status.account)}
                                <div>
                                    <p className="text-sm font-semibold text-(--fg)">@{status.account.username}</p>
                                    <p className="text-sm text-(--fg-secondary)">
                                        {status.account.displayName || 'Cuenta profesional'}
                                        {status.account.accountType ? ` · ${status.account.accountType}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <PanelStatusBadge
                                    label={status.account.status === 'connected' ? 'Conectada' : 'Revisar'}
                                    tone={status.account.status === 'connected' ? 'success' : 'warning'}
                                    size="sm"
                                />
                                <PanelButton variant="secondary" size="sm" onClick={onConnect}>
                                    <IconPlugConnected size={13} /> Reconectar
                                </PanelButton>
                                <PanelButton variant="secondary" size="sm" onClick={() => void onDisconnect()} disabled={disconnecting}>
                                    {disconnecting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                </PanelButton>
                            </div>
                        </div>
                        {renderConnectedAccountExtra?.(status.account)}
                        {status.account.lastError ? <PanelNotice tone="warning" className="mt-4">{status.account.lastError}</PanelNotice> : null}
                    </div>

                    <div className="space-y-4 rounded-card border border-(--border) bg-(--bg-subtle) p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-(--fg)">Autopublicar {listingNoun} activos</p>
                                <p className="text-sm text-(--fg-secondary)">{autoPublishDescription}</p>
                            </div>
                            <PanelSwitch checked={autoPublishEnabled} onChange={setAutoPublishEnabled} ariaLabel={autoPublishAriaLabel} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-(--fg)">Plantilla de caption</label>
                            <textarea
                                className="form-textarea"
                                rows={5}
                                value={captionTemplate}
                                onChange={(event) => setCaptionTemplate(event.target.value)}
                                placeholder={captionPlaceholder}
                            />
                            <p className="mt-2 text-xs text-(--fg-muted)">
                                Variables: <code>{'{{title}}'}</code>, <code>{'{{price}}'}</code>, <code>{'{{location}}'}</code>,{' '}
                                <code>{'{{description}}'}</code>, <code>{'{{summary}}'}</code>, <code>{'{{url}}'}</code>
                            </p>
                        </div>
                        <PanelButton variant="primary" onClick={() => void onSave()} disabled={saving}>
                            {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconPlugConnected size={14} />} Guardar configuración
                        </PanelButton>
                        {typeof settingsFooter === 'function'
                            ? settingsFooter({ setMessage, setError })
                            : settingsFooter}
                    </div>

                    <div className="rounded-card border border-(--border) bg-(--bg-subtle) p-5">
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-(--fg)">Actividad reciente</p>
                            <p className="text-sm text-(--fg-secondary)">Últimos intentos de publicación desde el panel.</p>
                        </div>
                        {status.recentPublications.length === 0 ? (
                            <PanelNotice tone="neutral">Todavía no has publicado {listingNoun} en Instagram.</PanelNotice>
                        ) : (
                            <div className="space-y-3">
                                {status.recentPublications.map((publication) => (
                                    <article
                                        key={publication.id}
                                        className="rounded-xl border border-(--border) bg-(--surface) p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-(--fg)">{publication.listingTitle}</p>
                                                <p className="mt-1 text-xs text-(--fg-secondary)">
                                                    {formatDate(publication.publishedAt ?? publication.createdAt)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <PanelStatusBadge
                                                    label={publication.status === 'published' ? 'Publicado' : 'Falló'}
                                                    tone={publication.status === 'published' ? 'success' : 'warning'}
                                                    size="sm"
                                                />
                                                {publication.instagramPermalink ? (
                                                    <a href={publication.instagramPermalink} target="_blank" rel="noreferrer" className="inline-flex">
                                                        <PanelButton variant="secondary" size="sm">
                                                            <IconExternalLink size={13} /> Ver post
                                                        </PanelButton>
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        {publication.errorMessage ? (
                                            <p className="mt-2 text-xs text-(--fg-muted)">{publication.errorMessage}</p>
                                        ) : null}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </PanelCard>
    );
}
