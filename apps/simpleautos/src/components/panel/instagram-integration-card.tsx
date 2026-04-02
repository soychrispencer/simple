'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconBrandInstagram, IconExternalLink, IconLoader2, IconPlugConnected, IconTrash } from '@tabler/icons-react';
import { PanelBlockHeader, PanelButton, PanelCard, PanelNotice, PanelStatusBadge, PanelSwitch } from '@simple/ui';
import {
    buildInstagramConnectUrl,
    disconnectInstagram,
    fetchInstagramIntegrationStatus,
    updateInstagramSettings,
    type InstagramIntegrationStatus,
} from '@/lib/instagram';

function formatDate(value: number | null): string {
    if (!value) return 'Aún sin actividad';
    return new Date(value).toLocaleString('es-CL');
}

export default function InstagramIntegrationCard() {
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
        const nextStatus = await fetchInstagramIntegrationStatus();
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
        window.location.assign(buildInstagramConnectUrl(window.location.href));
    };

    const onSave = async () => {
        setSaving(true);
        setError(null);
        setMessage(null);
        const result = await updateInstagramSettings({
            autoPublishEnabled,
            captionTemplate: captionTemplate.trim() || null,
        });
        setSaving(false);

        if (!result.ok || !result.account) {
            setError(result.error ?? 'No pudimos guardar la configuración de Instagram.');
            return;
        }

        const nextAccount = result.account ?? null;
        setStatus((current) => current ? { ...current, account: nextAccount } : current);
        setMessage('Configuración de Instagram guardada.');
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        setMessage(null);
        const result = await disconnectInstagram();
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar Instagram.');
            return;
        }
        setMessage('Instagram fue desconectado.');
        await loadStatus();
    };

    return (
        <PanelCard size="lg">
            <PanelBlockHeader
                title="Instagram"
                description="Conecta una cuenta profesional y publica avisos directamente desde SimpleAutos."
                className="mb-4"
            />

            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? (
                <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
            ) : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de Instagram.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    Instagram aún no está configurado en el backend. Falta `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` y `INSTAGRAM_REDIRECT_URI`.
                </PanelNotice>
            ) : !status.eligible ? (
                <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                                <IconBrandInstagram size={18} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Disponible para Pro y Empresa</p>
                                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    Tu plan actual es <span className="font-medium">{status.currentPlanId}</span>. Actualiza la suscripción para conectar Instagram y activar autopost.
                                </p>
                            </div>
                        </div>
                        <PanelStatusBadge label="Bloqueado" tone="warning" size="sm" />
                    </div>

                    <Link href="/panel/suscripciones">
                        <PanelButton variant="primary" className="w-full sm:w-auto">
                            <IconPlugConnected size={14} /> Ver suscripciones
                        </PanelButton>
                    </Link>
                </div>
            ) : !status.account ? (
                <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                            <IconBrandInstagram size={18} />
                        </span>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Conecta tu cuenta profesional</p>
                            <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                Requiere una cuenta profesional de Instagram. Después podrás publicar avisos activos sin salir del panel.
                            </p>
                        </div>
                    </div>

                    <PanelButton variant="primary" onClick={onConnect} className="w-full sm:w-auto">
                        <IconPlugConnected size={14} /> Conectar Instagram
                    </PanelButton>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                                {status.account.profilePictureUrl ? (
                                    <img
                                        src={status.account.profilePictureUrl}
                                        alt={status.account.username}
                                        className="h-12 w-12 rounded-full border object-cover"
                                        style={{ borderColor: 'var(--border)' }}
                                    />
                                ) : (
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full border" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}>
                                        <IconBrandInstagram size={18} />
                                    </span>
                                )}
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>@{status.account.username}</p>
                                    <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                        {status.account.displayName || 'Cuenta profesional'}{status.account.accountType ? ` · ${status.account.accountType}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <PanelStatusBadge label={status.account.status === 'connected' ? 'Conectada' : 'Revisar'} tone={status.account.status === 'connected' ? 'success' : 'warning'} size="sm" />
                                <PanelButton variant="secondary" size="sm" onClick={onConnect}>
                                    <IconPlugConnected size={13} /> Reconectar
                                </PanelButton>
                                <PanelButton variant="secondary" size="sm" onClick={() => void onDisconnect()} disabled={disconnecting}>
                                    {disconnecting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />} Desconectar
                                </PanelButton>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Última sincronización</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg)' }}>{formatDate(status.account.lastSyncedAt)}</p>
                            </div>
                            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Último post</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg)' }}>{formatDate(status.account.lastPublishedAt)}</p>
                            </div>
                            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Scopes</p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg)' }}>{status.account.scopes.length > 0 ? status.account.scopes.join(', ') : 'Sin scopes reportados'}</p>
                            </div>
                        </div>

                        {status.account.lastError ? <PanelNotice tone="warning" className="mt-4">{status.account.lastError}</PanelNotice> : null}
                    </div>

                    <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Autopublicar avisos activos</p>
                                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    Cuando un aviso quede activo, SimpleAutos intentará publicarlo automáticamente en Instagram.
                                </p>
                            </div>
                            <PanelSwitch checked={autoPublishEnabled} onChange={setAutoPublishEnabled} ariaLabel="Autopublicar avisos en Instagram" />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--fg)' }}>Plantilla de caption</label>
                            <textarea
                                className="form-textarea"
                                rows={5}
                                value={captionTemplate}
                                onChange={(event) => setCaptionTemplate(event.target.value)}
                                placeholder="🚗 {{title}}\n💰 {{price}}\n📍 {{location}}\n\n{{description}}\n\n🔗 Ver más: {{url}}\n\n#SimpleAutos #AutosChile"
                            />
                            <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                Variables disponibles: <code>{'{{title}}'}</code>, <code>{'{{price}}'}</code>, <code>{'{{location}}'}</code>, <code>{'{{description}}'}</code>, <code>{'{{summary}}'}</code>, <code>{'{{url}}'}</code>
                            </p>
                        </div>

                        <PanelButton variant="primary" onClick={() => void onSave()} disabled={saving}>
                            {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconPlugConnected size={14} />} Guardar configuración
                        </PanelButton>
                    </div>

                    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                        <div className="mb-4">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Actividad reciente</p>
                            <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Últimos intentos de publicación desde el panel.</p>
                        </div>

                        {status.recentPublications.length === 0 ? (
                            <PanelNotice tone="neutral">Todavía no has publicado avisos en Instagram.</PanelNotice>
                        ) : (
                            <div className="space-y-3">
                                {status.recentPublications.map((publication) => (
                                    <article key={publication.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{publication.listingTitle}</p>
                                                <p className="mt-1 text-xs" style={{ color: 'var(--fg-secondary)' }}>{formatDate(publication.publishedAt ?? publication.createdAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <PanelStatusBadge label={publication.status === 'published' ? 'Publicado' : 'Falló'} tone={publication.status === 'published' ? 'success' : 'warning'} size="sm" />
                                                {publication.instagramPermalink ? (
                                                    <a href={publication.instagramPermalink} target="_blank" rel="noreferrer" className="inline-flex">
                                                        <PanelButton variant="secondary" size="sm">
                                                            <IconExternalLink size={13} /> Ver post
                                                        </PanelButton>
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        {publication.errorMessage ? <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>{publication.errorMessage}</p> : null}
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
