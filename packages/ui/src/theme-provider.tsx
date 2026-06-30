'use client';

import {
    ThemeProvider as NextThemesProvider,
    useTheme as useNextTheme,
    type ThemeProviderProps,
} from 'next-themes';

/** Defaults compartidos por todas las verticales Simple (next-themes + theme-base.css). */
export const SIMPLE_THEME_PROVIDER_DEFAULTS = {
    attribute: 'class',
    defaultTheme: 'dark',
    enableSystem: true,
    disableTransitionOnChange: true,
    storageKey: 'simple-theme',
    /** Clases en <html>: light | dark (alineado con theme-base.css .dark) */
    themes: ['light', 'dark'],
} as const satisfies Partial<ThemeProviderProps>;

export type SimpleThemeProviderProps = ThemeProviderProps;

export function ThemeProvider({ children, ...props }: SimpleThemeProviderProps) {
    return (
        <NextThemesProvider {...props} {...SIMPLE_THEME_PROVIDER_DEFAULTS}>
            {children}
        </NextThemesProvider>
    );
}

export { useNextTheme as useTheme };

/** Alterna light/dark usando el tema resuelto (correcto con enableSystem). */
export function useThemeToggle() {
    const { resolvedTheme, setTheme } = useNextTheme();
    const isDark = resolvedTheme === 'dark';

    return {
        isDark,
        resolvedTheme,
        setTheme,
        toggle: () => setTheme(isDark ? 'light' : 'dark'),
    };
}
