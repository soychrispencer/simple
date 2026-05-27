'use client';

import { useMemo } from 'react';
import { useAuth } from '@simple/auth';
import { PanelButton } from '@simple/ui/panel';
import { PanelNotice } from '@simple/ui/panel';
import type { ProviderGroup } from '@/lib/serenatas-api';
import { useSerenataProfiles } from '@/hooks/use-serenata-profiles';
import { resolveMarketplaceRequestBlock } from '@/lib/marketplace-client-policy';

type MarketplaceContractButtonProps = {
    group: ProviderGroup;
    onContract: () => void;
    className?: string;
    variant?: 'accent' | 'primary' | 'secondary';
    label?: string;
    showInlineNotice?: boolean;
};

export function MarketplaceContractButton({
    group,
    onContract,
    className,
    variant = 'accent',
    label = 'Contratar',
    showInlineNotice = false,
}: MarketplaceContractButtonProps) {
    const { isLoggedIn, authLoading, user } = useAuth();
    const { profiles, profilesReady } = useSerenataProfiles();

    const block = useMemo(
        () => resolveMarketplaceRequestBlock(profiles, {
            isLoggedIn,
            profilesReady,
            userId: user?.id,
            group,
        }),
        [group, isLoggedIn, profiles, profilesReady, user?.id],
    );

    const waiting = authLoading || (isLoggedIn && !profilesReady);

    if (waiting) {
        return (
            <PanelButton type="button" variant={variant} className={className} disabled>
                {label}
            </PanelButton>
        );
    }

    if (!block.allowed) {
        return (
            <div className="grid gap-2">
                {showInlineNotice ? (
                    <PanelNotice tone="warning">{block.reason}</PanelNotice>
                ) : null}
                <PanelButton type="button" variant="secondary" className={className} disabled aria-label={block.reason}>
                    {label}
                </PanelButton>
            </div>
        );
    }

    return (
        <PanelButton type="button" variant={variant} className={className} onClick={onContract}>
            {label}
        </PanelButton>
    );
}
