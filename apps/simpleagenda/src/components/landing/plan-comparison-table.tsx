import { IconCheck, IconMinus } from '@tabler/icons-react';
import { AGENDA_PRICING } from '@simple/utils';

type FeatureValue = boolean | string;

type ComparisonItem = {
    name: string;
    description?: string;
    free: FeatureValue;
    pro: FeatureValue;
    proPlus: FeatureValue;
};

type ComparisonCategory = {
    title: string;
    items: ComparisonItem[];
};

const COMPARISON_CATEGORIES: ComparisonCategory[] = [
    {
        title: 'Capacidad y límites',
        items: [
            {
                name: 'Reservas nuevas al mes',
                description: 'Cantidad de citas que pueden reservar tus clientes mensualmente.',
                free: `Hasta ${AGENDA_PRICING.free.monthlyBookings} al mes`,
                pro: 'Ilimitadas',
                proPlus: 'Ilimitadas',
            },
            {
                name: 'Servicios activos en vitrina',
                description: 'Tipos de atenciones o prestaciones disponibles para reserva.',
                free: `Hasta ${AGENDA_PRICING.free.activeServices} servicios`,
                pro: 'Ilimitados',
                proPlus: 'Ilimitados',
            },
            {
                name: 'Sucursales o lugares de atención',
                description: 'Consultorios físicos o espacios de trabajo diferenciados.',
                free: `${AGENDA_PRICING.free.activeLocations} ubicación`,
                pro: 'Ilimitadas',
                proPlus: 'Ilimitadas',
            },
            {
                name: 'Base de datos de clientes',
                description: 'Contactos y fichas acumuladas en tu sistema.',
                free: 'Ilimitados',
                pro: 'Ilimitados',
                proPlus: 'Ilimitados',
            },
            {
                name: 'Profesionales y agendas de equipo',
                free: 'Una agenda',
                pro: 'Una agenda',
                proPlus: 'Una agenda',
            },
        ],
    },
    {
        title: 'Gestión de agenda y reservas',
        items: [
            {
                name: 'Perfil público de reservas',
                description: 'Página propia lista para compartir con tus clientes.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Reserva online 24/7 sin registro',
                description: 'Tus clientes o pacientes agendan sin crear una cuenta.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Calendario y bloqueo de horarios',
                description: 'Control visual de días, franjas y pausas.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Ficha de clientes e historial',
                description: 'Notas de atención, contacto y registro de visitas previas.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Sincronización con Google Calendar',
                description: 'Conecta tu calendario personal para evitar dobles reservas.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Alertas sonoras y notificaciones en navegador',
                free: true,
                pro: true,
                proPlus: true,
            },
        ],
    },
    {
        title: 'Comunicación y recordatorios',
        items: [
            {
                name: 'Confirmación inmediata por email',
                description: 'Comprobante automático con los detalles de la hora.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Recordatorios automáticos por email',
                description: 'Recordatorios programados para reducir inasistencias.',
                free: false,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Mensajería interna con clientes',
                description: 'Canal de chat directo con quienes han reservado.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Confirmaciones y recordatorios por WhatsApp',
                description: 'Mensajes directos al teléfono de cada cliente.',
                free: false,
                pro: false,
                proPlus: 'Incluido según consumo',
            },
            {
                name: 'Seguimiento automático después de la cita',
                free: false,
                pro: false,
                proPlus: true,
            },
        ],
    },
    {
        title: 'Cobros y control financiero',
        items: [
            {
                name: 'Pagos online por anticipado',
                description: 'Cobra vía Mercado Pago o transferencia bancaria al agendar.',
                free: true,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Comisión por reserva de SimpleAgenda',
                description: 'No retenemos ningún porcentaje de tus honorarios.',
                free: '0% (sin comisión)',
                pro: '0% (sin comisión)',
                proPlus: '0% (sin comisión)',
            },
            {
                name: 'Módulo de finanzas e ingresos',
                description: 'Ingresos brutos, cobros pendientes y pagos recibidos.',
                free: false,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Packs de sesiones y promociones',
                description: 'Descuentos por paquetes o promociones temporales.',
                free: false,
                pro: true,
                proPlus: true,
            },
        ],
    },
    {
        title: 'Crecimiento y reputación',
        items: [
            {
                name: 'Estadísticas y analítica de reservas',
                description: 'Evolución mensual, días más solicitados y rendimiento.',
                free: false,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Encuestas de satisfacción (NPS)',
                description: 'Recolección de feedback después de cada atención.',
                free: false,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Programa de referidos para clientes',
                description: 'Incentiva a tus clientes actuales a recomendarte.',
                free: false,
                pro: true,
                proPlus: true,
            },
            {
                name: 'Campañas de reactivación y segmentación',
                free: false,
                pro: false,
                proPlus: true,
            },
        ],
    },
    {
        title: 'Condiciones y soporte',
        items: [
            {
                name: 'Tarjeta de crédito al registrarse',
                free: 'No requerida',
                pro: 'No requerida',
                proPlus: 'No requerida',
            },
            {
                name: 'Prueba completa sin costo',
                free: '30 días de Pro incluidos',
                pro: '30 días de Pro incluidos',
                proPlus: '30 días de Pro incluidos',
            },
            {
                name: 'Permanencia o cláusulas mínimas',
                free: 'Sin contrato',
                pro: 'Cancela cuando quieras',
                proPlus: 'Cancela cuando quieras',
            },
            {
                name: 'Soporte',
                free: 'Centro de ayuda y email',
                pro: 'Soporte prioritario',
                proPlus: 'Soporte prioritario',
            },
        ],
    },
];

