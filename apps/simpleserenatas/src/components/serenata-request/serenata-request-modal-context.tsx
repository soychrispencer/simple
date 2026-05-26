'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import {
    type MarketplaceRequestDraftRef,
    writeMarketplaceRequestDraftRef,
} from '@/lib/marketplace-request-draft';

export type SerenataRequestOpenInput =
    | MarketplaceRequestDraftRef
    | { group: ProviderGroup; service: ProviderGroupService; date?: string };

type SerenataRequestModalContextValue = {
    isOpen: boolean;
    draftRef: MarketplaceRequestDraftRef | null;
    resolved: { group: ProviderGroup; service: ProviderGroupService } | null;
    loading: boolean;
    error: string | null;
    openRequest: (input: SerenataRequestOpenInput) => void;
    closeRequest: () => void;
    setResolved: (value: { group: ProviderGroup; service: ProviderGroupService } | null) => void;
    setLoading: (value: boolean) => void;
    setError: (value: string | null) => void;
};

const SerenataRequestModalContext = createContext<SerenataRequestModalContextValue | null>(null);

function toDraftRef(input: SerenataRequestOpenInput): MarketplaceRequestDraftRef {
    if ('groupSlug' in input) return input;
    return {
        groupSlug: input.group.slug,
        serviceId: input.service.id,
        ...(input.date ? { date: input.date } : {}),
    };
}

export function SerenataRequestModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [draftRef, setDraftRef] = useState<MarketplaceRequestDraftRef | null>(null);
    const [resolved, setResolved] = useState<{
        group: ProviderGroup;
        service: ProviderGroupService;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const closeRequest = useCallback(() => {
        setIsOpen(false);
        setDraftRef(null);
        setResolved(null);
        setLoading(false);
        setError(null);
    }, []);

    const openRequest = useCallback((input: SerenataRequestOpenInput) => {
        const ref = toDraftRef(input);
        writeMarketplaceRequestDraftRef(ref);
        setDraftRef(ref);
        setError(null);
        setLoading('groupSlug' in input);
        if ('group' in input) {
            setResolved({ group: input.group, service: input.service });
            setLoading(false);
        } else {
            setResolved(null);
            setLoading(true);
        }
        setIsOpen(true);
    }, []);

    const value = useMemo(
        () => ({
            isOpen,
            draftRef,
            resolved,
            loading,
            error,
            openRequest,
            closeRequest,
            setResolved,
            setLoading,
            setError,
        }),
        [closeRequest, draftRef, error, isOpen, loading, openRequest, resolved],
    );

    return (
        <SerenataRequestModalContext.Provider value={value}>
            {children}
        </SerenataRequestModalContext.Provider>
    );
}

export function useSerenataRequestModal() {
    const ctx = useContext(SerenataRequestModalContext);
    if (!ctx) {
        throw new Error('useSerenataRequestModal debe usarse dentro de SerenataRequestModalProvider');
    }
    return ctx;
}
