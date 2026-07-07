'use client';

import { PanelScrollModal, type PanelScrollModalProps } from '@simple/ui/panel';

export function AgendaScrollModal(props: PanelScrollModalProps) {
    return (
        <PanelScrollModal
            zIndexClass="z-50"
            overlayClassName="bg-black/40 backdrop-blur-[2px]"
            {...props}
        />
    );
}
