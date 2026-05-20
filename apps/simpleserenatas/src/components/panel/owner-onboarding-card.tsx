'use client';

import { useEffect, useState } from 'react';
import { PanelButton, PanelCard, PanelNotice } from '@simple/ui';
import { serenatasApi, type Profiles } from '@/lib/serenatas-api';
import { ownerFeaturesEnabled } from '@/lib/app-mode';
import type { Section } from '@/context/serenata-context';

export function OwnerOnboardingCard({
    profiles,
    setSection,
}: {
    profiles: Profiles;
    setSection: (section: Section) => void;
}) {
    const [hasProviderGroup, setHasProviderGroup] = useState<boolean | null>(null);
    const ownerActive = ownerFeaturesEnabled(profiles);

    useEffect(() => {
        if (!ownerActive) {
            setHasProviderGroup(null);
            return;
        }
        let cancelled = false;
        void serenatasApi.myProviderGroups().then((response) => {
            if (cancelled) return;
            setHasProviderGroup(response.ok && response.items.length > 0);
        });
        return () => {
            cancelled = true;
        };
    }, [ownerActive]);

    if (!ownerActive || hasProviderGroup !== false) return null;

    return (
        <PanelCard className="border-accent-border bg-accent-soft">
            <h3 className="text-lg font-semibold text-[var(--fg)]">Crea tu mariachi en el marketplace</h3>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Aún no tienes un mariachi publicado en el marketplace. Configura tu marca comercial, servicios y zonas de trabajo para
                recibir solicitudes directas de clientes.
            </p>
            <PanelNotice tone="neutral" className="mt-4">
                En <strong>Mi Negocio</strong> configuras tu perfil comercial, servicios y el equipo de músicos.
            </PanelNotice>
            <div className="mt-4">
                <PanelButton onClick={() => setSection('mi-negocio')}>Crear mi mariachi</PanelButton>
            </div>
        </PanelCard>
    );
}
