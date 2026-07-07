'use client';

import { useState } from 'react';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import {
    OPERATOR_SITE_ACCENT_OPTIONS,
    OPERATOR_SITE_COLOR_MODE_OPTIONS,
    OPERATOR_SITE_LAYOUT_OPTIONS,
    defaultOperatorSiteAccentEditorValue,
    normalizeOperatorSiteAccentHex,
    type OperatorSiteAccentEditorValue,
    type OperatorSiteColorMode,
    type OperatorSiteLayout,
} from '@simple/utils';
import { PanelBlockHeader, PanelNotice } from './panel-primitives.js';
import { PanelCard } from './panel-card.js';
import { PanelButton } from './panel-button.js';
import { OperatorSiteLayoutPreview } from './operator-site-layout-preview.js';

export type OperatorSiteAppearanceValue = {
    layout: OperatorSiteLayout;
    colorMode: OperatorSiteColorMode;
    accent: OperatorSiteAccentEditorValue;
};

type OperatorSiteAppearanceEditorProps = {
    value: OperatorSiteAppearanceValue;
    publicPreviewUrl?: string | null;
    saving?: boolean;
    saveError?: string;
    onChange: (next: OperatorSiteAppearanceValue) => void;
    onSave: () => void | Promise<void>;
    /** Oculta el botón inline; la página usa PanelSectionSaveFooter. */
    hideSaveButton?: boolean;
};

export function OperatorSiteAppearanceEditor({
    value,
    publicPreviewUrl,
    saving = false,
    saveError: externalSaveError = '',
    onChange,
    onSave,
    hideSaveButton = false,
}: OperatorSiteAppearanceEditorProps) {
    const [savedFlash, setSavedFlash] = useState(false);
    const [localSaveError, setLocalSaveError] = useState('');
    const saveError = externalSaveError || localSaveError;

    const handleSave = async () => {
        setLocalSaveError('');
        try {
            await onSave();
            if (!hideSaveButton) {
                setSavedFlash(true);
                window.setTimeout(() => setSavedFlash(false), 2000);
            }
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

    const handleSelectAccent = (preset: OperatorSiteAccentEditorValue['preset']) => {
        setLocalSaveError('');
        if (preset === 'custom') {
            onChange({
                ...value,
                accent: {
                    preset: 'custom',
                    customHex: value.accent.customHex || defaultOperatorSiteAccentEditorValue().customHex,
                },
            });
            return;
        }
        const option = OPERATOR_SITE_ACCENT_OPTIONS.find((item) => item.id === preset);
        onChange({
            ...value,
            accent: {
                preset,
                customHex: option?.value ?? value.accent.customHex,
            },
        });
    };

    const handleCustomHexChange = (raw: string) => {
        setLocalSaveError('');
        onChange({
            ...value,
            accent: { preset: 'custom', customHex: raw },
        });
    };

    const handleCustomHexBlur = () => {
        const normalized = normalizeOperatorSiteAccentHex(value.accent.customHex);
        if (!normalized) {
            onChange({
                ...value,
                accent: defaultOperatorSiteAccentEditorValue(),
            });
            return;
        }
        onChange({
            ...value,
            accent: { preset: 'custom', customHex: normalized },
        });
    };

    const customHexForPicker = normalizeOperatorSiteAccentHex(value.accent.customHex)
        ?? defaultOperatorSiteAccentEditorValue().customHex;

    const isCustomAccent = value.accent.preset === 'custom';

    return (
        <div className="space-y-6">
            <PanelBlockHeader
                title="Estilo de tu página"
                description="Elige un diseño, modo de color y acento. Recuerda guardar con el botón Guardar cambios."
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
                            <OperatorSiteLayoutPreview layout={option.id} />
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-semibold text-sm text-fg">{option.label}</p>
                                    <p className="text-xs text-fg-secondary mt-1 leading-relaxed">{option.description}</p>
                                    <p className="text-[11px] font-medium text-fg mt-2">{option.structure}</p>
                                    <p className="text-[11px] text-fg-muted mt-1">{option.hint}</p>
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
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {OPERATOR_SITE_ACCENT_OPTIONS.map((option) => {
                        const active = !isCustomAccent && value.accent.preset === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelectAccent(option.id)}
                                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${active
                                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                                    : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                                title={option.label}
                            >
                                <span
                                    className="h-8 w-8 rounded-full shrink-0 border border-black/10"
                                    style={{ backgroundColor: option.value }}
                                    aria-hidden
                                />
                                <span className="text-[10px] font-medium text-fg-secondary leading-tight text-center">
                                    {option.label}
                                </span>
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => handleSelectAccent('custom')}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${isCustomAccent
                            ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                            : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                        title="Personalizado"
                    >
                        <span
                            className="h-8 w-8 rounded-full shrink-0 border border-dashed border-[var(--border-strong)]"
                            style={{
                                background: isCustomAccent
                                    ? customHexForPicker
                                    : 'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)',
                            }}
                            aria-hidden
                        />
                        <span className="text-[10px] font-medium text-fg-secondary leading-tight text-center">
                            Personalizado
                        </span>
                    </button>
                </div>

                {isCustomAccent ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-fg">
                            <span className="sr-only">Selector de color</span>
                            <input
                                type="color"
                                value={customHexForPicker}
                                onChange={(event) => handleCustomHexChange(event.target.value.toUpperCase())}
                                className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent p-0.5"
                            />
                            Código hex
                        </label>
                        <input
                            type="text"
                            value={value.accent.customHex}
                            onChange={(event) => handleCustomHexChange(event.target.value)}
                            onBlur={handleCustomHexBlur}
                            placeholder="#0F766E"
                            spellCheck={false}
                            className="min-w-[7.5rem] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-mono text-fg"
                        />
                        <span
                            className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border)]"
                            style={{ backgroundColor: customHexForPicker }}
                            aria-hidden
                        />
                    </div>
                ) : null}
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

            {saveError && !hideSaveButton ? (
                <PanelNotice tone="error">{saveError}</PanelNotice>
            ) : null}

            {hideSaveButton ? null : (
                <div className="flex items-center gap-3">
                    <PanelButton onClick={() => void handleSave()} disabled={saving}>
                        {saving ? <IconLoader2 size={16} className="animate-spin" /> : null}
                        Guardar ahora
                    </PanelButton>
                    {saving ? <span className="text-sm text-fg-muted">Guardando…</span> : null}
                    {!saving && savedFlash ? <span className="text-sm text-[var(--accent)]">Guardado</span> : null}
                </div>
            )}
        </div>
    );
}
