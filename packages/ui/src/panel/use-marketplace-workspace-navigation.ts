'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchAccountWorkspace, fetchCurrentAccountContext } from '@simple/utils';

const WORKSPACE_READY_EVENT = 'simple:marketplace-workspace-ready';

export function announceMarketplaceWorkspaceReady(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(WORKSPACE_READY_EVENT));
    }
}

export function useMarketplaceWorkspaceNavigation(
    vertical: 'autos' | 'propiedades',
    dismissedStorageKeyPrefix: string,
    userId?: string,
): boolean {
    const [state, setState] = useState<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
    const readinessWasUpdated = useRef(false);

    useEffect(() => {
        if (!userId) {
            readinessWasUpdated.current = false;
            setState({ userId: null, ready: false });
            return;
        }
        let cancelled = false;
        readinessWasUpdated.current = false;
        setState({ userId, ready: false });
        const handleReady = () => {
            readinessWasUpdated.current = true;
            setState({ userId, ready: true });
        };
        window.addEventListener(WORKSPACE_READY_EVENT, handleReady);

        void Promise.all([
            fetchAccountWorkspace(vertical),
            fetchCurrentAccountContext(),
        ]).then(([workspace, context]) => {
            if (cancelled || readinessWasUpdated.current) return;
            const accountId = context?.account?.id ?? workspace?.workspace?.accountId ?? '';
            const dismissed = (() => {
                try {
                    return Boolean(
                    accountId
                    && window.sessionStorage.getItem(`${dismissedStorageKeyPrefix}:${accountId}`) === '1',
                    );
                } catch {
                    return false;
                }
            })();
            setState({ userId, ready: Boolean(
                workspace?.memberRole === 'agent'
                || workspace?.canManage === false
                || workspace?.workspace?.onboardingCompletedAt
                || dismissed,
            ) });
        }).catch(() => {
            // Deja el panel completo disponible si no se pudo consultar el onboarding.
            if (!cancelled && !readinessWasUpdated.current) setState({ userId, ready: true });
        });

        return () => {
            cancelled = true;
            window.removeEventListener(WORKSPACE_READY_EVENT, handleReady);
        };
    }, [dismissedStorageKeyPrefix, vertical, userId]);

    return state.userId === (userId ?? null) && Boolean(userId) ? state.ready : false;
}
