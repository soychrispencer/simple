'use client';

import { useState, type ReactNode } from 'react';
import { IconCheck, IconChevronDown, IconLoader2 } from '@tabler/icons-react';
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
    previewBaseUrl?: string | null;
    rubricLabel?: string | null;
    archetype?: 'health' | 'beauty' | 'learning' | 'general';
    previewSampleLabel?: string;
    previewImageUrl?: string;
    previewName?: string;
    previewProfession?: string;
    previewAccentColor?: string;
    simpleMode?: boolean;
    brandImages?: ReactNode;
    saving?: boolean;
    saveError?: string;
    onChange: (next: OperatorSiteAppearanceValue) => void;
    onSave: () => void | Promise<void>;
    /** Oculta el botón inline; la página usa PanelSectionSaveFooter. */
    hideSaveButton?: boolean;
};

type LayoutCopy = {
    recommended: OperatorSiteLayout;
    options: Record<OperatorSiteLayout, {
        label: string;
        description: string;
        structure: string;
        hint: string;
    }>;
};

const FEATURED_PALETTES = [
    { id: 'cyan', label: 'Turquesa', soft: '#D9F1ED', surface: '#F5FAF9' },
    { id: 'sky', label: 'Brisa', soft: '#DDEFFC', surface: '#F5FAFE' },
    { id: 'emerald', label: 'Bosque', soft: '#DDF3E7', surface: '#F5FAF6' },
    { id: 'violet', label: 'Lavanda', soft: '#EDE4FC', surface: '#FAF8FE' },
    { id: 'rose', label: 'Coral', soft: '#FBE2E8', surface: '#FDF7F8' },
    { id: 'amber', label: 'Ámbar', soft: '#FBEBD2', surface: '#FDF9F2' },
] as const;

const LAYOUT_COPY: Record<NonNullable<OperatorSiteAppearanceEditorProps['archetype']>, LayoutCopy> = {
    health: {
        recommended: 'booking',
        options: {
            booking: { label: 'Consulta cercana', description: 'Presenta tu forma de atender y deja la reserva a mano.', structure: 'Presentación + servicios + acceso a horas.', hint: 'Una página cálida y directa para pacientes.' },
            portfolio: { label: 'Perfil editorial', description: 'Da más espacio a tu historia, enfoque e identidad profesional.', structure: 'Portada visual + perfil + servicios destacados.', hint: 'Para quienes quieren explicar su enfoque antes de reservar.' },
            studio: { label: 'Clínica clara', description: 'Ordena la información para que se entienda rápido qué ofreces.', structure: 'Perfil compacto + información en bloques.', hint: 'Útil para centros y equipos de atención.' },
        },
    },
    beauty: {
        recommended: 'portfolio',
        options: {
            booking: { label: 'Reservas al frente', description: 'Muestra tus tratamientos y lleva rápido a elegir una hora.', structure: 'Presentación + tratamientos + reserva visible.', hint: 'Pensada para convertir visitas en reservas.' },
            portfolio: { label: 'Galería de estilo', description: 'La imagen y el sello de tu trabajo toman el protagonismo.', structure: 'Portada visual + servicios en formato editorial.', hint: 'Para marcas que quieren mostrar su personalidad.' },
            studio: { label: 'Estudio boutique', description: 'Una presentación cuidada con los datos esenciales bien ordenados.', structure: 'Perfil + servicios + ubicación en bloques.', hint: 'Para estudios, salones y centros de estética.' },
        },
    },
    learning: {
        recommended: 'studio',
        options: {
            booking: { label: 'Clases y horarios', description: 'Explica lo que enseñas y deja visibles los horarios para reservar.', structure: 'Presentación + clases + acceso a horas.', hint: 'Directa para clases particulares y sesiones.' },
            portfolio: { label: 'Tu método en primer plano', description: 'Cuenta cómo enseñas y destaca tu experiencia.', structure: 'Portada visual + presentación + clases.', hint: 'Para docentes y formadores con una propuesta propia.' },
            studio: { label: 'Centro organizado', description: 'Agrupa cursos, modalidades y datos del negocio con claridad.', structure: 'Encabezado + información en bloques.', hint: 'Para academias y equipos.' },
        },
    },
    general: {
        recommended: 'booking',
        options: {
            booking: { label: 'Reserva directa', description: 'Presenta tus servicios y haz fácil encontrar una hora.', structure: 'Presentación + servicios + acceso a horas.', hint: 'Una base clara para recibir reservas.' },
            portfolio: { label: 'Marca visual', description: 'Usa una portada amplia para mostrar el carácter de tu negocio.', structure: 'Portada visual + servicios destacados.', hint: 'Para negocios que viven de su identidad e imágenes.' },
            studio: { label: 'Perfil ordenado', description: 'Reúne servicios, datos y ubicación en una composición compacta.', structure: 'Perfil + información en bloques.', hint: 'Para equipos, centros y servicios profesionales.' },
        },
    },
};

