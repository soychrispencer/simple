'use client';

import { useState, type CSSProperties } from 'react';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import {
    OPERATOR_SITE_ACCENT_OPTIONS,
    OPERATOR_SITE_COLOR_MODE_OPTIONS,
    OPERATOR_SITE_LAYOUT_OPTIONS,
    type OperatorSiteAccentColor,
    type OperatorSiteColorMode,
    type OperatorSiteLayout,
} from '@simple/utils';
import { PanelBlockHeader, PanelNotice } from './panel-primitives.js';
import { PanelCard } from './panel-card.js';
import { PanelButton } from './panel-button.js';

export type OperatorSiteAppearanceValue = {
    layout: OperatorSiteLayout;
    colorMode: OperatorSiteColorMode;
    accentColor: OperatorSiteAccentColor;
};

const LAYOUT_PREVIEW_STYLES: Record<OperatorSiteLayout, CSSProperties> = {
    booking: {
        background: `
            linear-gradient(to right, transparent 52%, rgba(13, 148, 136, 0.55) 52%),
            linear-gradient(to top, rgba(13, 148, 136, 0.35), transparent 50%),
            linear-gradient(145deg, #1e293b, #0f172a)`,
    },
    portfolio: {
        background: `
            radial-gradient(circle at 50% 38%, rgba(13, 148, 136, 0.45), transparent 42%),
            repeating-linear-gradient(90deg, transparent, transparent 30%, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.14) 34%),
            linear-gradient(180deg, #18181b, #09090b)`,
    },
    studio: {
        background: `
            linear-gradient(90deg, #e4e4e7 0%, #e4e4e7 50%, #d4d4d8 50%, #d4d4d8 100%),
            linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)`,
        backgroundSize: '100% 58%, 100% 100%',
        backgroundRepeat: 'no-repeat',
    },
};

type OperatorSiteAppearanceEditorProps = {
    value: OperatorSiteAppearanceValue;
    publicPreviewUrl?: string | null;
    saving?: boolean;
    saveError?: string;
    onChange: (next: OperatorSiteAppearanceValue) => void;
    onSave: () => void | Promise<void>;
};

export function OperatorSiteAppearanceEditor({
    value,
    publicPreviewUrl,
    saving = false,
    saveError: externalSaveError = '',
    onChange,
    onSave,
}: OperatorSiteAppearanceEditorProps) {
    const [savedFlash, setSavedFlash] = useState(false);
    const [localSaveError, setLocalSaveError] = useState('');
    const saveError = externalSaveError || localSaveError;

    const handleSave = async () => {
        setLocalSaveError('');
        try {
            await onSave();
            setSavedFlash(true);
            window.setTimeout(() => setSavedFlash(false), 2000);
        } catch (err) {
            setLocalSaveError(err instanceof Error ? err.message : 'No se pudo guardar.');
        }
    };

    const handleSelectLayout = (layout: OperatorSiteLayout) => {
        setLocalSaveError('');
        onChange({ ...value, layout });
    };

    const handleSelectColor = (colorMode: OperatorSiteColorMode) => {
        setLocalSaveError('');
        onChange({ ...value, colorMode });
    };

    const handleSelectAccent = (accentColor: OperatorSiteAccentColor) => {
        setLocalSaveError('');
        onChange({ ...value, accentColor });
    };

    return (
        <div className="space-y-6">
            <PanelBlockHeader
                title="Estilo de tu página"
                description="Elige un diseño. Se guarda al seleccionar; recarga tu página pública para verlo."
            />

            <div className="grid gap-4 lg:grid-cols-3">
                {OPERATOR_SITE_LAYOUT_OPTIONS.map((option) => {
                    const active = value.layout === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectLayout(option.id)}
                            className={`text-left rounded-2xl border p-4 transition-all ${active
                                ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                                : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                        >
                            <div
                                className="mb-3 h-24 rounded-xl border border-[var(--border)]"
                                style={LAYOUT_PREVIEW_STYLES[option.id]}
                                aria-hidden
                            />
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-semibold text-sm text-fg">{option.label}</p>
                                    <p className="text-xs text-fg-secondary mt-1 leading-relaxed">{option.description}</p>
                                    <p className="text-[11px] text-fg-muted mt-2">{option.hint}</p>
                                </div>
                                {active ? <IconCheck size={18} className="text-[var(--accent)] shrink-0" /> : null}
                            </div>
                        </button>
                    );
                })}
            </div>

            <PanelCard size="lg" className="space-y-4">
                <PanelBlockHeader
                    title="Modo de color por defecto"
                    description="Los visitantes pueden cambiar claro/oscuro en tu página; esto define el valor inicial."
                    className="mb-0"
                />
                <div className="flex flex-wrap gap-2">
                    {OPERATOR_SITE_COLOR_MODE_OPTIONS.map((option) => {
                        const active = value.colorMode === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelectColor(option.id)}
                                className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${active
                                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                    : 'border-[var(--border)] text-fg-secondary hover:text-fg'}`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </PanelCard>

            <PanelCard size="lg" className="space-y-4">
                <PanelBlockHeader
                    title="Color de acento"
                    description="Color principal de botones, links y elementos destacados de tu página."
                    className="mb-0"
                />
                <div className="flex flex-wrap gap-3">
                    {OPERATOR_SITE_ACCENT_OPTIONS.map((option) => {
                        const active = value.accentColor === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelectAccent(option.id)}
                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-all ${active
                                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                                    : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                                title={option.label}
                            >
                                <span
                                    className="w-4 h-4 rounded-full shrink-0"
                                    style={{ backgroundColor: option.value }}
                                    aria-hidden
                                />
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </PanelCard>

            {publicPreviewUrl ? (
                <PanelNotice tone="info">
                    Abre tu página y recarga para ver el estilo:{' '}
                    <a href={publicPreviewUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        {publicPreviewUrl}
                    </a>
                </PanelNotice>
            ) : (
                <PanelNotice tone="warning">
                    Configura y publica tu link en Perfil público para previsualizar la landing.
                </PanelNotice>
            )}

            {saveError ? (
                <PanelNotice tone="error">{saveError}</PanelNotice>
            ) : null}

            <div className="flex items-center gap-3">
                <PanelButton onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <IconLoader2 size={16} className="animate-spin" /> : null}
                    Guardar ahora
                </PanelButton>
                {saving ? <span className="text-sm text-fg-muted">Guardando…</span> : null}
                {!saving && savedFlash ? <span className="text-sm text-[var(--accent)]">Guardado</span> : null}
            </div>
        </div>
    );
}
