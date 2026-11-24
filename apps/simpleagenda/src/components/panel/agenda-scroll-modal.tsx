'use client';

import { PanelScrollModal, type PanelScrollModalProps } from '@simple/ui/panel';

export function AgendaScrollModal({
    zIndexClass = 'z-[80]',
    overlayClassName = 'bg-black/40 backdrop-blur-[2px]',
    panelClassName,
    bodyClassName,
    ...props
}: PanelScrollModalProps) {
    return (
        <PanelScrollModal
            zIndexClass={zIndexClass}
            overlayClassName={overlayClassName}
            panelClassName={`pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0 ${panelClassName ?? ''}`.trim()}
            bodyClassName={`pb-4 sm:pb-4 ${bodyClassName ?? ''}`.trim()}
            {...props}
        />
    );
}
