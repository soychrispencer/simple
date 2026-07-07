'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes.js';
import { PanelPageHeader } from './panel-display.js';

export type PanelSectionPageProps = {
    title: string;
    description: string;
    children: ReactNode;
    actions?: ReactNode;
    className?: string;
};

/** Página de sección del panel: encabezado + contenido (sin shell de tabs). */
export function PanelSectionPage({
    title,
    description,
    children,
    actions,
    className,
}: PanelSectionPageProps) {
    return (
        <div className={joinClasses('grid w-full min-w-0 max-w-full gap-5 lg:gap-6', className)}>
            <PanelPageHeader title={title} description={description} actions={actions} />
            {children}
        </div>
    );
}