function RenderValue({ value }: { value: FeatureValue }) {
    if (typeof value === 'boolean') {
        return value ? (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--agenda-lime)] text-[var(--agenda-green)]" aria-label="Incluido">
                <IconCheck size={16} stroke={2.5} />
            </span>
        ) : (
            <span className="inline-flex size-6 items-center justify-center rounded-full text-[var(--fg-muted)]" aria-label="No incluido">
                <IconMinus size={16} stroke={1.5} />
            </span>
        );
    }

    const isSubtle = value.includes('Próximamente') || value.startsWith('Se confirma') || value.startsWith('Se define');
    const isHighlight = value === 'Ilimitadas' || value === 'Ilimitados' || value === '0% (sin comisión)';

    return (
        <span
            className={`text-xs font-medium ${
                isHighlight
                    ? 'agenda-comparison-highlight font-semibold'
                    : isSubtle
                        ? 'text-[var(--fg-muted)] italic'
                        : 'text-[var(--fg-secondary)]'
            }`}
        >
            {value}
        </span>
    );
}

export function PlanComparisonTable() {
    return (
        <>
            <p className="mb-3 text-xs text-[var(--fg-muted)] sm:hidden">Desliza horizontalmente para comparar los tres planes.</p>
            <div className="agenda-comparison-table min-w-0 overflow-x-auto overscroll-x-contain rounded-[var(--agenda-radius-control)] border border-[var(--border)]">
                <table className="w-full min-w-[740px] table-fixed text-left" aria-label="Comparación de funciones de los planes">
                    <thead>
                        <tr className="bg-[var(--bg-subtle)] text-sm">
                            <th scope="col" className="w-[29%] px-4 py-3">Función</th>
                            <th scope="col" className="w-[23.67%] px-2 py-3 text-center">Gratis</th>
                            <th scope="col" className="agenda-comparison-highlight w-[23.67%] bg-[var(--agenda-tint)] px-2 py-3 text-center">Pro</th>
                            <th scope="col" className="w-[23.66%] px-2 py-3 text-center">Pro+</th>
                        </tr>
                    </thead>
                    {COMPARISON_CATEGORIES.map((category) => (
                        <tbody key={category.title}>
                            <tr>
                                <th colSpan={4} scope="rowgroup" className="agenda-comparison-highlight border-t border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-2.5 text-xs font-bold">
                                    {category.title}
                                </th>
                            </tr>
                            {category.items.map((item) => (
                                <tr key={item.name} className="border-t border-[var(--border)]">
                                    <th scope="row" className="break-words px-4 py-3 text-xs font-semibold sm:text-sm">
                                        {item.name}
                                        {item.description && (
                                            <span className="mt-1 block text-[0.6875rem] font-normal leading-snug text-[var(--fg-muted)]">{item.description}</span>
                                        )}
                                    </th>
                                    <td className="break-words px-2 py-3 text-center align-middle"><RenderValue value={item.free} /></td>
                                    <td className="break-words bg-[var(--agenda-tint)] px-2 py-3 text-center align-middle"><RenderValue value={item.pro} /></td>
                                    <td className="break-words px-2 py-3 text-center align-middle"><RenderValue value={item.proPlus} /></td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--fg-muted)]">
                Los precios mensuales se muestran antes de IVA. Mercado Pago confirma el total con impuestos antes de pagar.
            </p>
        </>
    );
}
