'use client';

import { PanelScrollModal, type PanelScrollModalProps } from './panel-scroll-modal.js';

export type PanelScrollSheetProps = Omit<PanelScrollModalProps, 'open' | 'footer'> & {
    footer?: PanelScrollModalProps['footer'];
};

/** Sheet/modal con cabecera fija y cuerpo con scroll. Alias de {@link PanelScrollModal}. */
export function PanelScrollSheet(props: PanelScrollSheetProps) {
    return <PanelScrollModal {...props} />;
}

export { PanelScrollModal, PanelScrollShell, type PanelScrollModalProps, type PanelScrollModalSize, type PanelScrollModalHeight, type PanelScrollShellProps } from './panel-scroll-modal.js';