export function OperatorSiteAppearanceEditor({
    value,
    publicPreviewUrl,
    previewBaseUrl,
    rubricLabel,
    archetype = 'general',
    previewSampleLabel = 'tu rubro',
    previewImageUrl,
    previewName,
    previewProfession,
    previewAccentColor,
    simpleMode = false,
    brandImages,
    saving = false,
    saveError: externalSaveError = '',
    onChange,
    onSave,
    hideSaveButton = false,
}: OperatorSiteAppearanceEditorProps) {
    const [savedFlash, setSavedFlash] = useState(false);
    const [localSaveError, setLocalSaveError] = useState('');
    const [showLayoutOptions, setShowLayoutOptions] = useState(false);
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
    // `teal` fue el valor predeterminado histórico y en SimpleAgenda equivale a seguir la marca.
    const isAutoAccent = value.accent.preset === 'auto' || value.accent.preset === 'teal';
    const layoutCopy = LAYOUT_COPY[archetype];
    const selectedLayoutCopy = layoutCopy.options[value.layout];
    const recommendedLayout = layoutCopy.recommended;
    const selectedPreviewUrl = previewBaseUrl
        ? `${previewBaseUrl}?layout=${value.layout}&embed=1`
        : null;
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

    const colorModeCard = (
        <PanelCard size="lg" className="space-y-4">
            <PanelBlockHeader
                title="Modo de color por defecto"
                description="El visitante puede cambiarlo cuando vea tu página."
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
                                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
                                : 'border-[var(--border)] text-fg-secondary hover:text-fg'}`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </PanelCard>
    );

    const featuredAccentIds = FEATURED_PALETTES.map((palette) => palette.id);
    const selectedAccentLabel = isAutoAccent
        ? 'SimpleAgenda'
        : value.accent.preset === 'custom'
            ? 'Personalizado'
            : FEATURED_PALETTES.find((palette) => palette.id === value.accent.preset)?.label
                ?? OPERATOR_SITE_ACCENT_OPTIONS.find((option) => option.id === value.accent.preset)?.label
                ?? 'Personalizado';

    const accentPaletteContent = (
        <div className="space-y-4">
            <PanelBlockHeader
                title="Paleta de colores"
                description="Elige una identidad para botones, detalles y fondos suaves de tu página."
                className="mb-0"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                    type="button"
                    onClick={() => handleSelectAccent('auto')}
                    aria-pressed={isAutoAccent}
                    className={`flex min-h-[84px] items-center gap-3 rounded-xl border p-3 text-left transition-all ${isAutoAccent
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                        : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                >
                    <span className="flex h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10" aria-hidden>
                        <span className="w-1/3 bg-[#073B3D]" />
                        <span className="w-1/3 bg-[#B7D833]" />
                        <span className="w-1/3 bg-[#F4F8F5]" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-fg">SimpleAgenda</span>
                        <span className="mt-0.5 block text-xs text-fg-muted">Usar colores actuales</span>
                    </span>
                    {isAutoAccent ? <IconCheck size={17} className="shrink-0 text-accent-ink" aria-hidden /> : null}
                </button>
                {FEATURED_PALETTES.map((palette) => {
                    const option = OPERATOR_SITE_ACCENT_OPTIONS.find((item) => item.id === palette.id)!;
                    const active = !isCustomAccent && value.accent.preset === palette.id;
                    return (
                        <button
                            key={palette.id}
                            type="button"
                            onClick={() => handleSelectAccent(palette.id)}
                            aria-pressed={active}
                            className={`flex min-h-[84px] items-center gap-3 rounded-xl border p-3 text-left transition-all ${active
                                ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                                : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                        >
                            <span className="flex h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10" aria-hidden>
                                <span className="w-1/3" style={{ backgroundColor: option.value }} />
                                <span className="w-1/3" style={{ backgroundColor: palette.soft }} />
                                <span className="w-1/3" style={{ backgroundColor: palette.surface }} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-fg">{palette.label}</span>
                                <span className="mt-0.5 block text-xs text-fg-muted">Color + fondos coordinados</span>
                            </span>
                            {active ? <IconCheck size={17} className="shrink-0 text-accent-ink" aria-hidden /> : null}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => handleSelectAccent('custom')}
                    aria-pressed={isCustomAccent}
                    className={`flex min-h-[84px] items-center gap-3 rounded-xl border p-3 text-left transition-all ${isCustomAccent
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                        : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                >
                    <span
                        className="flex h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10"
                        style={{
                            background: isCustomAccent
                                ? customHexForPicker
                                : 'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)',
                        }}
                        aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-fg">Personalizar</span>
                        <span className="mt-0.5 block text-xs text-fg-muted">Elige tu propio color</span>
                    </span>
                    {isCustomAccent ? <IconCheck size={17} className="shrink-0 text-accent-ink" aria-hidden /> : null}
                </button>
            </div>
            <p className="text-xs text-fg-muted">Paleta elegida: <span className="font-semibold text-fg-secondary">{selectedAccentLabel}</span></p>
            <details className="group rounded-xl border border-[var(--border)] px-3 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-fg">
                    <span>Más colores</span>
                    <IconChevronDown size={16} className="shrink-0 text-fg-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {OPERATOR_SITE_ACCENT_OPTIONS.filter((option) => option.id !== 'teal' && !featuredAccentIds.includes(option.id as (typeof FEATURED_PALETTES)[number]['id'])).map((option) => {
                        const active = !isCustomAccent && value.accent.preset === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelectAccent(option.id)}
                                aria-pressed={active}
                                className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${active
                                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/40'
                                    : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                            >
                                <span className="h-6 w-6 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: option.value }} aria-hidden />
                                <span className="min-w-0 truncate text-xs font-medium text-fg-secondary">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            </details>
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
                        placeholder="#0D453C"
                        spellCheck={false}
                        className="min-w-[7.5rem] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-mono text-fg"
                    />
                    <span className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border)]" style={{ backgroundColor: customHexForPicker }} aria-hidden />
                </div>
            ) : null}
        </div>
    );

    const accentCard = (
        <PanelCard size="lg">
            {accentPaletteContent}
        </PanelCard>
    );

    return (
        <div className="space-y-4">
            {simpleMode ? (
                <PanelCard size="lg" className="space-y-4">
                    <PanelBlockHeader
                        title="Diseño"
                        description={rubricLabel
                            ? `Elige cómo presentar tu página para ${rubricLabel}. Puedes cambiarlo cuando quieras.`
                            : 'Elige cómo organizar tu página. El rubro y los datos se toman de Datos del negocio.'}
                        className="mb-0"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-fg">{selectedLayoutCopy.label}</p>
                                {rubricLabel && value.layout === recommendedLayout ? (
                                    <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-accent-ink">Recomendado</span>
                                ) : value.layout !== recommendedLayout ? (
                                    <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-fg-muted">Elegido por ti</span>
                                ) : (
                                    <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-fg-muted">Diseño inicial</span>
                                )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-fg-secondary">{selectedLayoutCopy.description}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowLayoutOptions((open) => !open)}
                            aria-expanded={showLayoutOptions}
                            className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-fg transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                            {showLayoutOptions ? 'Cerrar opciones' : 'Cambiar diseño'}
                        </button>
                    </div>
                    {showLayoutOptions ? (
                        <div className="grid gap-2" aria-label="Diseños de página">
                            {OPERATOR_SITE_LAYOUT_OPTIONS.map((option) => {
                                const active = value.layout === option.id;
                                const copy = layoutCopy.options[option.id];
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => handleSelectLayout(option.id)}
                                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${active
                                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/40'
                                            : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                                    >
                                        <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${active ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]' : 'border-[var(--border-strong)]'}`}>
                                            {active ? <IconCheck size={11} aria-hidden /> : null}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-fg">{copy.label}</span>
                                                {rubricLabel && option.id === recommendedLayout ? <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-accent-ink">Recomendado</span> : null}
                                            </span>
                                            <span className="mt-1 block text-xs leading-relaxed text-fg-secondary">{copy.description}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </PanelCard>
            ) : (
                <>
            <PanelBlockHeader
                title="Estilo de tu página"
                description={rubricLabel
                    ? `Explora distintas formas de presentar ${rubricLabel}. La recomendación es solo un punto de partida; puedes elegir cualquiera de los estilos.`
                    : `Explora estas propuestas de ${previewSampleLabel} como referencia. La recomendación es solo un punto de partida; puedes elegir cualquiera de los estilos.`}
            />

            {rubricLabel ? (
                <p className="-mt-3 text-xs text-fg-muted">Rubro definido en Datos del negocio: <strong className="font-semibold text-fg-secondary">{rubricLabel}</strong></p>
            ) : (
                <PanelNotice tone="info">
                    Para adaptar estas propuestas a tu actividad, define tu rubro en <a href="/panel/mi-negocio" className="font-semibold underline">Datos del negocio</a>. Aquí no se cambia ese dato.
                </PanelNotice>
            )}

            <div className="grid gap-3 lg:grid-cols-3">
                {OPERATOR_SITE_LAYOUT_OPTIONS.map((option) => {
                    const active = value.layout === option.id;
                    const copy = layoutCopy.options[option.id];
                    const recommended = layoutCopy.recommended === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectLayout(option.id)}
                            className={`text-left rounded-2xl border p-3 transition-all ${active
                                ? 'border-[var(--accent)] ring-2 ring-[var(--accent-subtle)]'
                                : 'border-[var(--border)] hover:border-[var(--accent-border)]'}`}
                        >
                            <OperatorSiteLayoutPreview
                                layout={option.id}
                                imageUrl={previewImageUrl}
                                name={previewName}
                                profession={previewProfession}
                                accentColor={previewAccentColor}
                                compact={false}
                            />
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-sm text-fg">{copy.label}</p>
                                        {recommended ? <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-accent-ink">Recomendado</span> : null}
                                    </div>
                                    <p className="text-xs text-fg-secondary mt-1 leading-relaxed">{copy.description}</p>
                                    <>
                                        <p className="text-[11px] font-medium text-fg mt-2">{copy.structure}</p>
                                        <p className="text-[11px] text-fg-muted mt-1">{copy.hint}</p>
                                    </>
                                </div>
                                {active ? <IconCheck size={18} className="text-accent-ink shrink-0" /> : null}
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedPreviewUrl ? (
                <PanelCard size="lg" className="overflow-hidden p-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                        <div>
                            <p className="text-sm font-semibold text-fg">Vista previa de la página</p>
                            <p className="mt-1 text-xs text-fg-muted">
                                {rubricLabel
                                    ? `Ejemplo de ${previewSampleLabel}; tu página usará el rubro y contenido de tu perfil.`
                                    : `Ejemplo visual de ${previewSampleLabel} con datos ficticios. Define tu rubro en Datos del negocio para usarlo como contexto.`}
                            </p>
                        </div>
                        <div className="flex rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] p-1" aria-label="Tamaño de vista previa">
                            {(['desktop', 'mobile'] as const).map((device) => (
                                <button
                                    key={device}
                                    type="button"
                                    onClick={() => setPreviewDevice(device)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${previewDevice === device ? 'bg-[var(--surface)] text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                                    aria-pressed={previewDevice === device}
                                >
                                    {device === 'desktop' ? 'Computador' : 'Celular'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={`bg-[var(--bg-subtle)] p-3 sm:p-5 ${previewDevice === 'mobile' ? 'flex justify-center' : ''}`}>
                        <div className={`overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm transition-[width] ${previewDevice === 'mobile' ? 'w-[390px] max-w-full' : 'w-full'}`}>
                            <iframe
                                key={`${selectedPreviewUrl}-${previewDevice}`}
                                title={`Vista previa de ${previewName ?? 'la landing'} en ${previewDevice === 'mobile' ? 'celular' : 'computador'}`}
                                src={selectedPreviewUrl}
                                className="block h-[760px] w-full border-0 bg-white"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </PanelCard>
            ) : null}
            {simpleMode ? (
                <>
                    <PanelCard size="lg" className="space-y-5">
                        <PanelBlockHeader
                            title="Marca"
                            description="Personaliza los colores, el logo y la portada que verán tus clientes."
                            className="mb-0"
                        />
                        {accentPaletteContent}
                        {brandImages ? <div className="space-y-4 border-t border-[var(--border)] pt-5">{brandImages}</div> : null}
                    </PanelCard>
                    <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                            <span>
                                <span className="block text-sm font-semibold text-fg">Personalización avanzada</span>
                                <span className="mt-0.5 block text-xs text-fg-muted">Modo claro, oscuro o según el dispositivo</span>
                            </span>
                            <IconChevronDown size={18} className="shrink-0 text-fg-muted transition-transform group-open:rotate-180" aria-hidden />
                        </summary>
                        <div className="mt-4">{colorModeCard}</div>
                    </details>
                </>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {colorModeCard}
                    {accentCard}
                </div>
            )}

            {!simpleMode && publicPreviewUrl ? (
                <PanelNotice tone="info">
                    Abre tu página y recarga para ver el estilo:{' '}
                    <a href={publicPreviewUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        {publicPreviewUrl}
                    </a>
                </PanelNotice>
            ) : !simpleMode ? (
                <PanelNotice tone="warning">
                    Configura y publica tu link en Perfil público para previsualizar la landing.
                </PanelNotice>
            ) : null}
                </>
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
                    {!saving && savedFlash ? <span className="text-sm text-accent-ink">Guardado</span> : null}
                </div>
            )}
        </div>
    );
}
