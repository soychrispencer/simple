'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes';

export type PanelCardProps = {
    children: React.ReactNode;
    className?: string;
    tone?: 'surface' | 'default' | 'subtle';
    size?: 'sm' | 'md' | 'lg';
};


export function PanelCard(props: PanelCardProps) {
    const {
        children,
        className,
        tone = 'surface',
        size = 'md',
    } = props;

    const paddingClass = size === 'sm'
        ? 'p-4'
        : size === 'lg'
            ? 'p-5 md:p-6'
            : 'p-4 md:p-5';

    const background = tone === 'default'
        ? 'var(--bg)'
        : tone === 'subtle'
            ? 'color-mix(in oklab, var(--bg) 78%, transparent)'
            : 'var(--surface)';

    return (
        <div
            className={joinClasses('panel-card', paddingClass, className)}
            style={{ background }}
        >
            {children}
        </div>
    );
}

