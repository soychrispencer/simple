'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes.js';

const PANEL_PAGE_CLASS = 'container-app panel-page min-w-0';
const PANEL_PAGE_PADDING_CLASS = 'py-4 lg:py-8';
const PANEL_NOTICES_CLASS = `${PANEL_PAGE_CLASS} pt-4 lg:pt-8`;

export type PanelPageFrameProps = {
    children: ReactNode;
    /** El hijo ya trae shell con `container-app` (PanelAccountShell, PanelMiNegocioShell, etc.). */
    shellOwned?: boolean;
    notices?: ReactNode;
    className?: string;
};

/**
 * Contenedor estándar del área de contenido dentro de `PanelShell`.
 * Evita doble `container-app` cuando la página usa un shell compartido.
 */
export function PanelPageFrame({
    children,
    shellOwned = false,
    notices,
    className,
}: PanelPageFrameProps) {
    if (shellOwned) {
        return (
            <>
                {notices ? <div className={PANEL_NOTICES_CLASS}>{notices}</div> : null}
                {children}
            </>
        );
    }

    return (
        <div className={joinClasses(PANEL_PAGE_CLASS, PANEL_PAGE_PADDING_CLASS, className)}>
            {notices}
            {children}
        </div>
    );
}
