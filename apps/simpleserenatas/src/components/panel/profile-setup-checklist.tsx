'use client';

import Link from 'next/link';
import { IconCheck, IconChevronRight } from '@tabler/icons-react';
import type { Profiles, ProviderGroup } from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { ownerFeaturesEnabled } from '@/lib/app-mode';
import { providerPublicMediaMissing } from '@/lib/marketplace-group-display';
import { canPublishProviderGroup } from '@/lib/provider-group-publish';
import { panelMiNegocioHref, profilePanelHref } from '@/lib/panel-routes';

export type ProfileSetupItem = {
    id: string;
    label: string;
    done: boolean;
    href: string;
};

function clientItems(profiles: Profiles): ProfileSetupItem[] {
    const client = profiles.client;
    return [
        {
            id: 'phone',
            label: 'Teléfono de contacto',
            done: Boolean(client?.phone?.trim()),
            href: profilePanelHref('data'),
        },
    ];
}

function ownerItems(_profiles: Profiles, mariachi: ProviderGroup | null, serviceCount: number): ProfileSetupItem[] {
    const missingMedia = mariachi ? providerPublicMediaMissing(mariachi) : ['logo', 'portada'];
    const hasLocation = Boolean(
        mariachi?.name?.trim()
        && mariachi.region?.trim()
        && mariachi.comunaBase?.trim()
        && (mariachi.serviceComunas?.length ?? 0) > 0,
    );
    const readyToPublish = Boolean(mariachi && canPublishProviderGroup(mariachi, serviceCount));
    return [
        {
            id: 'group',
            label: 'Datos comerciales del mariachi',
            done: hasLocation,
            href: panelMiNegocioHref('datos'),
        },
        {
            id: 'media',
            label: 'Logo y portada',
            done: Boolean(mariachi && missingMedia.length === 0),
            href: panelMiNegocioHref('datos'),
        },
        {
            id: 'services',
            label: 'Al menos un servicio con precio',
            done: serviceCount > 0,
            href: panelMiNegocioHref('servicios'),
        },
        {
            id: 'publish',
            label: 'Publicado en marketplace',
            done: mariachi?.status === 'active' && readyToPublish,
            href: panelMiNegocioHref('publicar'),
        },
    ];
}

function musicianItems(profiles: Profiles): ProfileSetupItem[] {
    const musician = profiles.musician;
    const hasInstrumentName = Boolean(
        musician?.instrument?.trim()
        || musician?.instruments?.some((item) => item.trim()),
    );
    return [
        {
            id: 'instrument',
            label: 'Instrumento principal',
            done: Boolean(musician?.hasInstrument && hasInstrumentName),
            href: profilePanelHref('musician'),
        },
    ];
}

export function buildProfileSetupItems(
    mode: AppMode,
    profiles: Profiles,
    mariachi?: ProviderGroup | null,
    serviceCount = 0,
): ProfileSetupItem[] {
    if (mode === 'client') return clientItems(profiles);
    if (ownerFeaturesEnabled(profiles)) return ownerItems(profiles, mariachi ?? null, serviceCount);
    return musicianItems(profiles);
}

export function isProfileSetupPending(
    mode: AppMode,
    profiles: Profiles,
    mariachi?: ProviderGroup | null,
    serviceCount = 0,
): boolean {
    return buildProfileSetupItems(mode, profiles, mariachi, serviceCount).some((item) => !item.done);
}

export function ProfileSetupChecklist({
    mode,
    profiles,
    mariachi,
    serviceCount = 0,
}: {
    mode: AppMode;
    profiles: Profiles;
    mariachi?: ProviderGroup | null;
    serviceCount?: number;
}) {
    const items = buildProfileSetupItems(mode, profiles, mariachi, serviceCount);
    const pending = items.filter((item) => !item.done);
    if (pending.length === 0) return null;

    const doneCount = items.length - pending.length;
    const pct = Math.round((doneCount / items.length) * 100);
    const isOwner = ownerFeaturesEnabled(profiles) && mode !== 'client';
    const title = mode === 'client'
        ? 'Completa tu cuenta'
        : isOwner
          ? 'Configura tu mariachi'
          : 'Completa tu perfil';
    const description = mode === 'client'
        ? 'Un paso más para contratar serenatas con tranquilidad.'
        : isOwner
          ? 'Sigue estos pasos para recibir solicitudes en el marketplace.'
          : 'Así los dueños pueden invitarte a sus grupos.';

    const next = pending[0];

    return (
        <div
            className="serenatas-setup-banner rounded-2xl p-5"
            role="region"
            aria-label={title}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide serenatas-setup-kicker">
                        Configuración inicial
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-fg">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{description}</p>
                </div>
                <span className="shrink-0 rounded-full border border-accent-border/50 bg-surface/80 px-2.5 py-1 text-xs font-medium text-fg-muted">
                    {doneCount}/{items.length}
                </span>
            </div>

            <div
                className="mt-4 h-1 overflow-hidden rounded-full serenatas-setup-progress-track"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso de configuración: ${pct}%`}
            >
                <div
                    className="h-full transition-all duration-500 serenatas-setup-progress-fill"
                    style={{ width: `${pct}%` }}
                />
            </div>

            <Link
                href={next.href}
                className="serenatas-setup-next mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors"
            >
                <span className="text-sm font-semibold text-fg">{next.label}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-accent">
                    Ir
                    <IconChevronRight size={16} stroke={2} aria-hidden />
                </span>
            </Link>

            {pending.length > 1 ? (
                <details className="mt-3 group">
                    <summary className="cursor-pointer list-none text-xs font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
                        Ver {pending.length - 1} paso{pending.length - 1 === 1 ? '' : 's'} más
                    </summary>
                    <ul className="mt-2 space-y-1 border-t border-accent-border/25 pt-2">
                        {pending.slice(1).map((item) => (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-fg-secondary transition-colors hover:bg-surface/60 hover:text-fg"
                                >
                                    <span className="size-1.5 shrink-0 rounded-full bg-accent/70" />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}

            {doneCount > 0 ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
                    <IconCheck size={14} className="text-accent" />
                    {doneCount} paso{doneCount === 1 ? '' : 's'} listo{doneCount === 1 ? '' : 's'}
                </p>
            ) : null}
        </div>
    );
}
