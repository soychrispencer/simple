import Link from 'next/link';
import {
    IconUser,
    IconNotebook,
    IconMapPin,
    IconPlugConnected,
    IconChevronRight,
} from '@tabler/icons-react';
import { PanelPageHeader } from '@simple/ui';

const CONFIG_SECTIONS = [
    {
        href: '/panel/configuracion/cuenta',
        icon: IconUser,
        title: 'Cuenta',
        description: 'Datos de tu sesion, nombre y telefono.',
    },
    {
        href: '/panel/configuracion/pagina',
        icon: IconNotebook,
        title: 'Pagina publica',
        description: 'Personaliza tu perfil visible para clientes.',
    },
    {
        href: '/panel/configuracion/direcciones',
        icon: IconMapPin,
        title: 'Direcciones',
        description: 'Gestiona tus direcciones de propiedades.',
    },
    {
        href: '/panel/configuracion/integraciones',
        icon: IconPlugConnected,
        title: 'Integraciones',
        description: 'Conecta Instagram y otros servicios externos.',
    },
];

export default function ConfiguracionPage() {
    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                title="Configuracion"
                description="Gestiona tu cuenta y preferencias."
            />

            <div className="flex flex-col gap-3">
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
