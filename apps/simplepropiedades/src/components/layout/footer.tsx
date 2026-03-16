'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
    const sections = [
        {
            title: 'Propiedades',
            links: [
                { label: 'Comprar', href: '/ventas' },
                { label: 'Arrendar', href: '/arriendos' },
                { label: 'Proyectos nuevos', href: '/proyectos' },
                { label: 'Publicar', href: '/panel/publicar' },
            ],
        },
        {
            title: 'Empresa',
            links: [
                { label: 'Nosotros', href: '/nosotros' },
                { label: 'Contacto', href: '/contacto' },
                { label: 'Blog', href: '/blog' },
            ],
        },
        {
            title: 'Legal',
            links: [
                { label: 'Términos', href: '/terminos' },
                { label: 'Privacidad', href: '/privacidad' },
                { label: 'Preguntas frecuentes', href: '/faq' },
            ],
        },
    ];

    return (
        <footer className="border-t border-[var(--border)]">
            <div className="container-app py-16">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
                    <div className="col-span-2 sm:col-span-1">
                        <Link href="/" className="group mb-4 flex items-center gap-1.5">
                            <div className="h-8 w-8 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                                <Image src="/logo.png" alt="SimplePropiedades" width={32} height={32} className="h-full w-full object-contain" />
                            </div>
                            <span className="inline-flex items-end gap-[0.06rem] text-[1rem] tracking-tight text-[var(--fg)]">
                                <span className="font-semibold leading-none">Simple</span>
                                <span className="translate-y-[0.02em] font-normal leading-none text-[var(--fg-muted)]">Propiedades</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-[220px] text-[var(--fg-muted)]">
                            SimplePropiedades simplifica la búsqueda y publicación de propiedades en Chile.
                        </p>
                    </div>

                    {sections.map((section) => (
                        <div key={section.title}>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-4 text-[var(--fg-muted)]">
                                {section.title}
                            </p>
                            <nav className="flex flex-col gap-2.5">
                                {section.links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-sm text-[var(--fg-secondary)] hover:text-[var(--fg)] transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-[var(--border)]">
                    <p className="text-sm text-[var(--fg-muted)]">
                        &copy; {new Date().getFullYear()} SimplePropiedades
                    </p>
                    <p className="text-sm text-[var(--fg-muted)]">
                        Ecosistema <span className="font-medium text-[var(--fg-secondary)]">Simple</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
