'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useThemeToggle } from './theme-provider';

export type ThemeToggleButtonProps = {
    className?: string;
    /** Por defecto: chip del header marketplace */
    variant?: 'header-chip' | 'plain';
    SunIcon: ComponentType<{ size?: number; stroke?: number }>;
    MoonIcon: ComponentType<{ size?: number; stroke?: number }>;
    iconSize?: number;
};

export function ThemeToggleButton({
    className,
    variant = 'header-chip',
    SunIcon,
    MoonIcon,
    iconSize = 16,
}: ThemeToggleButtonProps) {
    const { isDark, toggle } = useThemeToggle();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const baseClass =
        variant === 'header-chip'
            ? 'header-icon-chip'
            : 'inline-flex items-center justify-center';

    if (!mounted) {
        return (
            <button
                type="button"
                className={className ? `${baseClass} ${className}` : baseClass}
                aria-label="Cambiar tema"
                suppressHydrationWarning
            >
                <SunIcon size={iconSize} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={toggle}
            className={className ? `${baseClass} ${className}` : baseClass}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            {isDark ? <SunIcon size={iconSize} /> : <MoonIcon size={iconSize} />}
        </button>
    );
}
