'use client';

import { useState } from 'react';
import { IconCheck, IconMinus, IconChevronDown } from '@tabler/icons-react';
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
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]" aria-label="Incluido">
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
                    ? 'text-[var(--accent)] font-semibold'
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
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-12 sm:mt-16">
            <div className="text-center mb-6">
                <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--fg)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-subtle)] transition-colors shadow-sm"
                    aria-expanded={isExpanded}
                >
                    <span>{isExpanded ? 'Ocultar comparativa detallada' : 'Comparar todas las características en detalle'}</span>
                    <IconChevronDown
                        size={18}
                        className={`transition-transform duration-200 text-[var(--fg-muted)] ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {isExpanded && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                                    <th className="py-4 px-4 sm:px-6 text-sm font-semibold text-[var(--fg)] w-1/2 sm:w-7/12">
                                        Característica
                                    </th>
                                    <th className="py-4 px-3 sm:px-4 text-center text-sm font-semibold text-[var(--fg-secondary)] w-1/4 sm:w-2.5/12">
                                        Gratis
                                    </th>
                                    <th className="py-4 px-3 sm:px-4 text-center text-sm font-bold text-[var(--accent)] bg-[var(--accent-subtle)]/30 w-1/4 sm:w-2.5/12">
                                        Pro
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON_CATEGORIES.map((category) => (
                                    <tr key={category.title} className="contents">
                                        <td
                                            colSpan={3}
                                            className="pt-6 pb-2 px-4 sm:px-6 text-xs font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--bg-subtle)]/50 border-t border-[var(--border)]"
                                        >
                                            {category.title}
                                        </td>
                                        {category.items.map((item, idx) => (
                                            <tr
                                                key={item.name}
                                                className={`border-b border-[var(--border)] hover:bg-[var(--bg-subtle)]/40 transition-colors ${
                                                    idx % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--bg-subtle)]/20'
                                                }`}
                                            >
                                                <td className="py-3.5 px-4 sm:px-6">
                                                    <p className="text-xs sm:text-sm font-medium text-[var(--fg)]">{item.name}</p>
                                                    {item.description && (
                                                        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5 leading-snug">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 sm:px-4 text-center align-middle">
                                                    <RenderValue value={item.free} />
                                                </td>
                                                <td className="py-3.5 px-3 sm:px-4 text-center align-middle bg-[var(--accent-subtle)]/15">
                                                    <RenderValue value={item.pro} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
