'use client';

import type { ReactNode } from 'react';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';
import { PanelStepNav } from '../panel/panel-navigation';
import type { PanelStepNavItem } from '../panel/panel-navigation';

export type MarketplacePublishStep = {
    key: string;
    label: string;
    helper?: string;
};

export type MarketplacePublishWizardProps = {
    title: string;
    subtitle?: string;
    steps: MarketplacePublishStep[];
    activeStepKey: string;
    stepIndex: number;
    isEditing?: boolean;
    notices?: ReactNode;
    headerActions?: ReactNode;
    children: ReactNode;
    footer: ReactNode;
    onBack: () => void;
    onClose: () => void;
    onStepChange?: (key: string) => void;
};

export function MarketplacePublishWizard({
    title,
    subtitle,
    steps,
    activeStepKey,
    stepIndex,
    isEditing = false,
    notices,
    headerActions,
    children,
    footer,
    onBack,
    onClose,
    onStepChange,
}: MarketplacePublishWizardProps) {
    const currentStep = steps[stepIndex] ?? steps[0];
    const progress = steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;

    const stepNavItems: PanelStepNavItem[] = steps.map((step, index) => ({
        key: step.key,
        label: step.label,
        done: index < stepIndex,
        disabled: index > stepIndex,
    }));

    return (
        <div className="min-h-screen bg-(--bg)">
            <header
                className="sticky top-0 z-50 border-b border-(--border) backdrop-blur-md"
                style={{ background: 'color-mix(in oklab, var(--surface) 92%, transparent)' }}
            >
                <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 lg:max-w-5xl lg:px-8">
                    <button
                        type="button"
                        onClick={stepIndex === 0 ? onClose : onBack}
                        className="-ml-2 rounded-xl p-2 transition-colors hover:bg-(--bg-subtle)"
                        aria-label={stepIndex === 0 ? 'Cerrar' : 'Paso anterior'}
                    >
                        {stepIndex === 0 ? <IconX size={22} /> : <IconArrowLeft size={22} />}
                    </button>
                    <div className="min-w-0 text-center">
                        <p className="truncate text-sm font-semibold text-(--fg)">
                            {isEditing ? 'Editar publicación' : title}
                        </p>
                        <p className="truncate text-xs text-(--fg-muted)">
                            Paso {stepIndex + 1} de {steps.length}
                        </p>
                    </div>
                    <div className="flex w-10 shrink-0 items-center justify-end">
                        {headerActions}
                    </div>
                </div>
                <div className="h-[3px] bg-(--bg-subtle)">
                    <div
                        className="h-full bg-(--accent) transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-6 pb-36 lg:max-w-5xl lg:px-8 lg:py-10 lg:pb-28">
                {notices ? <div className="mb-4 space-y-3">{notices}</div> : null}

                <div className="mb-6 space-y-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--fg-muted)">
                            {currentStep?.label}
                        </p>
                        {currentStep?.helper ? (
                            <p className="mt-1 text-sm text-(--fg-secondary)">{currentStep.helper}</p>
                        ) : subtitle ? (
                            <p className="mt-1 text-sm text-(--fg-secondary)">{subtitle}</p>
                        ) : null}
                    </div>
                    <div
                        className="rounded-2xl border border-(--border) p-3"
                        style={{ background: 'color-mix(in oklab, var(--bg) 78%, transparent)' }}
                    >
                        <PanelStepNav
                            items={stepNavItems}
                            activeKey={activeStepKey}
                            onChange={(key) => onStepChange?.(key)}
                            ariaLabel="Pasos de publicación"
                            labelBreakpoint="always"
                        />
                    </div>
                </div>

                <div className="animate-scale-in">{children}</div>
            </main>

            <footer
                className={joinClasses(
                    'fixed bottom-0 left-0 right-0 z-50 border-t border-(--border) p-4 backdrop-blur-md',
                )}
                style={{ background: 'color-mix(in oklab, var(--surface) 94%, transparent)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
                <div className="mx-auto max-w-3xl lg:max-w-5xl">{footer}</div>
            </footer>
        </div>
    );
}
