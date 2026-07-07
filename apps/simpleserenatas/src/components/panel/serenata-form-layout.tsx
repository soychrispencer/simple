'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { IconChevronDown, IconLoader2, IconMusic, IconX } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { serenatasApi, type RepertoireSong } from '@/lib/serenatas-api';
import { RepertoireSongPicker } from './repertoire-song-picker';

export function SerenataFormCloseButton({ onClose }: { onClose: () => void }) {
    return (
        <button
            type="button"
            className="shrink-0 rounded-xl border border-border bg-bg-subtle p-2 text-fg-muted transition-colors hover:border-accent-border hover:text-fg"
            onClick={onClose}
            aria-label="Cerrar"
        >
            <IconX size={18} />
        </button>
    );
}

export function SerenataFormStepIndicator<T extends number>({
    step,
    steps,
}: {
    step: T;
    steps: ReadonlyArray<{ id: T; label: string }>;
}) {
    return (
        <ol className="flex min-w-0 gap-2" aria-label="Pasos del formulario">
            {steps.map((item, index) => {
                const active = step === item.id;
                const done = step > item.id;
                return (
                    <li
                        key={String(item.id)}
                        className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                            active
                                ? 'border-accent-border bg-accent-soft text-accent'
                                : done
                                  ? 'border-border bg-bg-subtle text-fg'
                                  : 'border-border text-fg-muted'
                        }`}
                    >
                        <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                active ? 'bg-accent text-(--button-primary-color)' : 'bg-bg-subtle text-fg-muted'
                            }`}
                        >
                            {item.id}
                        </span>
                        <span className="truncate">{item.label}</span>
                        {index < steps.length - 1 ? (
                            <span className="ml-auto hidden text-fg-muted sm:inline" aria-hidden>
                                →
                            </span>
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

export function SerenataFormModalShell({
    title,
    subtitle,
    stepIndicator,
    summary,
    onClose,
    children,
    footer,
}: {
    title: string;
    subtitle?: string;
    stepIndicator?: ReactNode;
    summary?: ReactNode;
    onClose: () => void;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 space-y-3 border-b border-border px-5 pb-4 pt-4 sm:pt-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div>
                            <p className="text-lg font-semibold text-fg">{title}</p>
                            {subtitle ? <p className="mt-1 text-sm text-fg-muted">{subtitle}</p> : null}
                        </div>
                        {stepIndicator}
                    </div>
                    <SerenataFormCloseButton onClose={onClose} />
                </div>
                {summary}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:py-6">
                {children}
            </div>

            <div className="shrink-0 space-y-4 border-t border-border bg-surface px-5 py-4 sm:py-5">
                {footer}
            </div>
        </div>
    );
}

const FORM_FIELDS_CLASS = 'grid min-w-0 gap-4';

function FormSectionHeader({
    stepNumber,
    title,
    subtitle,
}: {
    stepNumber: 1 | 2;
    title: string;
    subtitle?: string;
}) {
    return (
        <header className="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent"
                aria-hidden
            >
                {stepNumber}
            </span>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{title}</p>
                {subtitle ? <p className="mt-0.5 text-xs leading-snug text-fg-muted">{subtitle}</p> : null}
            </div>
        </header>
    );
}

/** Móvil: pasos en una columna. Desktop (lg+): dos bloques numerados en un solo panel. */
export function SerenataFormResponsiveLayout<T extends number>({
    step,
    steps,
    leftTitle,
    rightTitle,
    leftSubtitle,
    rightSubtitle,
    desktopIntro,
    leftColumn,
    rightColumn,
}: {
    step: T;
    steps: ReadonlyArray<{ id: T; label: string }>;
    leftTitle: string;
    rightTitle: string;
    leftSubtitle?: string;
    rightSubtitle?: string;
    desktopIntro?: string;
    leftColumn: ReactNode;
    rightColumn: ReactNode;
}) {
    const firstStepId = steps[0]?.id;
    const onFirstStep = step === firstStepId;
    const intro =
        desktopIntro ?? 'Un solo formulario: completa el bloque 1 y el bloque 2 antes de enviar.';

    return (
        <>
            <div className="lg:hidden">
                <SerenataFormStepIndicator step={step} steps={steps} />
                <div className="mt-4">
                    <section className="rounded-xl border border-border bg-bg-subtle/30 p-5">
                        <FormSectionHeader
                            stepNumber={onFirstStep ? 1 : 2}
                            title={onFirstStep ? leftTitle : rightTitle}
                            subtitle={onFirstStep ? leftSubtitle : rightSubtitle}
                        />
                        <div className={FORM_FIELDS_CLASS}>
                            {onFirstStep ? leftColumn : rightColumn}
                        </div>
                    </section>
                </div>
            </div>

            <div className="hidden min-w-0 lg:block">
                <p className="text-sm text-fg-muted">{intro}</p>
                <div
                    className="mt-4 grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-border bg-surface"
                    role="group"
                    aria-label="Formulario en dos bloques"
                >
                    <section className="min-w-0 border-r border-border bg-bg-subtle/25 p-5 sm:p-6">
                        <FormSectionHeader stepNumber={1} title={leftTitle} subtitle={leftSubtitle} />
                        <div className={FORM_FIELDS_CLASS}>{leftColumn}</div>
                    </section>
                    <section className="min-w-0 p-5 sm:p-6">
                        <FormSectionHeader stepNumber={2} title={rightTitle} subtitle={rightSubtitle} />
                        <div className={FORM_FIELDS_CLASS}>{rightColumn}</div>
                    </section>
                </div>
            </div>
        </>
    );
}

export function SerenataFormDualStepFooter({
    step,
    loading = false,
    onBackStep,
    onCancel,
    onContinue,
    onSubmit,
    continueDisabled = false,
    submitDisabled = false,
    submitLabel,
    submitIcon,
    cancelLabel = 'Cancelar',
}: {
    step: 1 | 2;
    loading?: boolean;
    onBackStep?: () => void;
    onCancel?: () => void;
    onContinue: () => void;
    onSubmit: () => void;
    continueDisabled?: boolean;
    submitDisabled?: boolean;
    submitLabel: ReactNode;
    submitIcon?: ReactNode;
    cancelLabel?: string;
}) {
    const submitButton = (
        <PanelButton
            className="w-full lg:w-auto"
            disabled={loading || submitDisabled}
            onClick={onSubmit}
        >
            {loading ? <IconLoader2 size={14} className="animate-spin" /> : submitIcon}
            {submitLabel}
        </PanelButton>
    );

    return (
        <>
            <div className="flex flex-col gap-3 lg:hidden">
                {step === 2 && onBackStep ? (
                    <PanelButton variant="secondary" disabled={loading} onClick={onBackStep}>
                        Atrás
                    </PanelButton>
                ) : onCancel ? (
                    <PanelButton variant="secondary" disabled={loading} onClick={onCancel}>
                        {cancelLabel}
                    </PanelButton>
                ) : null}
                {step === 1 ? (
                    <PanelButton
                        className="w-full"
                        disabled={loading || continueDisabled}
                        onClick={onContinue}
                    >
                        Continuar
                    </PanelButton>
                ) : (
                    submitButton
                )}
            </div>
            <div className="hidden flex-col gap-3 lg:flex lg:flex-row lg:justify-end">
                {onCancel ? (
                    <PanelButton variant="secondary" disabled={loading} onClick={onCancel}>
                        {cancelLabel}
                    </PanelButton>
                ) : null}
                {submitButton}
            </div>
        </>
    );
}

const OWN_LEAD_REPERTOIRE_FALLBACK_MAX = 12;

export function CollapsibleRepertoireSection({
    providerGroupId,
    serviceId,
    songsIncluded,
    variant,
    selectedIds,
    onChange,
    defaultExpanded = false,
    disabled = false,
    repertorioManageHref,
}: {
    providerGroupId: string;
    serviceId: string;
    songsIncluded: number;
    variant: 'client' | 'owner';
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    defaultExpanded?: boolean;
    disabled?: boolean;
    repertorioManageHref?: string;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded || selectedIds.length > 0);
    const [songs, setSongs] = useState<RepertoireSong[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const maxSelections = songsIncluded > 0 ? songsIncluded : OWN_LEAD_REPERTOIRE_FALLBACK_MAX;
    const hasCatalog = loaded && songs.length > 0;

    useEffect(() => {
        if (selectedIds.length > 0) setExpanded(true);
    }, [selectedIds.length]);

    useEffect(() => {
        if (defaultExpanded) setExpanded(true);
    }, [defaultExpanded, serviceId]);

    useEffect(() => {
        if (!expanded || loaded || !providerGroupId || !serviceId) return;
        let cancelled = false;
        setLoading(true);
        void serenatasApi.marketplaceServiceRepertoire(providerGroupId, serviceId).then((response) => {
            if (cancelled) return;
            setSongs(response.ok ? response.items : []);
            setLoaded(true);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [expanded, loaded, providerGroupId, serviceId]);

    useEffect(() => {
        setLoaded(false);
        setSongs([]);
        if (!defaultExpanded) {
            setExpanded(selectedIds.length > 0);
        }
    }, [providerGroupId, serviceId]);

    const summaryLabel =
        selectedIds.length > 0
            ? `${selectedIds.length} canción${selectedIds.length === 1 ? '' : 'es'} seleccionada${selectedIds.length === 1 ? '' : 's'}`
            : songsIncluded > 0
              ? variant === 'client'
                  ? `Hasta ${songsIncluded} canción${songsIncluded === 1 ? '' : 'es'} (opcional)`
                  : `Hasta ${songsIncluded} pedida${songsIncluded === 1 ? '' : 's'} (opcional)`
              : 'Sin canciones registradas';

    return (
        <div className="rounded-xl border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                    <IconMusic size={16} className="shrink-0 text-fg-muted" aria-hidden />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">Repertorio</p>
                        <p className="text-xs text-fg-muted">{summaryLabel}</p>
                    </div>
                </div>
                <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => setExpanded((value) => !value)}
                >
                    <IconChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    {expanded
                        ? 'Ocultar'
                        : selectedIds.length > 0
                          ? 'Editar'
                          : 'Agregar'}
                </button>
            </div>

            {expanded ? (
                <div className="border-t border-border px-3 pb-3 pt-2">
                    {loading ? (
                        <p className="flex items-center gap-2 py-4 text-sm text-fg-muted">
                            <IconLoader2 size={16} className="animate-spin" />
                            Cargando repertorio…
                        </p>
                    ) : !hasCatalog ? (
                        <p className="py-3 text-sm text-fg-muted">
                            {repertorioManageHref ? (
                                <>
                                    Aún no hay canciones en el catálogo.{' '}
                                    <Link href={repertorioManageHref} className="font-medium text-accent underline">
                                        Gestionar repertorio
                                    </Link>
                                </>
                            ) : (
                                'Este servicio aún no tiene canciones disponibles en el catálogo.'
                            )}
                        </p>
                    ) : (
                        <RepertoireSongPicker
                            songs={songs}
                            maxSelections={maxSelections}
                            selectedIds={selectedIds}
                            onChange={onChange}
                            disabled={disabled}
                        />
                    )}
                </div>
            ) : null}
        </div>
    );
}
