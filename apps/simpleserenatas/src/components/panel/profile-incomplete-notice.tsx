'use client';

import Link from 'next/link';
import { PanelNotice } from '@simple/ui';
import type { Profiles } from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { ownerFeaturesEnabled } from '@/lib/app-mode';
import { panelMiNegocioHref } from '@/lib/panel-routes';

export function isProfileIncomplete(mode: AppMode, profiles: Profiles): boolean {
    if (mode === 'client') {
        const client = profiles.client;
        if (!client) return true;
        return !client.phone?.trim() || !client.comuna?.trim() || !client.region?.trim();
    }

    if (ownerFeaturesEnabled(profiles)) {
        const adminComunas = profiles.owner?.workingComunas ?? [];
        return adminComunas.length === 0;
    }

    return (
        !profiles.musician?.instrument ||
        !profiles.musician?.workZones ||
        profiles.musician.workZones.length === 0
    );
}

function profileMissingLabels(mode: AppMode, profiles: Profiles): string[] {
    if (mode === 'client') {
        const client = profiles.client;
        const missing: string[] = [];
        if (!client?.phone?.trim()) missing.push('teléfono');
        if (!client?.region?.trim()) missing.push('región');
        if (!client?.comuna?.trim()) missing.push('comuna');
        return missing;
    }

    const missing: string[] = [];
    if (ownerFeaturesEnabled(profiles)) {
        const comunas = profiles.owner?.workingComunas ?? [];
        if (comunas.length === 0) missing.push('zonas de trabajo en Mi negocio');
        return missing;
    }
    if (!profiles.musician?.instrument) missing.push('instrumento');
    if (!profiles.musician?.workZones || profiles.musician.workZones.length === 0) {
        missing.push('zonas de trabajo');
    }
    return missing;
}

function profileCompleteHref(mode: AppMode, profiles: Profiles): string {
    if (mode === 'client') return '/panel/cuenta?account_tab=data';
    if (ownerFeaturesEnabled(profiles)) return panelMiNegocioHref('perfil');
    return '/panel/cuenta?account_tab=data';
}

function profileCompleteLinkLabel(mode: AppMode, profiles: Profiles): string {
    if (ownerFeaturesEnabled(profiles) && mode === 'work') return 'Ir a Mi negocio';
    return 'Ir a Mi cuenta';
}

export function ProfileIncompleteNotice({ mode, profiles }: { mode: AppMode; profiles: Profiles }) {
    if (!isProfileIncomplete(mode, profiles)) return null;

    const href = profileCompleteHref(mode, profiles);
    const linkLabel = profileCompleteLinkLabel(mode, profiles);
    const missing = profileMissingLabels(mode, profiles);

    return (
        <PanelNotice tone="warning" className="!px-5 !py-4">
            <div className="flex flex-col gap-2.5 leading-snug">
                <p className="font-semibold">Completa tu perfil para usar SimpleSerenatas.</p>
                {missing.length > 0 ? (
                    <p className="text-sm opacity-90">Falta: {missing.join(', ')}.</p>
                ) : null}
                <Link
                    href={href}
                    className="inline-flex w-fit text-sm font-semibold underline underline-offset-2"
                >
                    {linkLabel}
                </Link>
            </div>
        </PanelNotice>
    );
}
