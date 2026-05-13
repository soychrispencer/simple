'use client';

import Link from 'next/link';
import { IconSteeringWheel } from '@tabler/icons-react';
import { BrandLogo } from '@simple/ui';

export function Footer() {
    const sections = [
        {
            title: 'Vehículos',
            links: [
                { label: 'Comprar', href: '/ventas' },
                { label: 'Arrendar', href: '/arriendos' },
                { label: 'Subastas', href: '/subastas' },
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
        <footer style={{ borderTop: '1px solid var(--border)' }}>
            <div className="container-app py-16">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
                    <div className="col-span-2 sm:col-span-1">
                        <Link href="/" className="group mb-4 flex items-center gap-1 shrink-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#ff3600', color: '#fff' }}>
                                <IconSteeringWheel size={16} />
                            </div>
                            <span className="inline-flex items-end gap-[0.08rem] text-[1.05rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                                <span className="font-semibold leading-none">Simple</span>
                                <span className="translate-y-[0.02em] font-normal leading-none" style={{ color: 'var(--fg-muted)' }}>Autos</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-50" style={{ color: 'var(--fg-muted)' }}>
                            SimpleAutos simplifica la compra y venta de vehículos en Chile.
                        </p>
                    </div>

                    {sections.map((section) => (
                        <div key={section.title}>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--fg-muted)' }}>
                                {section.title}
                            </p>
                            <nav className="flex flex-col gap-2.5">
                                {section.links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-sm transition-colors duration-200"
                                        style={{ color: 'var(--fg-secondary)' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-secondary)'; }}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>

                <div
                    className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8"
                    style={{ borderTop: '1px solid var(--border)' }}
                >
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        &copy; {new Date().getFullYear()} SimpleAutos. Todos los derechos reservados.
                    </p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Ecosistema <span className="font-medium" style={{ color: 'var(--fg-secondary)' }}>Simple</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
