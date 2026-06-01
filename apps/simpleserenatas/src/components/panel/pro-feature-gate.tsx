'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { IconLock, IconLoader2 } from '@tabler/icons-react';
import { getPanelButtonClassName, getPanelButtonStyle, PanelCard, PanelNotice } from '@simple/ui/panel';
import { profileSectionHref } from '@/lib/account-tab';
import { serenatasApi, type SerenataMePlan } from '@/lib/serenatas-api';

type ProFeatureGateProps = {
    featureName: string;
    description: string;
    children: ReactNode;
};

export function ProFeatureGate({ featureName, description, children }: ProFeatureGateProps) {
    const [plan, setPlan] = useState<SerenataMePlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        void serenatasApi.mePlan().then((response) => {
            if (cancelled) return;
            if (response.ok) {
                setPlan(response);
            } else {
                setError(response.error ?? 'No pudimos validar tu plan.');
            }
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <PanelCard>
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={16} className="animate-spin" aria-hidden />
                    Validando tu plan...
                </div>
            </PanelCard>
        );
    }

    if (plan?.plan === 'pro') return <>{children}</>;

    return (
        <div className="grid gap-4">
            {error ? <PanelNotice tone="warning">{error}</PanelNotice> : null}
            <PanelCard size="lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                        <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                            aria-hidden
                        >
                            <IconLock size={21} />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold text-fg">{featureName} es una función Pro</h2>
                                <span className="rounded-[7px] border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.04em] text-fg-muted">
                                    Pro
                                </span>
                            </div>
                            <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>
                            <p className="mt-3 text-sm text-fg-secondary">
                                Tu plan Gratis sigue activo para operar, publicar servicios, recibir solicitudes y gestionar tu
                                agenda. Pro agrega herramientas de mayor margen y operación avanzada.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={profileSectionHref('subscription')}
                        className={getPanelButtonClassName({ className: 'sm:shrink-0' })}
                        style={getPanelButtonStyle('primary')}
                    >
                        Ver plan Pro
                    </Link>
                </div>
            </PanelCard>
        </div>
    );
}
