'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { IconArrowRight, IconCar, IconHome, IconShoppingBag, IconUsers, IconShieldCheck, IconChartBar, IconSun, IconMoon, IconCheck } from '@tabler/icons-react';

export default function PlataformaPage() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Nav */}
            <header className="sticky top-0 z-40" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--fg)' }}><span className="font-semibold text-sm" style={{ color: 'var(--bg)' }}>S</span></div>
                        <span className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Simple<span className="font-normal" style={{ color: 'var(--fg-muted)' }}>Plataforma</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        {mounted && <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ color: 'var(--fg-muted)' }}>{theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}</button>}
                        <Link href="#contacto" className="h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-opacity hover:opacity-85" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>Comenzar <IconArrowRight size={13} /></Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-20 md:pt-40 md:pb-28 text-center">
                <p className="text-sm font-medium mb-5 animate-fade-in" style={{ color: 'var(--fg-muted)' }}>Ecosistema de Marketplaces</p>
                <h1 className="text-[clamp(2.2rem,6vw,4.5rem)] font-semibold leading-[1.05] mb-6 animate-slide-up" style={{ color: 'var(--fg)' }}>
                    Un ecosistema.<br />Múltiples verticales.
                </h1>
                <p className="text-[clamp(1rem,2vw,1.15rem)] max-w-lg mx-auto mb-12 animate-slide-up" style={{ color: 'var(--fg-secondary)', animationDelay: '80ms' }}>
                    SimplePlataforma unifica autos, propiedades y tiendas bajo una sola plataforma.<br />Una cuenta, múltiples marketplaces.
                </p>
                <div className="flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '140ms' }}>
                    <Link href="#verticales" className="h-12 px-6 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-85" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>Explorar verticales</Link>
                    <Link href="#contacto" className="h-12 px-6 rounded-lg text-sm font-medium flex items-center gap-2" style={{ border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>Contactar</Link>
                </div>
            </section>

            {/* Stats */}
            <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="max-w-[1200px] mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[{ v: '33,000+', l: 'Publicaciones activas' }, { v: '24,500+', l: 'Usuarios registrados' }, { v: '3', l: 'Verticales' }, { v: '99.9%', l: 'Uptime' }].map(s => (
                        <div key={s.l} className="text-center"><p className="text-3xl md:text-4xl font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>{s.v}</p><p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{s.l}</p></div>
                    ))}
                </div>
            </section>

            {/* Verticals */}
            <section id="verticales" className="max-w-[1200px] mx-auto px-6 py-20 md:py-28">
                <h2 className="text-2xl md:text-3xl font-semibold text-center mb-3" style={{ color: 'var(--fg)' }}>Verticales</h2>
                <p className="text-base text-center mb-14" style={{ color: 'var(--fg-muted)' }}>Cada vertical, diseñada para su mercado.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { icon: <IconCar size={22} />, name: 'SimpleAutos', desc: 'Marketplace de vehículos: compra, vende, arrienda y subasta. Wizard de publicación, filtros avanzados y CRM integrado.', color: '#ff3600', status: 'Activo', url: 'http://localhost:3000' },
                        { icon: <IconHome size={22} />, name: 'SimplePropiedades', desc: 'Marketplace inmobiliario: casas, departamentos, oficinas, terrenos y proyectos nuevos. Perfil corredor profesional.', color: '#3232FF', status: 'Activo', url: 'http://localhost:3001' },
                        { icon: <IconShoppingBag size={22} />, name: 'SimpleTiendas', desc: 'Marketplace de comercio: tiendas, productos, servicios. Próximamente disponible en el ecosistema Simple.', color: '#7A5CFF', status: 'Próximamente', url: '#' },
                    ].map(v => (
                        <div key={v.name} className="stagger-item rounded-xl p-7 transition-all duration-300" style={{ border: '1px solid var(--border)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>{v.icon}</div>
                                <div className="flex-1"><h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{v.name}</h3></div>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: v.status === 'Activo' ? 'var(--fg)' : 'var(--bg-muted)', color: v.status === 'Activo' ? 'var(--bg)' : 'var(--fg-muted)' }}>{v.status}</span>
                            </div>
                            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--fg-secondary)' }}>{v.desc}</p>
                            <div className="w-full h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${v.color}20, transparent)` }} />
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)' }}>
                <div className="max-w-[1200px] mx-auto px-6 py-20 md:py-28">
                    <h2 className="text-2xl md:text-3xl font-semibold text-center mb-14" style={{ color: 'var(--fg)' }}>Ventajas del ecosistema</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: <IconUsers size={18} />, t: 'Una cuenta', d: 'Un usuario, todas las verticales. Perfil y datos compartidos.' },
                            { icon: <IconShieldCheck size={18} />, t: 'Seguridad', d: 'Auth unificada, verificación y moderación centralizada.' },
                            { icon: <IconChartBar size={18} />, t: 'Analytics', d: 'Dashboard unificado con métricas de todas las verticales.' },
                            { icon: <IconArrowRight size={18} />, t: 'Escalable', d: 'Preparado para agregar infinitas verticales con una sola base.' },
                        ].map(f => (
                            <div key={f.t} className="p-5 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                                <div className="mb-3" style={{ color: 'var(--fg-muted)' }}>{f.icon}</div>
                                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--fg)' }}>{f.t}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section id="contacto" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="max-w-[1200px] mx-auto px-6 py-24 md:py-32 text-center">
                    <h2 className="text-3xl md:text-[2.75rem] font-semibold mb-4" style={{ color: 'var(--fg)' }}>¿Quieres ser parte?</h2>
                    <p className="text-base mb-10 max-w-md mx-auto" style={{ color: 'var(--fg-muted)' }}>Únete al ecosistema Simple y transforma tu mercado.</p>
                    <Link href="mailto:contacto@simple.cl" className="inline-flex items-center gap-2 h-12 px-8 text-sm font-medium rounded-lg transition-opacity hover:opacity-85" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>Contactar <IconArrowRight size={15} /></Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid var(--border)' }}>
                <div className="max-w-[1200px] mx-auto px-6 py-8 flex items-center justify-between">
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>&copy; {new Date().getFullYear()} SimplePlataforma</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ecosistema <span className="font-medium" style={{ color: 'var(--fg-secondary)' }}>Simple</span></p>
                </div>
            </footer>
        </div>
    );
}
