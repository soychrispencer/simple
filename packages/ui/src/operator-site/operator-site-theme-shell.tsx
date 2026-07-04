'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    operatorSiteAccentValue,
    operatorSiteThemeStorageKey,
    operatorSiteVisitorColorMode,
    type OperatorSiteAccentColor,
    type OperatorSiteColorMode,
} from '@simple/utils';

type OperatorSiteThemeContextValue = {
    color: 'light' | 'dark';
    onToggle: () => void;
};

const OperatorSiteThemeContext = createContext<OperatorSiteThemeContextValue | null>(null);

export function useOperatorSiteTheme() {
    return useContext(OperatorSiteThemeContext);
}

type OperatorSiteThemeShellProps = {
    slug: string;
    layout: string;
    defaultColorMode: OperatorSiteColorMode;
    accentColor?: OperatorSiteAccentColor;
    children: ReactNode;
};

export function OperatorSiteThemeShell({
    slug,
    layout,
    defaultColorMode,
    accentColor = 'teal',
    children,
}: OperatorSiteThemeShellProps) {
    const [visitorColor, setVisitorColor] = useState<'light' | 'dark' | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const stored = window.localStorage.getItem(operatorSiteThemeStorageKey(slug));
            if (stored === 'light' || stored === 'dark') setVisitorColor(stored);
        } catch {
            // storage bloqueado
        }
    }, [slug]);

    const resolvedColor = mounted
        ? operatorSiteVisitorColorMode(defaultColorMode, visitorColor)
        : (defaultColorMode === 'dark' ? 'dark' : 'light');

    const handleToggle = () => {
        const next = resolvedColor === 'dark' ? 'light' : 'dark';
        setVisitorColor(next);
        try {
            window.localStorage.setItem(operatorSiteThemeStorageKey(slug), next);
        } catch {
            // ignorar
        }
    };

    const accentValue = operatorSiteAccentValue(accentColor);

    return (
        <OperatorSiteThemeContext.Provider value={{ color: resolvedColor, onToggle: handleToggle }}>
            <div
                className="os-page"
                data-os-layout={layout}
                data-os-color={resolvedColor}
                style={{ '--accent': accentValue } as React.CSSProperties}
                suppressHydrationWarning
            >
                {children}
            </div>
        </OperatorSiteThemeContext.Provider>
    );
}
