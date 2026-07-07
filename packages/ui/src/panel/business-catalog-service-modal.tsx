'use client';

import type { ReactNode } from 'react';
import { PanelScrollModal } from './panel-scroll-modal.js';

export type BusinessCatalogServiceModalProps = {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    actions?: ReactNode;
};

/** Modal único del constructor de servicios (todas las verticales). */
export function BusinessCatalogServiceModal({
    open,
    title,
    description,
    onClose,
    children,
    actions,
}: BusinessCatalogServiceModalProps) {
    return (
        <PanelScrollModal
            open={open}
            title={title}
            description={description}
            onClose={onClose}
            size="2xl"
            height="tall"
            titleId="catalog-service-modal-title"
            bodyClassName="px-4 py-4 sm:px-5"
            footer={actions ? (
                <div className="flex flex-wrap gap-2">{actions}</div>
            ) : undefined}
        >
            <div className="grid gap-4 md:grid-cols-2">{children}</div>
        </PanelScrollModal>
    );
}
