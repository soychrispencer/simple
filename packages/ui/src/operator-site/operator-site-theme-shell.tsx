'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    operatorSiteAccentCssValue,
    operatorSiteAccentContrastCssValue,
    operatorSiteThemeStorageKey,
    operatorSiteVisitorColorMode,
    type OperatorSiteAccentEditorValue,
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

/**
 * Acento por modo cuando el operador no eligió uno.
 * Cada vertical define su par claro/oscuro para que el sitio público comparta la
 * identidad de la app sin perder el tinte personalizado de cada profesional.
 * La vertical puede definir el contraste de su color de marca cuando
 * utiliza el mismo fondo en claro y oscuro.
 */
export type OperatorSiteAccentFallback = {
    light: string;
    dark: string;
    lightInk?: string;
    darkInk?: string;
    contrast?: string;
    lightContrast?: string;
    darkContrast?: string;
};

type OperatorSiteThemeShellProps = {
    slug: string;
    layout: string;
    defaultColorMode: OperatorSiteColorMode;
    accentColor?: string | OperatorSiteAccentEditorValue;
    accentFallback?: OperatorSiteAccentFallback;
    children: ReactNode;
};

function hasOperatorAccent(accentColor: OperatorSiteThemeShellProps['accentColor']): boolean {
    if (accentColor === undefined || accentColor === null) return false;

    if (typeof accentColor === 'string') {
        const value = accentColor.trim();
        return value !== '' && value !== 'auto';
    }

    return accentColor.preset !== 'auto';
}

export function OperatorSiteThemeShell({
    slug,
    layout,
    defaultColorMode,
    accentColor,
    accentFallback,
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

    // La elección del profesional manda; el fallback de la vertical solo aplica si no eligió.
    const fallback = hasOperatorAccent(accentColor) ? undefined : accentFallback?.[resolvedColor];
    const fallbackContrast = resolvedColor === 'dark'
        ? accentFallback?.darkContrast ?? accentFallback?.contrast
        : accentFallback?.lightContrast ?? accentFallback?.contrast;
    const resolvedAccent = fallback ?? operatorSiteAccentCssValue(accentColor);
    const resolvedAccentInk = fallback
        ? resolvedColor === 'dark'
            ? accentFallback?.darkInk ?? resolvedAccent
            : accentFallback?.lightInk ?? resolvedAccent
        : resolvedAccent;
    const resolvedAccentContrast = fallback
        ? fallbackContrast
        : operatorSiteAccentContrastCssValue(resolvedAccent);
    const accentStyle = {
        '--accent': resolvedAccent,
        '--accent-ink': resolvedAccentInk,
        ...(resolvedAccentContrast ? { '--accent-contrast': resolvedAccentContrast } : {}),
    } as React.CSSProperties;

    return (
        <OperatorSiteThemeContext.Provider value={{ color: resolvedColor, onToggle: handleToggle }}>
            <div
                className="os-page"
                data-os-layout={layout}
                data-os-color={resolvedColor}
                style={accentStyle}
                suppressHydrationWarning
            >
                {children}
            </div>
        </OperatorSiteThemeContext.Provider>
    );
}
