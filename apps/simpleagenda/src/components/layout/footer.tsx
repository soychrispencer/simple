'use client';

import Link from 'next/link';
import { IconCalendar } from '@tabler/icons-react';

export function Footer() {
    const sections = [
        {
            title: 'Servicios',
            links: [
                { label: 'Agenda', href: '/agenda' },
                { label: 'Calendario', href: '/calendario' },
                { label: 'Reservas', href: '/reservas' },
            ],
        },
        {
            title: 'Soporte',
            links: [
                { label: 'Ayuda', href: '/ayuda' },
                { label: 'Contacto', href: '/contacto' },
                { label: 'Preguntas frecuentes', href: '/faq' },
            ],
        },
    ];

    return (
        <footer className="border-t border-(--border)">
            <div className="container-app py-16">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
                    <div className="col-span-2 sm:col-span-1">
                        <Link href="/" className="group mb-4 flex items-center gap-1 shrink-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#0d9488', color: '#fff' }}>
                                <IconCalendar size={16} />
                            </div>
                            <span className="inline-flex items-end gap-[0.08rem] text-[1.05rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                                <span className="font-semibold leading-none">Simple</span>
                                <span className="translate-y-[0.02em] font-normal leading-none" style={{ color: 'var(--fg-muted)' }}>Agenda</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-[220px] text-(--fg-muted)">
                            SimpleAgenda simplifica la gestión de citas y reservas.
                        </p>
                    </div>

                    {sections.map((section) => (
                        <div key={section.title}>
                            <h4 className="font-medium text-sm mb-4 text-(--fg)">{section.title}</h4>
                            <ul className="space-y-3">
                                {section.links.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="text-sm text-(--fg-muted) hover:text-(--fg) transition-colors">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-(--border) flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-(--fg-muted)">
                        © {new Date().getFullYear()} SimpleAgenda. Todos los derechos reservados.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacidad" className="text-sm text-(--fg-muted) hover:text-(--fg) transition-colors">Privacidad</Link>
                        <Link href="/terminos" className="text-sm text-(--fg-muted) hover:text-(--fg) transition-colors">Términos</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
