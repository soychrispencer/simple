'use client';

import { IconMoon, IconSun } from '@tabler/icons-react';

export function OperatorSiteThemeToggle({
    color,
    onToggle,
}: {
    color: 'light' | 'dark';
    onToggle: () => void;
}) {
    const isDark = color === 'dark';
    return (
        <button
            type="button"
            className="os-theme-toggle"
            onClick={onToggle}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
            {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>
    );
}
