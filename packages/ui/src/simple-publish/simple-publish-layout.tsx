'use client';

import type { ReactNode } from 'react';
import { IconArrowLeft, IconLoader2, IconX } from '@tabler/icons-react';
import { SimplePublishProgress } from './simple-publish-progress';
import type { SimplePublishHeaderContinue, SimplePublishStep } from './types';

export type SimplePublishLayoutProps = {
    title: string;
    subtitle?: string;
    steps: SimplePublishStep[];
    stepIndex: number;
    isEditing?: boolean;
    notices?: ReactNode;
    headerContinue?: SimplePublishHeaderContinue;
    headerActions?: ReactNode;
    onBack: () => void;
    onClose: () => void;
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
    headerActions,
    onBack,
    onClose,
    onStepChange,
    children,
}: SimplePublishLayoutProps) {
    const pageTitle = isEditing ? 'Editar publicación' : title;

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

                    <div className="flex min-w-[2.5rem] shrink-0 items-center justify-end gap-1">
                        {headerActions}
                        {headerContinue ? (
                            <button
                                type="button"
                                className="hidden rounded-xl px-3 py-2 text-sm font-medium text-(--accent) transition hover:bg-(--accent-subtle)/40 disabled:opacity-40 lg:inline-flex lg:items-center lg:gap-1.5"
                                onClick={headerContinue.onClick}
                                disabled={headerContinue.disabled || headerContinue.loading}
                            >
                                {headerContinue.loading ? (
                                    <IconLoader2 size={15} className="animate-spin" />
                                ) : null}
                                {headerContinue.label}
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

            <main className="mx-auto max-w-3xl px-4 pt-5 pb-12 lg:max-w-5xl lg:px-8 lg:pb-16">
                {notices ? <div className="mb-5 space-y-3">{notices}</div> : null}
                {children}
            </main>
        </div>
    );
}
