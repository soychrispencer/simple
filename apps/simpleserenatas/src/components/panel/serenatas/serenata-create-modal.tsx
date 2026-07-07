'use client';

import type { ReactNode } from 'react';
import { PanelSheet } from '../panel-sheet';

export function SerenataCreateModal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
    return (
        <PanelSheet
            onClose={onClose}
            ariaLabel="Nueva serenata"
            size="5xl"
            height="tall"
            constrainHeight
        >
            {children}
        </PanelSheet>
    );
}
