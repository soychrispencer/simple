'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { PanelConfirmDialog } from './panel-confirm-dialog';

export type PanelConfirmOptions = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
};

type PendingConfirm = PanelConfirmOptions & {
    resolve: (confirmed: boolean) => void;
};

type PanelConfirmContextValue = {
    confirm: (options: PanelConfirmOptions) => Promise<boolean>;
};

const PanelConfirmContext = createContext<PanelConfirmContextValue | null>(null);

export function PanelConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback((options: PanelConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setPending({ ...options, resolve });
        });
    }, []);

    const value = useMemo(() => ({ confirm }), [confirm]);

    const close = useCallback(() => {
        setPending((current) => {
            current?.resolve(false);
            return null;
        });
    }, []);

    const accept = useCallback(() => {
        setPending((current) => {
            current?.resolve(true);
            return null;
        });
    }, []);

    return (
        <PanelConfirmContext.Provider value={value}>
            {children}
            {pending ? (
                <PanelConfirmDialog
                    open
                    title={pending.title}
                    message={pending.message}
                    confirmLabel={pending.confirmLabel}
                    cancelLabel={pending.cancelLabel}
                    tone={pending.tone}
                    onClose={close}
                    onConfirm={accept}
                />
            ) : null}
        </PanelConfirmContext.Provider>
    );
}

export function usePanelConfirm(): PanelConfirmContextValue {
    const context = useContext(PanelConfirmContext);
    if (!context) {
        throw new Error('usePanelConfirm debe usarse dentro de PanelConfirmProvider');
    }
    return context;
}
