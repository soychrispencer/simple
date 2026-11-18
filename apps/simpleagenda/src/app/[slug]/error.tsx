'use client';

export default function PublicAgendaError({ reset }: { reset: () => void }) {
    return (
        <main className="flex min-h-dvh items-center justify-center px-5 py-12">
            <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center sm:p-9">
                <h1 className="text-2xl font-bold tracking-tight text-fg">La agenda no está disponible ahora</h1>
                <p className="mt-3 text-sm text-fg-secondary">Vuelve a intentarlo para ver los horarios.</p>
                <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">
                    Volver a intentar
                </button>
            </div>
        </main>
    );
}
