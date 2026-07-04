export function NotPublishedPage({ displayName }: { displayName: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
            <div className="max-w-md text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-zinc-800 flex items-center justify-center text-3xl">
                    🚧
                </div>
                <h1 className="text-2xl font-bold">
                    {displayName ? `${displayName} — Página en preparación` : 'Página aún no disponible'}
                </h1>
                <p className="text-zinc-400 leading-relaxed">
                    Este profesional está configurando su página de reservas.
                    Vuelve pronto para agendar tu cita.
                </p>
                <a
                    href="/"
                    className="inline-block px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                    Volver al inicio
                </a>
            </div>
        </div>
    );
}
