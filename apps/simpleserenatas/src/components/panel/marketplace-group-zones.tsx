'use client';

import type { ProviderGroup } from '@/lib/serenatas-api';
import { profileZonesSummary, zonesLabel } from '@/lib/marketplace-group-display';

const DEFAULT_MAX_PILLS = 3;

export function MarketplaceGroupZonePills({
    group,
    maxPills = DEFAULT_MAX_PILLS,
}: {
    group: ProviderGroup;
    maxPills?: number;
}) {
    const comunas = group.serviceComunas ?? [];
    if (comunas.length === 0) {
        return <p className="text-xs text-fg-muted">Zonas de atención por publicar</p>;
    }
    const visible = comunas.slice(0, maxPills);
    const extra = comunas.length - visible.length;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {visible.map((comuna) => (
                <span
                    key={comuna}
                    className="inline-flex max-w-full truncate rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-muted"
                >
                    {comuna}
                </span>
            ))}
            {extra > 0 ? (
                <span className="text-[11px] font-medium text-fg-muted">+{extra}</span>
            ) : null}
        </div>
    );
}

/** Resumen compacto para fichas (sin listar todas las comunas). */
export function MarketplaceGroupZonesSummary({
    group,
    maxVisible = 4,
    className = '',
}: {
    group: ProviderGroup;
    maxVisible?: number;
    className?: string;
}) {
    const line = profileZonesSummary(group, maxVisible);
    if (!line) {
        return <p className={`text-sm text-fg-muted ${className}`.trim()}>Zonas de atención por publicar</p>;
    }
    const region = group.region?.trim();
    return (
        <p className={`text-sm leading-snug text-fg ${className}`.trim()}>
            {region ? (
                <>
                    <span className="text-fg-muted">{region}: </span>
                    {line}
                </>
            ) : (
                line
            )}
        </p>
    );
}

/** Una línea corta (p. ej. tarjetas). */
export function MarketplaceGroupZonesLine({ group }: { group: ProviderGroup }) {
    return (
        <p className="text-xs text-fg-muted">{zonesLabel(group, DEFAULT_MAX_PILLS)}</p>
    );
}
