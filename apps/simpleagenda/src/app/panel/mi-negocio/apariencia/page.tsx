'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowRight, IconLoader2 } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelMiNegocioShell, PanelNotice } from '@simple/ui/panel';
import { AgendaBusinessPublishToggle } from '@/components/panel/agenda-business-publish-toggle';
import { AgendaLandingBuilder } from '@/components/panel/agenda-landing-builder';
import { AgendaPublicLinkPanel } from '@/components/panel/agenda-public-link-panel';
import { getAgendaBusinessTabs } from '@/components/panel/panel-section-tabs';
import { useAgendaIsTeamWorkspace } from '@/components/panel/agenda-vocab-context';
import { fetchAgendaProfile, hasAgendaFullAccess, type AgendaProfile } from '@/lib/agenda-api';

export default function AgendaWebsitePage() {
    const isTeamWorkspace = useAgendaIsTeamWorkspace();
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const current = await fetchAgendaProfile();
                if (!active) return;
                setProfile(current);
                setLoadError(current ? '' : 'No encontramos el perfil de tu negocio.');
            } catch {
                if (active) setLoadError('No pudimos cargar tu página.');
            } finally {
                if (active) setLoading(false);
            }
        }
        const refresh = () => { void load(); };
        void load();
        window.addEventListener('simple:agenda-profile-changed', refresh);
        window.addEventListener('simple:agenda-publish-changed', refresh);
        return () => {
            active = false;
            window.removeEventListener('simple:agenda-profile-changed', refresh);
            window.removeEventListener('simple:agenda-publish-changed', refresh);
        };
    }, [loadAttempt]);

    const canCustomize = !!profile && hasAgendaFullAccess(profile);

    return (
        <PanelMiNegocioShell
            activeKey="pagina"
            tabs={getAgendaBusinessTabs(isTeamWorkspace)}
            title="Página web"
            description={canCustomize
                ? 'Diseña la página donde tus clientes te conocen y reservan.'
                : 'Comparte tu enlace para recibir citas.'}
            publishToggle={!loading && profile ? <AgendaBusinessPublishToggle /> : undefined}
        >
            <div className={canCustomize ? 'mx-auto w-full max-w-[72rem]' : 'mx-auto w-full max-w-[56rem]'}>
                {loading ? (
                    <div role="status" className="flex items-center gap-2 text-sm text-fg-muted">
                        <IconLoader2 size={16} className="animate-spin" aria-hidden="true" /> Cargando tu página…
                    </div>
                ) : loadError || !profile ? (
                    <PanelNotice tone="error">
                        <div className="flex flex-wrap items-center gap-3">
                            {loadError || 'No encontramos el perfil de tu negocio.'}
                            <PanelButton onClick={() => {
                                setLoading(true);
                                setLoadAttempt((attempt) => attempt + 1);
                            }}>Reintentar</PanelButton>
                        </div>
                    </PanelNotice>
                ) : canCustomize ? (
                    <AgendaLandingBuilder
                        key={profile.id}
                        profile={profile}
                        onPublished={(changes) => {
                            setProfile((current) => current?.id === profile.id ? { ...current, ...changes } : current);
                            window.dispatchEvent(new CustomEvent('simple:agenda-publish-changed', { detail: { isPublished: true } }));
                        }}
                    />
                ) : (
                    <div id="agenda-public-link" className="scroll-mt-24 space-y-5">
                        <AgendaPublicLinkPanel previewUrl={profile.isPublished ? undefined : `/vista-previa?profile=${encodeURIComponent(profile.id)}`} />
                        <PanelCard size="lg">
                            <h2 className="text-lg font-bold tracking-tight text-fg">Tu página con marca propia</h2>
                            <p className="mt-2 text-sm text-fg-secondary">Desde Pro puedes personalizar diseño, colores, portada y textos con IA. Tu enlace de reservas está incluido en Gratis.</p>
                            <Link
                                href="/panel/mi-negocio/plan"
                                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90"
                            >
                                Conocer Pro <IconArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </PanelCard>
                    </div>
                )}
            </div>
        </PanelMiNegocioShell>
    );
}
