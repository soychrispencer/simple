'use client';

import Link from 'next/link';
import { IconHome } from '@tabler/icons-react';

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
        <footer className="border-t border-(--border)">
            <div className="container-app py-16">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
                    <div className="col-span-2 sm:col-span-1">
                        <Link href="/" className="group mb-4 flex items-center gap-1.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105" style={{ background: 'var(--accent)', color: '#fff' }}>
                                <IconHome size={16} />
                            </div>
                            <span className="inline-flex items-end gap-[0.06rem] text-[1rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                                <span className="font-semibold leading-none">Simple</span>
                                <span className="translate-y-[0.02em] font-normal leading-none" style={{ color: 'var(--fg-muted)' }}>Propiedades</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-[220px] text-(--fg-muted)">
                            SimplePropiedades simplifica la búsqueda y publicación de propiedades en Chile.
                        </p>
                    </div>

                    {sections.map((section) => (
                        <div key={section.title}>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-4 text-(--fg-muted)">
                                {section.title}
                            </p>
                            <nav className="flex flex-col gap-2.5">
                                {section.links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-sm text-(--fg-secondary) hover:text-(--fg) transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-(--border)">
                    <p className="text-sm text-(--fg-muted)">
                        &copy; {new Date().getFullYear()} SimplePropiedades
                    </p>
                    <p className="text-sm text-(--fg-muted)">
                        Ecosistema <span className="font-medium text-(--fg-secondary)">Simple</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
