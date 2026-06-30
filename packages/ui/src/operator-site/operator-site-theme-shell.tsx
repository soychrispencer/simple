'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
    operatorSiteThemeStorageKey,
    operatorSiteVisitorColorMode,
    type OperatorSiteColorMode,
} from '@simple/utils';
import { OperatorSiteThemeToggle } from './operator-site-theme-toggle.js';

type OperatorSiteThemeShellProps = {
    slug: string;
    layout: string;
    defaultColorMode: OperatorSiteColorMode;
    children: ReactNode;
};

export function OperatorSiteThemeShell({
    slug,
    layout,
    defaultColorMode,
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

    return (
        <div
            className="os-page"
            data-os-layout={layout}
            data-os-color={resolvedColor}
            suppressHydrationWarning
        >
            <OperatorSiteThemeToggle
                color={resolvedColor}
                onToggle={handleToggle}
            />
            {children}
        </div>
    );
}
