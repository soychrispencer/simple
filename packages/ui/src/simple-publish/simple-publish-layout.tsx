'use client';

import { useEffect, type ReactNode } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconDeviceFloppy, IconLoader2, IconRefresh, IconX } from '@tabler/icons-react';
import { SimplePublishProgress } from './simple-publish-progress';
import type { SimplePublishHeaderContinue, SimplePublishHeaderReset, SimplePublishHeaderSave, SimplePublishStep } from './types';

export type SimplePublishLayoutProps = {
    title: string;
    subtitle?: string;
    steps: SimplePublishStep[];
    stepIndex: number;
    isEditing?: boolean;
    notices?: ReactNode;
    headerContinue?: SimplePublishHeaderContinue;
    headerSave?: SimplePublishHeaderSave;
    headerReset?: SimplePublishHeaderReset;
    headerActions?: ReactNode;
    onBack: () => void;
    onClose: () => void;
    /** Muestra cerrar (X) además del botón atrás cuando stepIndex > 0. */
    showCloseOnLaterSteps?: boolean;
    onStepChange?: (key: string) => void;
    children: ReactNode;
};

export function SimplePublishLayout({
    title,
    subtitle,
    steps,
    stepIndex,
    isEditing = false,
    notices,
    headerContinue,
    headerSave,
    headerReset,
    headerActions,
    onBack,
    onClose,
    onStepChange,
    showCloseOnLaterSteps = true,
    children,
}: SimplePublishLayoutProps) {
    const pageTitle = isEditing ? 'Editar publicación' : title;

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        const nested = document.querySelector('.panel-content-frame, [data-scroll-container]');
        if (nested instanceof HTMLElement) {
            nested.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [stepIndex]);

    return (
        <div className="min-h-screen bg-(--bg)">
            <header
                className="sticky top-0 z-50 border-b border-(--border)/80 backdrop-blur-md"
                style={{ background: 'color-mix(in oklab, var(--surface) 96%, transparent)' }}
            >
                <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 lg:max-w-5xl lg:px-8">
                    <button
                        type="button"
                        onClick={stepIndex === 0 ? onClose : onBack}
                        className="-ml-2 rounded-xl p-2 text-(--fg) transition-colors hover:bg-(--bg-subtle)"
                        aria-label={stepIndex === 0 ? 'Cerrar' : 'Paso anterior'}
                    >
                        {stepIndex === 0 ? <IconX size={22} /> : <IconArrowLeft size={22} />}
                    </button>

                    <div className="min-w-0 flex-1 text-center">
                        <p className="truncate text-sm font-semibold text-(--fg)">{pageTitle}</p>
                        {subtitle ? (
                            <p className="truncate text-xs text-(--fg-muted)">{subtitle}</p>
                        ) : null}
                    </div>

                    <div className="flex min-w-[5.5rem] shrink-0 items-center justify-end gap-0.5 sm:gap-1">
                        {showCloseOnLaterSteps && stepIndex > 0 ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl p-2 text-(--fg) transition-colors hover:bg-(--bg-subtle)"
                                aria-label="Salir del asistente"
                            >
                                <IconX size={22} />
                            </button>
                        ) : null}
                        {headerReset ? (
                            <button
                                type="button"
                                onClick={headerReset.onClick}
                                disabled={headerReset.disabled || headerReset.loading}
                                className="rounded-xl p-2 text-(--fg) transition-colors hover:bg-(--bg-subtle) disabled:opacity-40"
                                aria-label={headerReset.ariaLabel ?? 'Reiniciar borrador'}
                            >
                                {headerReset.loading ? (
                                    <IconLoader2 size={22} className="animate-spin" />
                                ) : (
                                    <IconRefresh size={22} />
                                )}
                            </button>
                        ) : null}
                        {headerSave ? (
                            <button
                                type="button"
                                onClick={headerSave.onClick}
                                disabled={headerSave.disabled || headerSave.loading}
                                className="rounded-xl p-2 text-(--fg) transition-colors hover:bg-(--bg-subtle) disabled:opacity-40"
                                aria-label={headerSave.ariaLabel ?? 'Guardar borrador'}
                            >
                                {headerSave.loading ? (
                                    <IconLoader2 size={22} className="animate-spin" />
                                ) : (
                                    <IconDeviceFloppy size={22} />
                                )}
                            </button>
                        ) : null}
                        {headerActions}
                        {headerContinue ? (
                            <button
                                type="button"
                                className="-mr-2 rounded-xl p-2 text-(--fg) transition-colors hover:bg-(--bg-subtle) disabled:opacity-40"
                                onClick={headerContinue.onClick}
                                disabled={headerContinue.disabled || headerContinue.loading}
                                aria-label={headerContinue.label}
                            >
                                {headerContinue.loading ? (
                                    <IconLoader2 size={22} className="animate-spin" />
                                ) : headerContinue.icon === 'check' ? (
                                    <IconCheck size={22} />
                                ) : (
                                    <IconArrowRight size={22} />
                                )}
                            </button>
                        ) : null}
                    </div>
                </div>
            </header>

            <SimplePublishProgress
                steps={steps}
                stepIndex={stepIndex}
                onStepChange={onStepChange}
            />

            <main className="mx-auto max-w-3xl px-4 pt-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:max-w-5xl lg:px-8 lg:pb-16">
                {notices ? <div className="mb-5 space-y-3">{notices}</div> : null}
                {children}
            </main>
        </div>
    );
}
