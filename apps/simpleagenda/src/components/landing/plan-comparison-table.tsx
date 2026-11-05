import { IconCheck, IconMinus } from '@tabler/icons-react';
import { AGENDA_PRICING } from '@simple/utils';

type FeatureValue = boolean | string;

type ComparisonItem = {
    name: string;
    description?: string;
    free: FeatureValue;
    pro: FeatureValue;
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
            },
            {
                name: 'Servicios activos en vitrina',
                description: 'Tipos de atenciones o prestaciones disponibles para reserva.',
                free: `Hasta ${AGENDA_PRICING.free.activeServices} servicios`,
                pro: 'Ilimitados',
            },
            {
                name: 'Sucursales o lugares de atención',
                description: 'Consultorios físicos o espacios de trabajo diferenciados.',
                free: `${AGENDA_PRICING.free.activeLocations} ubicación`,
                pro: 'Ilimitadas',
            },
            {
                name: 'Base de datos de clientes',
                description: 'Contactos y fichas acumuladas en tu sistema.',
                free: 'Ilimitados',
                pro: 'Ilimitados',
            },
        ],
    },
    {
        title: 'Gestión de agenda y reservas',
        items: [
            {
                name: 'Perfil público de reservas',
                description: 'Página propia (simpleagenda.cl/tu-nombre) lista para compartir.',
                free: true,
                pro: true,
            },
            {
                name: 'Reserva online 24/7 sin registro',
                description: 'Tus clientes o pacientes agendan en segundos sin crear cuentas.',
                free: true,
                pro: true,
            },
            {
                name: 'Calendario y bloqueo de horarios',
                description: 'Control visual de días, franjas y pausas.',
                free: true,
                pro: true,
            },
            {
                name: 'Ficha de clientes e historial',
                description: 'Notas de atención, teléfono y registro de visitas previas.',
                free: true,
                pro: true,
            },
            {
                name: 'Sincronización con Google Calendar',
                description: 'Conecta tu calendario personal para evitar dobles reservas.',
                free: true,
                pro: true,
            },
            {
                name: 'Alertas sonoras y notificaciones en navegador',
                description: 'Avisos instantáneos cuando entra una nueva reserva.',
                free: true,
                pro: true,
            },
        ],
    },
    {
        title: 'Comunicación y recordatorios',
        items: [
            {
                name: 'Confirmación inmediata por email',
                description: 'Envío de comprobante automático con los detalles de la hora.',
                free: true,
                pro: true,
            },
            {
                name: 'Recordatorios automáticos por email',
                description: 'Recordatorios programados antes de la cita para reducir inasistencias.',
                free: false,
                pro: true,
            },
            {
                name: 'Mensajería interna con clientes',
                description: 'Canal de chat directo con quienes han reservado.',
                free: true,
                pro: true,
            },
            {
                name: 'Recordatorios por WhatsApp',
                description: 'Mensajes directos por WhatsApp a clientes.',
                free: 'Próximamente (Pro+)',
                pro: 'Próximamente (Pro+)',
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
            },
            {
                name: 'Comisión por reserva de SimpleAgenda',
                description: 'No retenemos ningún porcentaje de tus honorarios.',
                free: '0% (sin comisión)',
                pro: '0% (sin comisión)',
            },
            {
                name: 'Módulo de finanzas e ingresos',
                description: 'Métricas de ingresos brutos, cobros pendientes y pagados.',
                free: false,
                pro: true,
            },
            {
                name: 'Packs de sesiones y promociones',
                description: 'Descuentos por paquetes o promociones temporales para atraer reservas.',
                free: false,
                pro: true,
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
            },
            {
                name: 'Encuestas de satisfacción (NPS)',
                description: 'Recolección automática de feedback tras cada atención.',
                free: false,
                pro: true,
            },
            {
                name: 'Programa de referidos para clientes',
                description: 'Incentiva a tus clientes actuales a recomendarte.',
                free: false,
                pro: true,
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
            },
            {
                name: 'Prueba completa sin costo',
                free: '30 días de Pro incluidos',
                pro: '30 días de Pro incluidos',
            },
            {
                name: 'Permanencia o cláusulas mínimas',
                free: 'Sin contrato',
                pro: 'Cancela cuando quieras',
            },
            {
                name: 'Soporte',
                free: 'Centro de ayuda y email',
                pro: 'Soporte prioritario',
            },
        ],
    },
];

function RenderValue({ value }: { value: FeatureValue }) {
    if (typeof value === 'boolean') {
        return value ? (
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-[var(--accent-subtle)] text-[var(--agenda-link)]" aria-label="Incluido">
                <IconCheck size={16} stroke={2.5} />
            </span>
        ) : (
            <span className="inline-flex items-center justify-center size-6 rounded-full text-[var(--fg-muted)]" aria-label="No incluido">
                <IconMinus size={16} stroke={1.5} />
            </span>
        );
    }

    const isSubtle = value.includes('Próximamente');
    const isHighlight = value === 'Ilimitadas' || value === 'Ilimitados' || value === '0% (sin comisión)';

    return (
        <span
            className={`text-xs font-medium ${
                isHighlight
                    ? 'text-[var(--agenda-link)] font-semibold'
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
        <div className="min-w-0 overflow-hidden rounded-[var(--agenda-radius-control)] border border-[var(--border)]">
            <table className="w-full table-fixed text-left">
                <thead>
                    <tr className="bg-[var(--bg-subtle)] text-sm">
                        <th scope="col" className="w-[50%] px-2.5 py-3 sm:px-4">Función</th>
                        <th scope="col" className="w-[25%] px-1 py-3 text-center">Gratis</th>
                        <th scope="col" className="w-[25%] bg-[var(--agenda-tint)] px-1 py-3 text-center text-[var(--agenda-link)]">Pro</th>
                    </tr>
                </thead>
                {COMPARISON_CATEGORIES.map((category) => (
                    <tbody key={category.title}>
                        <tr>
                            <th colSpan={3} scope="rowgroup" className="border-t border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-2 text-xs font-bold text-[var(--agenda-link)] sm:px-4">
                                {category.title}
                            </th>
                        </tr>
                        {category.items.map((item) => (
                            <tr key={item.name} className="border-t border-[var(--border)]">
                                <th scope="row" className="break-words px-2.5 py-2.5 text-xs font-semibold sm:px-4 sm:text-sm">
                                    {item.name}
                                    {item.description && (
                                        <span className="mt-0.5 block text-[0.6875rem] font-normal leading-snug text-[var(--fg-muted)]">{item.description}</span>
                                    )}
                                </th>
                                <td className="break-words px-1 py-2.5 text-center align-middle sm:px-2">
                                    <RenderValue value={item.free} />
                                </td>
                                <td className="break-words bg-[var(--agenda-tint)] px-1 py-2.5 text-center align-middle sm:px-2">
                                    <RenderValue value={item.pro} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
