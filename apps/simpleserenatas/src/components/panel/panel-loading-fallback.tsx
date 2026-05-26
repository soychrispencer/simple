'use client';

export function PanelLoadingFallback() {
    return (
        <div className="container-app mx-auto min-w-0 max-w-7xl px-4 py-8 lg:py-12" aria-busy="true" aria-label="Cargando panel">
            <div className="grid gap-4">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
                <div className="h-4 w-full max-w-md animate-pulse rounded bg-[var(--bg-subtle)]" />
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/60" />
                    ))}
                </div>
                <div className="mt-4 h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/40" />
            </div>
        </div>
    );
}
