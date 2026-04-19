'use client';

type SkeletonProps = {
    width?: string | number;
    height?: string | number;
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    className?: string;
};

const ROUNDED = {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1rem',
    full: '9999px',
} as const;

export function Skeleton({ width, height = '1rem', rounded = 'lg', className = '' }: SkeletonProps) {
    return (
        <span
            aria-hidden="true"
            className={`block animate-pulse ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width ?? '100%',
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius: ROUNDED[rounded],
                background: 'var(--border)',
            }}
        />
    );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height="0.75rem"
                    width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div
            className={`rounded-2xl border p-4 ${className}`}
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <div className="flex items-center gap-3">
                <Skeleton width={40} height={40} rounded="full" />
                <div className="flex-1 flex flex-col gap-2">
                    <Skeleton width="40%" height="0.75rem" />
                    <Skeleton width="70%" height="0.625rem" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
    return (
        <div
            className={`rounded-2xl border p-4 flex items-center gap-3 ${className}`}
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <Skeleton width={32} height={32} rounded="lg" />
            <div className="flex-1 flex flex-col gap-2">
                <Skeleton width="50%" height="0.75rem" />
                <Skeleton width="35%" height="0.625rem" />
            </div>
            <Skeleton width={80} height="1.75rem" rounded="lg" />
        </div>
    );
}

export function SkeletonStat({ className = '' }: { className?: string }) {
    return (
        <div
            className={`p-4 rounded-2xl border ${className}`}
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <Skeleton width="65%" height="1.5rem" className="mb-2" />
            <Skeleton width="50%" height="0.625rem" />
        </div>
    );
}
