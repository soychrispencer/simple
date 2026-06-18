'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
    IconBrandInstagram,
    IconExternalLink,
    IconLoader2,
    IconPlugConnected,
} from '@tabler/icons-react';
import { PanelButton } from '../panel/panel-button';
import { PanelCard } from '../panel/panel-card';
import { PanelNotice, PanelStatusBadge, PanelSwitch } from '../panel/panel-primitives';
import { IntegrationConnectRow } from './integration-connect-row';

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
    subscriptionsHref = '/panel/mi-cuenta/suscripcion',
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
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? (
                <div className="h-20 animate-pulse rounded-card bg-(--bg-muted)" />
            ) : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de Instagram.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    Instagram aún no está configurado en el backend. Falta `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` y
                    `INSTAGRAM_REDIRECT_URI`.
                </PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandInstagram size={18} />}
                    title="Instagram"
                    description={panelDescription}
                    connected={false}
                    locked
                    lockedHint={`Tu plan actual es ${status.currentPlanId}. Disponible en Pro y Empresa para conectar y autopublicar.`}
                    subscriptionsHref={subscriptionsHref}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : !status.account ? (
                <IntegrationConnectRow
                    icon={<IconBrandInstagram size={18} />}
                    title="Instagram"
                    description={`Cuenta profesional requerida. Publica ${listingNoun} activos sin salir del panel.`}
                    connected={false}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : (
                <div className="space-y-5">
                    <IntegrationConnectRow
                        icon={renderProfileImage ? renderProfileImage(status.account) : defaultProfileImage(status.account)}
                        title="Instagram"
                        description={panelDescription}
                        connected={status.account.status === 'connected'}
                        busy={disconnecting}
                        onConnect={onConnect}
                        onDisconnect={onDisconnect}
                        footer={(
                            <div className="space-y-3 border-t border-(--border) pt-3">
                                <p className="text-sm text-(--fg-secondary)">
                                    @{status.account.username}
                                    {status.account.displayName ? ` · ${status.account.displayName}` : ''}
                                    {status.account.accountType ? ` · ${status.account.accountType}` : ''}
                                </p>
                                {renderConnectedAccountExtra?.(status.account)}
                                {status.account.lastError ? <PanelNotice tone="warning">{status.account.lastError}</PanelNotice> : null}
                            </div>
                        )}
                    />

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
