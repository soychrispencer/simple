'use client';

import type { ReactNode } from 'react';

export type PublicFlowShellProps = {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    meta?: ReactNode;
    children: ReactNode;
    /** Tailwind max-width token without prefix, e.g. `2xl`, `4xl` */
    maxWidth?: '2xl' | '3xl' | '4xl' | '5xl';
};

const MAX_WIDTH_CLASS: Record<NonNullable<PublicFlowShellProps['maxWidth']>, string> = {
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
};

export function PublicFlowShell(props: PublicFlowShellProps) {
    const { eyebrow, title, subtitle, meta, children, maxWidth = '4xl' } = props;

    return (
        <div className="marketplace-flow-page">
            <div className="marketplace-flow-header">
                <div className="container-app marketplace-flow-header-inner">
                    <div>
                        {eyebrow ? <p className="marketplace-flow-eyebrow">{eyebrow}</p> : null}
                        <h1 className="marketplace-flow-title">{title}</h1>
                        {subtitle ? <p className="marketplace-flow-subtitle">{subtitle}</p> : null}
                    </div>
                    {meta ? <div className="marketplace-flow-meta">{meta}</div> : null}
                </div>
            </div>
            <div className={`container-app panel-page marketplace-flow-body mx-auto ${MAX_WIDTH_CLASS[maxWidth]}`}>
                {children}
            </div>
        </div>
    );
}

export type PublicMarketingShellProps = {
    eyebrow?: string;
    title: string;
    intro?: string;
    children: ReactNode;
};

/** Páginas de servicios / marketing con fondo panel y tarjetas */
export function PublicMarketingShell(props: PublicMarketingShellProps) {
    const { eyebrow, title, intro, children } = props;

    return (
        <div className="marketplace-marketing-page">
            <div className="container-app panel-page section-marketing py-8 lg:py-10">
                <div className="mb-8 max-w-3xl">
                    {eyebrow ? <p className="marketplace-flow-eyebrow mb-2">{eyebrow}</p> : null}
                    <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">{title}</h1>
                    {intro ? <p className="mt-3 text-base text-[var(--fg-secondary)]">{intro}</p> : null}
                </div>
                {children}
            </div>
        </div>
    );
}
