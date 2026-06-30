'use client';

import { PanelCard } from './panel-card.js';
import { PanelAccountAddressesContent } from './account-addresses-content.js';
import { PanelAccountResidenceSection, type PanelAccountResidenceSectionProps } from './account-residence-section.js';
import {
    ACCOUNT_ADDRESSES_BLOCK,
    ACCOUNT_RESIDENCE_BLOCK,
    accountAddressesBlockDescription,
} from './account-copy.js';

export type PanelAccountLocationContentProps = PanelAccountResidenceSectionProps & {
    /** Variante Serenatas: copy de direcciones en modo cliente. */
    addressesAppMode?: 'client' | 'work';
};

export function PanelAccountLocationContent({
    addressesAppMode,
    ...residenceProps
}: PanelAccountLocationContentProps) {
    const addressesDescription = accountAddressesBlockDescription(addressesAppMode);

    return (
        <PanelCard size="md">
            <div className="flex flex-col gap-8">
                <section>
                    <h3 className="text-sm font-semibold text-[var(--fg)]">{ACCOUNT_RESIDENCE_BLOCK.title}</h3>
                    <div className="mt-4">
                        <PanelAccountResidenceSection {...residenceProps} />
                    </div>
                </section>

                <section className="border-t border-[var(--border)] pt-8">
                    <h3 className="text-sm font-semibold text-[var(--fg)]">{ACCOUNT_ADDRESSES_BLOCK.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">{addressesDescription}</p>
                    <div className="mt-4">
                        <PanelAccountAddressesContent />
                    </div>
                </section>
            </div>
        </PanelCard>
    );
}
