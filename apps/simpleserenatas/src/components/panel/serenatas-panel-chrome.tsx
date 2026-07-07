'use client';

import { useCallback, type ReactNode } from 'react';
import { PanelPageFrame } from '@simple/ui/panel';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { SerenataPanelShell } from '@/components/panel/panel-shell';
import { useSerenata, type Section } from '@/context/serenata-context';

export type SerenatasPanelChromeProps = {
    children: ReactNode;
    section: Section;
    /** Navegación SPA; por defecto usa `changeSection` del contexto. */
    onSectionChange?: (section: Section) => void;
    shellOwned?: boolean;
    notices?: ReactNode;
};

/** Chrome unificado del panel Serenatas: header + shell + frame de contenido. */
export function SerenatasPanelChrome({
    children,
    section,
    onSectionChange,
    shellOwned = false,
    notices,
}: SerenatasPanelChromeProps) {
    const { mode, profiles, changeSection } = useSerenata();

    const handleSectionChange = useCallback(
        (next: Section) => {
            if (onSectionChange) {
                onSectionChange(next);
                return;
            }
            changeSection(next);
        },
        [changeSection, onSectionChange],
    );

    return (
        <div className="flex min-h-screen min-w-0 flex-col bg-(--bg) text-(--fg)">
            <div className="shrink-0">
                <SerenatasChromeHeader mode={mode} profiles={profiles} />
            </div>

            <SerenataPanelShell section={section} onSectionChange={handleSectionChange}>
                <PanelPageFrame shellOwned={shellOwned} notices={notices}>
                    {children}
                </PanelPageFrame>
            </SerenataPanelShell>
        </div>
    );
}
