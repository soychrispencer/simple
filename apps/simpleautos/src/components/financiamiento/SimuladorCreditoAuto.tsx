'use client';

import { useMemo, useState } from 'react';
import {
    IconAlertTriangle,
    IconBrandWhatsapp,
    IconCalculator,
    IconCheck,
    IconInfoCircle,
    IconShieldCheck,
} from '@tabler/icons-react';
import {
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelNotice,
    PanelSegmentedToggle,
} from '@simple/ui/panel';
import {
    formatCLP,
    formatPct,
    simular,
    type ResultadoSimulacion,
    type TipoTrabajador,
    type TipoVehiculo,
} from '@/lib/financiamiento/calculadora';
import { REQUISITOS_GENERALES } from '@/lib/financiamiento/tasas-referenciales';

const ANIO_ACTUAL = new Date().getFullYear();
const DEFAULT_PRECIO = 12_500_000;

function pieInicialPct(tipo: TipoVehiculo): number {
    return tipo === 'nuevo' ? 0.1 : 0.2;
}

interface SimuladorCreditoAutoProps {
    onSolicitar?: (input: {
        precioVehiculo: number;
        pieMonto: number;
        plazoMeses: number;
        resultado: ResultadoSimulacion;
    }) => void;
    whatsappNumero?: string;
    initialPrecio?: number;
    initialAnio?: number;
    initialTipoVehiculo?: TipoVehiculo;
    listingTitle?: string;
    listingId?: string;
}

function parseNumero(valor: string): number {
    const limpio = valor.replace(/[^\d]/g, '');
    return limpio ? parseInt(limpio, 10) : 0;
}

function formatCLPInput(valor: number): string {
    if (!valor) return '';
    return valor.toLocaleString('es-CL');
}

function CampoMoneda({
    label,
    valor,
    onChange,
    placeholder,
    ayuda,
}: {
    label: string;
    valor: number;
    onChange: (v: number) => void;
    placeholder?: string;
    ayuda?: string;
}) {
    return (
        <div>
            {label ? (
                <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">{label}</label>
            ) : null}
            <input
                type="text"
                inputMode="numeric"
                className="form-input w-full"
                value={formatCLPInput(valor)}
                placeholder={placeholder}
                onChange={(e) => onChange(parseNumero(e.target.value))}
            />
            {ayuda ? <p className="mt-1 text-[10px] text-[var(--fg-muted)]">{ayuda}</p> : null}
        </div>
    );
}

function cargaStyle(nivel: ResultadoSimulacion['cargaFinanciera']['nivel']) {
    switch (nivel) {
        case 'comoda':
            return {
                badge: 'marketplace-flow-badge-success',
                icon: IconCheck,
                mensaje: 'Carga financiera cómoda',
            };
        case 'ajustada':
            return {
                badge: 'marketplace-flow-badge-warning',
                icon: IconAlertTriangle,
                mensaje: 'Carga financiera ajustada',
            };
        case 'alta':
            return {
                badge: 'marketplace-flow-badge-error',
                icon: IconAlertTriangle,
                mensaje: 'Carga financiera alta: riesgo de rechazo',
            };
    }
}

