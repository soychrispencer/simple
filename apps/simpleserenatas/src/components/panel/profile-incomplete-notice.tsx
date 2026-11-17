'use client';

import Link from 'next/link';
import { PanelNotice } from '@simple/ui/panel';
import type { Profiles } from '@/lib/serenatas-api';
import type { AppMode, SerenataRole } from '@/lib/app-mode';
import { resolveActiveSerenataRole } from '@/lib/app-mode';
import { panelMiNegocioHref } from '@/lib/panel-routes';

function isOwnerRole(mode: AppMode, profiles: Profiles, activeRole?: SerenataRole): boolean {
    return mode === 'work'
        && (activeRole ?? resolveActiveSerenataRole(profiles)) === 'owner'
        && Boolean(profiles.owner);
}

export function isProfileIncomplete(mode: AppMode, profiles: Profiles, activeRole?: SerenataRole): boolean {
    if (mode === 'client') {
        const client = profiles.client;
        if (!client) return true;
        return !client.phone?.trim();
    }

    if (isOwnerRole(mode, profiles, activeRole)) {
        const ownerComunas = profiles.owner?.workingComunas ?? [];
        return ownerComunas.length === 0;
    }

    const musician = profiles.musician;
    if (!musician) return true;
    if (!musician.hasInstrument) return true;
    const hasInstrumentName = Boolean(
        musician.instrument?.trim()
        || musician.instruments?.some((item) => item.trim()),
    );
    return !hasInstrumentName;
}

function profileMissingLabels(mode: AppMode, profiles: Profiles, activeRole?: SerenataRole): string[] {
    if (mode === 'client') {
        const client = profiles.client;
        const missing: string[] = [];
        if (!client?.phone?.trim()) missing.push('teléfono');
        return missing;
    }

    const missing: string[] = [];
    if (isOwnerRole(mode, profiles, activeRole)) {
        const comunas = profiles.owner?.workingComunas ?? [];
        if (comunas.length === 0) missing.push('zonas de trabajo en Mi negocio');
        return missing;
    }
    const musician = profiles.musician;
    if (!musician?.hasInstrument) missing.push('confirmar instrumento propio');
    else if (
        !musician.instrument?.trim()
        && !(musician.instruments?.some((item) => item.trim()))
    ) {
        missing.push('instrumento principal');
    }
    return missing;
}

function profileCompleteHref(mode: AppMode, profiles: Profiles, activeRole?: SerenataRole): string {
    if (mode === 'client') return '/panel/mi-cuenta?account_tab=data';
    if (isOwnerRole(mode, profiles, activeRole)) return panelMiNegocioHref('datos');
    return '/panel/mi-cuenta?account_tab=musician';
}

function profileCompleteLinkLabel(mode: AppMode, profiles: Profiles, activeRole?: SerenataRole): string {
    if (isOwnerRole(mode, profiles, activeRole)) return 'Ir a Mi negocio';
    return 'Ir a Mi cuenta';
}

export function ProfileIncompleteNotice({ mode, profiles, activeRole }: { mode: AppMode; profiles: Profiles; activeRole?: SerenataRole }) {
    if (!isProfileIncomplete(mode, profiles, activeRole)) return null;

    const href = profileCompleteHref(mode, profiles, activeRole);
    const linkLabel = profileCompleteLinkLabel(mode, profiles, activeRole);
    const missing = profileMissingLabels(mode, profiles, activeRole);

    return (
        <PanelNotice tone="warning" className="!px-5 !py-4">
            <div className="flex flex-col gap-2.5 leading-snug">
                <p className="font-semibold">Completa tu perfil para usar SimpleSerenatas.</p>
                {missing.length > 0 ? (
                    <p className="text-sm opacity-90">Falta: {missing.join(', ')}.</p>
                ) : null}
                <Link
                    href={href}
                    prefetch={false}
                    className="inline-flex w-fit text-sm font-semibold underline underline-offset-2"
                >
                    {linkLabel}
                </Link>
            </div>
        </PanelNotice>
    );
}
