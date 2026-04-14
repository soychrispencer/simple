import Link from 'next/link';

export default function NotFound() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
            style={{ background: 'var(--bg)' }}
        >
            <p className="text-6xl font-bold mb-3" style={{ color: 'var(--accent)' }}>404</p>
            <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                Página no encontrada
            </h1>
            <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--fg-muted)' }}>
                La agenda que buscas no existe o fue desactivada por el profesional.
            </p>
            <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)', color: '#fff' }}
            >
                Volver al inicio
            </Link>
        </div>
    );
}
