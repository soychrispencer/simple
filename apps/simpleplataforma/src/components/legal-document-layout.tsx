import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@simple/ui/brand';

const LAST_UPDATED = '21 de mayo de 2026';
const CONTACT_EMAIL = 'hola@simpleplataforma.app';

export function legalLastUpdated() {
    return LAST_UPDATED;
}

export function legalContactEmail() {
    return CONTACT_EMAIL;
}

export function LegalDocumentLayout({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen plt-subtle">
            <header className="border-b plt-border bg-[var(--surface)]">
                <div className="container-app flex h-16 items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <BrandLogo appId="simpleplataforma" />
                    </Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link href="/privacidad" className="plt-muted hover:text-[var(--fg)]">
                            Privacidad
                        </Link>
                        <Link href="/terminos" className="plt-muted hover:text-[var(--fg)]">
                            Términos
                        </Link>
                        <Link href="/" className="font-medium plt-fg">
                            Inicio
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="container-app py-10 md:py-14">
                <article className="mx-auto max-w-3xl rounded-card border plt-border bg-[var(--surface)] px-6 py-8 md:px-10 md:py-10 shadow-sm">
                    <h1 className="text-2xl font-bold tracking-tight plt-fg md:text-3xl">{title}</h1>
                    <p className="mt-2 text-sm plt-muted">Última actualización: {LAST_UPDATED}</p>
                    <div className="mt-8 space-y-6 text-sm leading-relaxed plt-secondary [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:plt-fg [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:plt-fg [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
                        {children}
                    </div>
                </article>
            </main>

            <footer className="border-t plt-border py-8">
                <div className="container-app flex flex-col items-center justify-between gap-3 text-xs plt-muted sm:flex-row">
                    <p>&copy; {new Date().getFullYear()} Simple Plataforma. Todos los derechos reservados.</p>
                    <div className="flex gap-4">
                        <Link href="/privacidad" className="hover:text-[var(--fg)]">
                            Política de privacidad
                        </Link>
                        <Link href="/terminos" className="hover:text-[var(--fg)]">
                            Términos y condiciones
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