export default function SimuladorCreditoAuto({
    onSolicitar,
    whatsappNumero = '56978623828',
    initialPrecio,
    initialAnio,
    initialTipoVehiculo,
    listingTitle,
    listingId,
}: SimuladorCreditoAutoProps) {
    const precioInicial =
        initialPrecio && initialPrecio > 0 ? initialPrecio : DEFAULT_PRECIO;
    const anioInicial =
        initialAnio && initialAnio >= 1990 && initialAnio <= ANIO_ACTUAL
            ? initialAnio
            : ANIO_ACTUAL - 4;

    const [precioVehiculo, setPrecioVehiculo] = useState(precioInicial);
    const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>(
        initialTipoVehiculo ?? 'usado',
    );
    const [anioVehiculo, setAnioVehiculo] = useState(anioInicial);
    const [pieMonto, setPieMonto] = useState(
        Math.round(precioInicial * pieInicialPct(initialTipoVehiculo ?? 'usado')),
    );
    const [plazoMeses, setPlazoMeses] = useState(48);
    const [rentaLiquida, setRentaLiquida] = useState(900_000);
    const [tipoTrabajador, setTipoTrabajador] = useState<TipoTrabajador>('dependiente');
    const [otrasDeudasMensuales, setOtrasDeudasMensuales] = useState(0);

    const resultado = useMemo(
        () =>
            simular({
                precioVehiculo,
                tipoVehiculo,
                anioVehiculo,
                pieMonto,
                plazoMeses,
                rentaLiquida,
                tipoTrabajador,
                otrasDeudasMensuales,
            }),
        [
            precioVehiculo,
            tipoVehiculo,
            anioVehiculo,
            pieMonto,
            plazoMeses,
            rentaLiquida,
            tipoTrabajador,
            otrasDeudasMensuales,
        ],
    );

    const pieEfectivoPct = precioVehiculo > 0 ? pieMonto / precioVehiculo : 0;
    const escenarioMercado = resultado.escenarios[1];
    const carga = cargaStyle(resultado.cargaFinanciera.nivel);
    const CargaIcon = carga.icon;

    function handleSolicitar() {
        if (onSolicitar) {
            onSolicitar({ precioVehiculo, pieMonto, plazoMeses, resultado });
            return;
        }
        const mensaje = encodeURIComponent(
            `Hola SimpleAutos, quiero simular un crédito automotriz.\n` +
                (listingTitle ? `Publicación: ${listingTitle}\n` : '') +
                (listingId ? `ID: ${listingId}\n` : '') +
                `Vehículo: ${formatCLP(precioVehiculo)} (${tipoVehiculo})\n` +
                `Pie: ${formatCLP(pieMonto)} (${formatPct(pieEfectivoPct, 0)})\n` +
                `Plazo: ${plazoMeses} meses\n` +
                `Cuota estimada (mercado): ${formatCLP(escenarioMercado.cuotaTotalMensual)}/mes`,
        );
        window.open(`https://wa.me/${whatsappNumero}?text=${mensaje}`, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className="marketplace-flow-page">
            <div className="marketplace-flow-header">
                <div className="container-app marketplace-flow-header-inner">
                    <div>
                        <p className="marketplace-flow-eyebrow">Simulador gratuito</p>
                        <h1 className="marketplace-flow-title">Simulador de crédito automotriz</h1>
                        <p className="marketplace-flow-subtitle">
                            Gratis · sin registro · no es aprobación crediticia
                        </p>
                    </div>
                    <div className="marketplace-flow-meta">
                        <div className="flex items-center gap-1.5">
                            <IconShieldCheck size={14} className="text-[var(--color-success)]" />
                            <span>3 escenarios de tasa</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconInfoCircle size={14} className="text-[var(--fg-muted)]" />
                            <span>Datos de mercado chileno</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconCalculator size={14} className="text-[var(--accent)]" />
                            <span>Cuota {formatCLP(Math.round(escenarioMercado.cuotaTotalMensual))}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-app panel-page marketplace-flow-body mx-auto max-w-6xl">
                {listingTitle ? (
                    <PanelNotice tone="neutral" className="mb-4">
                        Vehículo de referencia: <strong>{listingTitle}</strong>
                    </PanelNotice>
                ) : null}

                <PanelCard size="lg" className="mb-6 flex items-center gap-5">
                    <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${carga.badge}`}
                    >
                        <CargaIcon size={32} />
                    </div>
                    <div className="flex-1">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                            Carga financiera
                        </p>
                        <p className="text-xl font-semibold text-[var(--fg)]">{carga.mensaje}</p>
                        <p className="mt-1 text-sm text-[var(--fg-muted)]">
                            {formatPct(resultado.cargaFinanciera.porcentajeSobreRenta, 0)} de tu renta líquida · cuota
                            referencial de mercado {formatCLP(Math.round(escenarioMercado.cuotaTotalMensual))}/mes
                        </p>
                    </div>
                </PanelCard>

                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="space-y-6 lg:col-span-2">
                        <PanelCard size="lg" className="space-y-4">
                            <PanelBlockHeader title="1. Vehículo y pie" className="mb-0" />

                            <CampoMoneda
                                label="Precio del vehículo"
                                valor={precioVehiculo}
                                onChange={setPrecioVehiculo}
                                placeholder="12.500.000"
                            />

                            <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">
                                    Tipo de vehículo
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(
                                        [
                                            { value: 'usado', label: 'Usado' },
                                            { value: 'nuevo', label: 'Nuevo (0 km)' },
                                        ] as const
                                    ).map((op) => (
                                        <button
                                            key={op.value}
                                            type="button"
                                            onClick={() => setTipoVehiculo(op.value)}
                                            className={`marketplace-flow-option transition-colors ${
                                                tipoVehiculo === op.value ? 'marketplace-flow-option--active' : ''
                                            }`}
                                        >
                                            <p className="text-sm font-medium text-[var(--fg)]">{op.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {tipoVehiculo === 'usado' ? (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">
                                        Año del vehículo
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input w-full"
                                        value={anioVehiculo}
                                        min={1990}
                                        max={ANIO_ACTUAL}
                                        onChange={(e) =>
                                            setAnioVehiculo(parseInt(e.target.value, 10) || ANIO_ACTUAL)
                                        }
                                    />
                                </div>
                            ) : null}

                            <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Pie</label>
                                <div className="marketplace-flow-range-label">
                                    <span className="font-semibold">{formatCLP(pieMonto)}</span>
                                    <span className="text-[var(--fg-muted)]">{formatPct(pieEfectivoPct, 0)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(precioVehiculo, 0)}
                                    step={50_000}
                                    value={Math.min(pieMonto, precioVehiculo)}
                                    onChange={(e) => setPieMonto(parseInt(e.target.value, 10))}
                                    className="marketplace-flow-range mt-2"
                                />
                                <div className="mt-2">
                                    <CampoMoneda label="" valor={pieMonto} onChange={setPieMonto} />
                                </div>
                                <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
                                    Pie mínimo sugerido para este perfil: ~
                                    {formatPct(resultado.pieMinimoSugeridoPct, 0)}
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Plazo</label>
                                <div className="marketplace-flow-range-label">
                                    <span className="font-semibold">{plazoMeses} meses</span>
                                    <span className="text-[var(--fg-muted)]">máx. sugerido {resultado.plazoMaxSugerido}</span>
                                </div>
                                <input
                                    type="range"
                                    min={12}
                                    max={60}
                                    step={6}
                                    value={plazoMeses}
                                    onChange={(e) => setPlazoMeses(parseInt(e.target.value, 10))}
                                    className="marketplace-flow-range mt-2"
                                />
                                <div className="mt-1 flex justify-between text-[10px] text-[var(--fg-muted)]">
                                    <span>12 meses</span>
                                    <span>60 meses</span>
                                </div>
                            </div>
                        </PanelCard>

                        <PanelCard size="lg" className="space-y-4">
                            <PanelBlockHeader title="2. Perfil financiero" className="mb-0" />

                            <CampoMoneda
                                label="Renta líquida mensual"
                                valor={rentaLiquida}
                                onChange={setRentaLiquida}
                                placeholder="900.000"
                                ayuda="La mayoría de las entidades pide un mínimo entre $350.000 y $600.000."
                            />

                            <div>
                                <label className="mb-2 block text-xs font-medium text-[var(--fg-muted)]">
                                    Situación laboral
                                </label>
                                <PanelSegmentedToggle
                                    size="md"
                                    className="w-full [&>button]:flex-1"
                                    activeKey={tipoTrabajador}
                                    onChange={(key) => setTipoTrabajador(key as TipoTrabajador)}
                                    items={[
                                        { key: 'dependiente', label: 'Dependiente' },
                                        { key: 'independiente', label: 'Independiente' },
                                    ]}
                                />
                            </div>

                            <CampoMoneda
                                label="Otras deudas mensuales (opcional)"
                                valor={otrasDeudasMensuales}
                                onChange={setOtrasDeudasMensuales}
                                placeholder="0"
                                ayuda="Tarjetas, otros créditos de consumo, etc."
                            />
                        </PanelCard>
                    </div>

                    <div className="space-y-6 lg:col-span-3">
                        <PanelCard size="lg" className="text-center marketplace-flow-highlight">
                            <p className="mb-1 text-[11px] font-semibold uppercase text-[var(--color-success)]">
                                Cuota mensual estimada · mercado
                            </p>
                            <p className="text-4xl font-semibold tracking-tight text-[var(--fg)] sm:text-5xl">
                                {formatCLP(Math.round(escenarioMercado.cuotaTotalMensual))}
                            </p>
                            <p className="mt-2 text-xs text-[var(--fg-muted)]">
                                Incluye cuota de crédito + seguro de desgravamen estimado. Tasa referencial:{' '}
                                {formatPct(escenarioMercado.tasaMensual, 2)} mensual.
                            </p>
                        </PanelCard>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {resultado.escenarios.map((esc) => {
                                const destacado = esc.nivel === 'promedioMercado';
                                return (
                                    <PanelCard
                                        key={esc.nivel}
                                        size="sm"
                                        className={destacado ? 'marketplace-flow-highlight' : ''}
                                    >
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                                            {esc.etiqueta}
                                        </p>
                                        <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--fg)]">
                                            {formatCLP(Math.round(esc.cuotaTotalMensual))}
                                        </p>
                                        <p className="text-[10px] text-[var(--fg-muted)]">al mes</p>
                                        <div className="mt-3 space-y-1 text-xs text-[var(--fg-muted)]">
                                            <div className="flex justify-between gap-2">
                                                <span>Tasa mensual</span>
                                                <span className="tabular-nums text-[var(--fg)]">
                                                    {formatPct(esc.tasaMensual, 2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span>CAE referencial*</span>
                                                <span className="tabular-nums text-[var(--fg)]">
                                                    {formatPct(esc.caeReferencial, 1)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span>Costo total</span>
                                                <span className="tabular-nums text-[var(--fg)]">
                                                    {formatCLP(Math.round(esc.costoTotalCredito))}
                                                </span>
                                            </div>
                                        </div>
                                    </PanelCard>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-[var(--fg-muted)]">
                            *CAE referencial simplificado con fines comparativos. No reemplaza la Carga Anual
                            Equivalente legal que cada entidad debe informar en su oferta formal.
                        </p>

                        <PanelCard size="lg" className="space-y-3">
                            <PanelBlockHeader title="Monto máximo referencial" className="mb-0" />
                            <p className="text-2xl font-semibold tabular-nums text-[var(--fg)]">
                                {formatCLP(Math.round(resultado.montoMaximoReferencial))}
                            </p>
                            <p className="text-xs text-[var(--fg-muted)]">
                                Estimado usando el 30% de tu renta líquida menos otras deudas, a la tasa de mercado.
                                Cada entidad usa su propio modelo; este número es solo una referencia de techo
                                razonable.
                            </p>
                            {resultado.advertencias.map((adv) => (
                                <PanelNotice key={adv} tone="warning">
                                    {adv}
                                </PanelNotice>
                            ))}
                        </PanelCard>

                        <PanelCard size="lg" className="space-y-3">
                            <PanelBlockHeader title="Requisitos generales del mercado" className="mb-0" />
                            <ul className="space-y-2 text-sm text-[var(--fg-muted)]">
                                {REQUISITOS_GENERALES.map((req) => (
                                    <li key={req} className="flex items-start gap-2">
                                        <IconCheck size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                        <span>{req}</span>
                                    </li>
                                ))}
                            </ul>
                        </PanelCard>

                        <PanelButton
                            type="button"
                            variant="accent"
                            className="w-full justify-center"
                            onClick={handleSolicitar}
                        >
                            <IconBrandWhatsapp size={18} />
                            Quiero que me contacten con una evaluación real
                        </PanelButton>

                        <PanelNotice tone="neutral">
                            SimpleAutos es un marketplace de publicación y contacto. No es una entidad financiera ni
                            concesionaria: esta simulación es orientativa y no constituye una oferta, aprobación ni
                            compromiso de crédito.
                        </PanelNotice>
                    </div>
                </div>
            </div>
        </div>
    );
}
