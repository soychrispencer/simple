'use client';

import type { ReactNode } from 'react';
import { PanelBlockHeader } from '../panel/panel-primitives';
import { PanelCard } from '../panel/panel-card';
import { joinClasses } from '../shared/join-classes';

export type SimplePublishSectionProps = {
    title?: string;
    description?: string;
    children: ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
};

export function SimplePublishSection({
    title,
    description,
    children,
    className,
    size = 'lg',
}: SimplePublishSectionProps) {
    return (
        <PanelCard size={size} className={joinClasses('space-y-4', className)}>
            {title ? <PanelBlockHeader title={title} description={description} className="mb-0" /> : null}
            {children}
        </PanelCard>
    );
}
