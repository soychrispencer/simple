'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';

export type SerenatasPageWidth = 'narrow' | 'default' | 'wide';

const WIDTH_CLASS: Record<SerenatasPageWidth, string> = {
    narrow: 'max-w-lg',
    default: 'max-w-4xl',
    wide: 'max-w-6xl',
};

type SerenatasPageShellProps = {
    children: ReactNode;
    width?: SerenatasPageWidth;
    /** Sin max-width ni centrado: útil con sidebar para que el contenido use todo el ancho útil. */
    fullWidth?: boolean;
    /** Sin padding vertical (vistas con altura fija tipo mapa / lista split). */
    flush?: boolean;
    className?: string;
};

/**
 * Contenedor de página del panel: mismo padding horizontal y vertical en todas las secciones (móvil y desktop).
 */
export function SerenatasPageShell({
    children,
    width = 'default',
    fullWidth = false,
    flush = false,
    className,
}: SerenatasPageShellProps) {
    return (
        <div
            className={clsx(
                'serenatas-page',
                !fullWidth && WIDTH_CLASS[width],
                !fullWidth && 'mx-auto',
                'w-full px-4 sm:px-6',
                !flush && 'py-4 sm:py-6 lg:py-8',
                className
            )}
        >
            {children}
        </div>
    );
}
