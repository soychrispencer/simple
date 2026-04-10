import Link from 'next/link';
import {
    IconUser,
    IconBriefcase,
    IconClock,
    IconLink,
    IconPlug,
    IconChevronRight,
    IconCreditCard,
} from '@tabler/icons-react';

const CONFIG_SECTIONS = [
    {
        href: '/panel/configuracion/perfil',
        icon: IconUser,
        title: 'Perfil profesional',
        description: 'Foto, nombre, profesión, bio y encuadre.',
    },
    {
        href: '/panel/configuracion/servicios',
        icon: IconBriefcase,
        title: 'Servicios y sesiones',
        description: 'Tipos de consulta, duración, precio y modalidad (online o presencial).',
    },
    {
        href: '/panel/configuracion/disponibilidad',
        icon: IconClock,
        title: 'Disponibilidad',
        description: 'Horarios semanales y bloqueos de tiempo.',
    },
    {
        href: '/panel/configuracion/cobros',
        icon: IconCreditCard,
        title: 'Métodos de cobro',
        description: 'MercadoPago, link de pago, transferencia bancaria.',
    },
    {
        href: '/panel/configuracion/integraciones',
        icon: IconPlug,
        title: 'Integraciones',
        description: 'Google Calendar, WhatsApp y otras conexiones externas.',
    },
    {
        href: '/panel/configuracion/link',
        icon: IconLink,
        title: 'Link de reservas',
        description: 'Tu URL pública personalizada para compartir con tus pacientes.',
    },
];

export default function ConfiguracionPage() {
    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Configuración</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
                Personaliza tu agenda y página de reservas.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
                {CONFIG_SECTIONS.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <section.icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{section.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{section.description}</p>
                        </div>
                        <IconChevronRight size={16} style={{ color: 'var(--fg-muted)' }} />
                    </Link>
                ))}
            </div>
        </div>
    );
}
