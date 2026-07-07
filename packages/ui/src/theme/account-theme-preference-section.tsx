'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import { useTheme } from '../theme-provider';
import { PanelBlockHeader } from '../panel/panel-primitives';
import { PanelCard } from '../panel/panel-card';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_OPTIONS: Array<{
    value: ThemePreference;
    label: string;
    description: string;
    Icon: ComponentType<{ size?: number; stroke?: number }>;
}> = [
    {
        value: 'system',
        label: 'Sistema',
        description: 'Igual que tu dispositivo',
        Icon: IconDeviceDesktop,
    },
    {
        value: 'light',
        label: 'Claro',
        description: 'Fondo claro siempre',
        Icon: IconSun,
    },
    {
        value: 'dark',
        label: 'Oscuro',
        description: 'Fondo oscuro siempre',
        Icon: IconMoon,
    },
];

export type AccountThemePreferenceSectionProps = {
    title?: string;
    description?: string;
};

export function AccountThemePreferenceSection({
    title = 'Tema de la interfaz',
    description = 'Elige cómo se ve Simple en este dispositivo. Puedes cambiarlo cuando quieras.',
}: AccountThemePreferenceSectionProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const activeTheme: ThemePreference =
        mounted && (theme === 'light' || theme === 'dark' || theme === 'system')
            ? theme
            : 'system';

    return (
        <PanelCard size="lg" className="space-y-4">
            <PanelBlockHeader title={title} description={description} className="mb-0" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={title}>
                {THEME_OPTIONS.map(({ value, label, description: optionDescription, Icon }) => {
                    const active = activeTheme === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={!mounted}
                            onClick={() => setTheme(value)}
                            className={`panel-publish-choice flex flex-col items-start gap-2 p-4 text-left ${active ? 'panel-publish-choice--active' : ''}`}
                        >
                            <span
                                className={`panel-publish-choice__icon !m-0 !h-9 !w-9 ${active ? 'panel-publish-choice__icon--active' : ''}`}
                            >
                                <Icon size={18} />
                            </span>
                            <span className="panel-publish-choice__label">{label}</span>
                            <span className="text-xs text-(--fg-muted)">{optionDescription}</span>
                        </button>
                    );
                })}
            </div>
            {mounted && activeTheme === 'system' ? (
                <p className="text-xs text-(--fg-muted)">
                    Ahora se muestra en modo {resolvedTheme === 'dark' ? 'oscuro' : 'claro'} según tu dispositivo.
                </p>
            ) : null}
        </PanelCard>
    );
}
