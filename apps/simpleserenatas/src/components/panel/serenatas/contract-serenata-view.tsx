'use client';

import { PanelButton, PanelCard, PanelNotice } from '@simple/ui/panel';

/** @deprecated Flujo por paquetes legacy; usar marketplace (`grupos` → solicitar). */
export function ContractSerenataView({
    onExploreGroups,
}: {
    contactPhone?: string;
    refresh?: () => Promise<void>;
    onExploreGroups?: () => void;
}) {
    return (
        <PanelCard>
            <PanelNotice tone="neutral">
                El contrato por paquetes ya no está disponible. Explora grupos de mariachis y envía tu solicitud
                directamente al grupo que elijas.
            </PanelNotice>
            {onExploreGroups ? (
                <PanelButton className="mt-4" onClick={onExploreGroups}>
                    Contratar serenata
                </PanelButton>
            ) : null}
        </PanelCard>
    );
}
