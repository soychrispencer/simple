'use client';

import type { ReactNode } from 'react';
import { PanelCard } from '../panel/panel-card';
import { joinClasses } from '../shared/join-classes';

export type SimplePublishSurfaceProps = {
    children: ReactNode;
    className?: string;
};

export function SimplePublishSurface({ children, className }: SimplePublishSurfaceProps) {
    return (
        <PanelCard size="lg" className={joinClasses('space-y-4', className)}>
            {children}
        </PanelCard>
    );
}
