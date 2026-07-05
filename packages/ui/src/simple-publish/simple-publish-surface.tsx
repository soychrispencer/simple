'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes';

export type SimplePublishSurfaceProps = {
    children: ReactNode;
    className?: string;
};

export function SimplePublishSurface({ children, className }: SimplePublishSurfaceProps) {
    return (
        <div
            className={joinClasses(
                'rounded-3xl border border-(--border)/70 bg-(--surface) p-5 shadow-sm sm:p-6',
                className,
            )}
        >
            {children}
        </div>
    );
}
