import Link from 'next/link';
import { IconArrowRight, IconChartBar, IconGift, IconRocket, IconTags, IconUsers } from '@tabler/icons-react';
import { PanelPageHeader } from '@simple/ui/panel';

const tools = [
    { href: '/panel/analytics', title: 'Estadísticas', description: 'Revisa tus citas, la actividad y las encuestas de satisfacción.', icon: IconChartBar },
    { href: '/panel/clientes/reactivar', title: 'Reactivar clientes', description: 'Encuentra a quienes llevan tiempo sin agendar y prepara mensajes individuales.', icon: IconUsers },
    { href: '/panel/mis-servicios/promociones', title: 'Promociones', description: 'Crea descuentos que tus clientes puedan usar al reservar.', icon: IconTags },
    { href: '/panel/crecimiento/referidos', title: 'Referidos', description: 'Consulta los beneficios y comparte tu enlace de invitación.', icon: IconGift },
    { href: '/panel/publicidad', title: 'Publicidad', description: 'Promociona los servicios de tu perfil público.', icon: IconRocket },
];

export default function CrecimientoPage() {
    return (
        <div className="container-app panel-page min-w-0 py-4 lg:py-8">
            <PanelPageHeader title="Crecimiento" description="Consulta tus resultados y elige cómo atraer clientes o hacer que vuelvan." />
            <div className="grid gap-3 md:grid-cols-2">
                {tools.map(({ href, title, description, icon: Icon }) => (
                    <Link key={href} href={href} className="group flex items-start gap-3 rounded-2xl border border-(--border) bg-(--surface) p-5 hover:border-(--accent)">
                        <Icon size={22} className="shrink-0 text-accent-ink" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-fg">{title}</h2>
                            <p className="mt-1 text-sm text-fg-muted">{description}</p>
                        </div>
                        <IconArrowRight size={18} className="shrink-0 text-fg-muted" aria-hidden />
                    </Link>
                ))}
            </div>
        </div>
    );
}
