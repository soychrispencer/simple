export function NotPublishedPage({ displayName }: { displayName: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-(--ink) px-4 text-white">
            <div className="max-w-md space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--ink-soft) text-3xl">
                    🚧
                </div>
                <h1 className="text-2xl font-bold">
                    {displayName ? `${displayName} — Página en preparación` : 'Página aún no disponible'}
                </h1>
                <p className="leading-relaxed text-white/60">
                    Este profesional está configurando su página de reservas.
                    Vuelve pronto para agendar tu cita.
                </p>
                <a
                    href="/"
                    className="inline-block rounded-[var(--radius-button)] bg-(--ink-soft) px-5 py-2.5 text-sm font-medium transition-colors hover:bg-(--mute-light)"
                >
                    Volver al inicio
                </a>
            </div>
        </div>
    );
}
