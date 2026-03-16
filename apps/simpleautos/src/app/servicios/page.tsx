'use client';
import Link from 'next/link';
import { IconSparkles, IconCar, IconArrowRight, IconCamera, IconShieldCheck, IconCheck } from '@tabler/icons-react';

const serviceCardClassName = 'group flex flex-col rounded-[24px] border p-6 transition-[transform,box-shadow,border-color,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10';

export default function ServiciosPage() {
    return (
        <div className="container-app py-12">
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--fg-muted)' }}>Servicios SimpleAutos</p>
            <h1 className="text-3xl md:text-4xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Servicios para vender mejor</h1>
            <p className="text-base mb-10 max-w-xl" style={{ color: 'var(--fg-secondary)' }}>Elige el camino que más te acomode: publicar por tu cuenta, delegarnos la venta, o potenciar con un pack premium.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SERVICES.map(s => (
                    <Link key={s.title} href={s.href} className={serviceCardClassName} style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xs)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>{s.icon}</div>
                        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--fg)' }}>{s.title}</h2>
                        <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'var(--fg-secondary)' }}>{s.desc}</p>
                        {s.price && <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>{s.price}</p>}
                        <div className="space-y-1.5 mb-4">{s.features.map(f => <div key={f} className="flex items-start gap-2"><IconCheck size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--fg-muted)' }} /><span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{f}</span></div>)}</div>
                        <div className="mt-auto flex items-center gap-1.5 text-sm font-medium transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: 'var(--fg)' }}>{s.cta} <IconArrowRight size={13} /></div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

const SERVICES = [
    {
        icon: <IconCar size={20} />, title: 'Publicar por tu cuenta', href: '/panel/publicar', price: 'Gratis',
        desc: 'Crea tu publicación en minutos. Gestiona tus mensajes y potencia con boost.',
        features: ['Publicación en 3 minutos', 'Estadísticas de visitas', 'Chat con interesados', 'Opción de boost'],
        cta: 'Publicar ahora',
    },
    {
        icon: <IconSparkles size={20} />, title: 'Venta asistida', href: '/servicios/venta-asistida', price: 'Comisión solo al vender',
        desc: 'Nosotros gestionamos todo: publicación, interesados y negociación. Tú mantienes el auto.',
        features: ['Evaluación personalizada', 'Gestión de interesados', 'Negociación profesional', 'Sin cobro si no se vende'],
        cta: 'Solicitar evaluación',
    },
    {
        icon: <IconCamera size={20} />, title: 'Planes Pro', href: '/panel/suscripciones', price: 'Desde $14.990 / mes',
        desc: 'Suscripciones mensuales para publicar más, activar CRM y operar con mejor visibilidad.',
        features: ['Más publicaciones activas', 'Destacados incluidos', 'CRM y estadísticas', 'Cobro mensual con Mercado Pago'],
        cta: 'Ver planes',
    },
];
