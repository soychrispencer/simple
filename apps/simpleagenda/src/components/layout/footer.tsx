import Link from 'next/link';
import { IconCalendar } from '@tabler/icons-react';

export function Footer() {
    return (
        <footer className="border-t mt-auto" style={{ borderColor: 'var(--border)' }}>
            <div className="container-app py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: '#fff' }}>
                        <IconCalendar size={12} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>SimpleAgenda</span>
                </Link>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    © {new Date().getFullYear()} Simple Plataforma. Todos los derechos reservados.
                </p>
                <div className="flex items-center gap-4">
                    <Link href="/privacidad" className="text-xs hover:underline" style={{ color: 'var(--fg-muted)' }}>Privacidad</Link>
                    <Link href="/terminos" className="text-xs hover:underline" style={{ color: 'var(--fg-muted)' }}>Términos</Link>
                </div>
            </div>
        </footer>
    );
}
