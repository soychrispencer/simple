'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';

type SerenatasPageHeaderProps = {
    title: string;
    description?: string;
    /** Contenido a la derecha en sm+ (avatar, acción, etc.) */
    trailing?: ReactNode;
    /** Título centrado en móvil (vistas tipo onboarding / cliente). */
    align?: 'start' | 'center';
    className?: string;
};

/**
 * Encabezado de vista: tipografía alineada a `theme-base` (type-page-title / type-page-subtitle).
 */
export function SerenatasPageHeader({
    title,
    description,
    trailing,
    align = 'start',
    className,
}: SerenatasPageHeaderProps) {
    const isCenter = align === 'center';

    return (
        <header
            className={clsx(
                'mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-start sm:justify-between',
                isCenter && !trailing && 'items-center text-center sm:items-start sm:text-left',
                className
            )}
        >
            <div className={clsx('min-w-0', isCenter && !trailing && 'max-w-prose sm:max-w-none')}>
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>
                    {title}
                </h1>
                {description ? (
                    <p className={clsx('type-page-subtitle mt-2', !isCenter && 'max-w-prose')}>{description}</p>
                ) : null}
            </div>
            {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </header>
    );
}
