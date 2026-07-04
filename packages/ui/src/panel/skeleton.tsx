'use client';

import { joinClasses } from '../shared/join-classes';

export type SkeletonProps = {
    className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
    return <div className={joinClasses('animate-pulse rounded bg-[var(--bg-muted)]', className)} />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
    return (
        <div className="rounded-card border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <Skeleton className="h-4 w-1/3 mb-3" />
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className={joinClasses('h-3 mb-2', i === rows - 1 ? 'w-1/2' : 'w-2/3')} />
            ))}
        </div>
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="rounded-card border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
                >
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                        <Skeleton className="h-3 w-1/3 mb-1.5" />
                        <Skeleton className="h-2.5 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
