'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    IconBrandWhatsapp,
    IconCalculator,
    IconDownload,
    IconRefresh,
} from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui/forms';
import {
    formatClPriceInput,
    parseDigits,
    SimplePublishPriceBlock,
} from '@simple/ui/simple-publish';
import {
    AlertasCompactas,
    BotonCTA,
    BotonSecundario,
    CampoMoneda,
    CampoNumero,
    CampoSlider,
    DatoCompacto,
    DisclaimerLegal,
    cargaMensaje,
    descargarSimulacionPdf,
    formatCLP,
    formatPct,
    formatUF,
    guardarEstadoSimulador,
    leerEstadoSimulador,
    limpiarEstadoSimulador,
    PanelPrincipal,
    ShellSimulador,
    TarjetaEscenario,
    TarjetaFormulario,
} from '@simple/simulador-ui';
import {
    simular,
    type ResultadoSimulacion,
    type TipoPropiedad,
    type TipoTrabajador,
    type TipoVivienda,
} from '@/lib/hipotecario/calculadora';
import type { ValorUFFuente } from '@/lib/hipotecario/fetch-uf';
import { VALOR_UF_REFERENCIAL } from '@/lib/hipotecario/tasas-referenciales';
import { SimuladorPropertyTypePicker } from '@/components/hipotecario/simulador-property-type-picker';

const STORAGE_KEY = 'simple.simulador.hipotecario.v4';
const CURRENCY_OPTIONS = [
    { value: 'UF', label: 'UF' },
    { value: 'CLP', label: 'CLP' },
];

type MonedaPrecio = 'UF' | 'CLP';

type EstadoPersistido = {
    monedaPrecio: MonedaPrecio;
    precioTexto: string;
    tipologia: string;
    tipoPropiedad: TipoPropiedad;
    tipoVivienda: TipoVivienda;
    financiamientoPct: number;
    plazoAnios: number;
    rentaLiquida: number;
    tipoTrabajador: TipoTrabajador;
    otrasDeudasMensuales: number;
    edad: number;
    tieneDicom: 'no' | 'si';
};

function estadoVacio(overrides?: Partial<EstadoPersistido>): EstadoPersistido {
    return {
        monedaPrecio: 'UF',
        precioTexto: '',
        tipologia: 'Departamento',
        tipoPropiedad: 'usada',
        tipoVivienda: 'primera',
        financiamientoPct: 80,
        plazoAnios: 25,
        rentaLiquida: 0,
        tipoTrabajador: 'dependiente',
        otrasDeudasMensuales: 0,
        edad: 0,
        tieneDicom: 'no',
        ...overrides,
    };
}

function parseMonto(texto: string): number {
    const digits = parseDigits(texto);
    return digits ? Number.parseInt(digits, 10) : 0;
}

function formatMontoTexto(valor: number, moneda: MonedaPrecio): string {
    if (!(valor > 0)) return '';
    if (moneda === 'CLP') return formatClPriceInput(String(valor));
    return String(valor);
}

function clpAUf(clp: number, valorUF: number): number {
    if (!(clp > 0) || !(valorUF > 0)) return 0;
    return Math.round(clp / valorUF);
}

function ufAClp(uf: number, valorUF: number): number {
    if (!(uf > 0) || !(valorUF > 0)) return 0;
    return Math.round(uf * valorUF);
}

/** Plazos hipotecarios habituales: 5, 10, 15, 20, 25, 30 años. */
function snapPlazoAnios(valor: number): number {
    if (!Number.isFinite(valor) || valor <= 0) return 25;
    const snapped = Math.round(valor / 5) * 5;
    return Math.min(30, Math.max(5, snapped));
}

interface SimuladorHipotecarioProps {
    onSolicitar?: (input: {
        valorPropiedad: number;
        financiamientoPct: number;
        plazoAnios: number;
        resultado: ResultadoSimulacion;
    }) => void;
    whatsappNumero?: string;
    valorUF?: number;
    valorUFFuente?: ValorUFFuente;
    initialPrecioUF?: number;
    initialPrecioCLP?: number;
    initialTipoPropiedad?: TipoPropiedad;
    listingTitle?: string;
    listingId?: string;
}

export default function SimuladorHipotecario({
    onSolicitar,
    whatsappNumero = '56978623828',
    valorUF = VALOR_UF_REFERENCIAL,
    valorUFFuente = 'referencial',
    initialPrecioUF,
    initialPrecioCLP,
    initialTipoPropiedad,
    listingTitle,
    listingId,
}: SimuladorHipotecarioProps) {
    const prefillUF = initialPrecioUF && initialPrecioUF > 0 ? Math.round(initialPrecioUF) : 0;
    const prefillCLP =
        initialPrecioCLP && initialPrecioCLP > 0 ? Math.round(initialPrecioCLP) : 0;
    const monedaInicial: MonedaPrecio = prefillUF > 0 ? 'UF' : prefillCLP > 0 ? 'CLP' : 'UF';
    const precioInicial =
        monedaInicial === 'UF'
            ? prefillUF || (prefillCLP > 0 ? clpAUf(prefillCLP, valorUF) : 0)
            : prefillCLP || (prefillUF > 0 ? ufAClp(prefillUF, valorUF) : 0);
    const tienePrefillListing = precioInicial > 0;

    const [estado, setEstado] = useState<EstadoPersistido>(() =>
        estadoVacio({
            monedaPrecio: monedaInicial,
            precioTexto: formatMontoTexto(precioInicial, monedaInicial),
            tipoPropiedad: initialTipoPropiedad ?? 'usada',
        }),
    );
    const [listoPersistencia, setListoPersistencia] = useState(false);
    const [descargandoPdf, setDescargandoPdf] = useState(false);

    const {
        monedaPrecio,
        precioTexto,
        tipologia,
        tipoPropiedad,
        tipoVivienda,
        financiamientoPct,
        plazoAnios,
        rentaLiquida,
        tipoTrabajador,
        otrasDeudasMensuales,
        edad,
        tieneDicom,
    } = estado;

    useEffect(() => {
        if (!tienePrefillListing) {
            const guardado = leerEstadoSimulador<EstadoPersistido>(STORAGE_KEY);
            if (guardado) {
                const moneda =
                    guardado.monedaPrecio === 'CLP' || guardado.monedaPrecio === 'UF'
                        ? guardado.monedaPrecio
                        : 'UF';
                setEstado(
                    estadoVacio({
                        ...guardado,
                        monedaPrecio: moneda,
                        precioTexto: String(guardado.precioTexto ?? ''),
                        tipologia: guardado.tipologia || 'Departamento',
                        financiamientoPct: Number(guardado.financiamientoPct) || 80,
                        plazoAnios: snapPlazoAnios(Number(guardado.plazoAnios) || 25),
                        rentaLiquida: Number(guardado.rentaLiquida) || 0,
                        otrasDeudasMensuales: Number(guardado.otrasDeudasMensuales) || 0,
                        edad: Number(guardado.edad) || 0,
                    }),
                );
            }
        }
        setListoPersistencia(true);
    }, [tienePrefillListing]);

    useEffect(() => {
        if (!listoPersistencia || tienePrefillListing) return;
        guardarEstadoSimulador(STORAGE_KEY, estado);
    }, [estado, listoPersistencia, tienePrefillListing]);

    const maxFinSlider = tipoVivienda === 'segunda' ? 70 : 90;
    const financiamientoEfectivo = Math.min(financiamientoPct, maxFinSlider);
    const precioValor = parseMonto(precioTexto);
    const tieneDatos = precioValor > 0;
    const precioUF =
        monedaPrecio === 'UF' ? precioValor : clpAUf(precioValor, valorUF);
    const valorPropiedadCLP =
        monedaPrecio === 'CLP' ? precioValor : ufAClp(precioValor, valorUF);
    const pieUF = precioUF * (1 - financiamientoEfectivo / 100);
    const montoUF = precioUF * (financiamientoEfectivo / 100);

    const resultado = useMemo(
        () =>
            simular({
                valorPropiedad: valorPropiedadCLP,
                tipoPropiedad,
                tipoVivienda,
                financiamientoPct: financiamientoEfectivo / 100,
                plazoAnios,
                rentaLiquida,
                tipoTrabajador,
                otrasDeudasMensuales,
                valorUF,
                edad,
                tieneDicom: tieneDicom === 'si',
            }),
        [
            valorPropiedadCLP,
            tipoPropiedad,
            tipoVivienda,
            financiamientoEfectivo,
            plazoAnios,
            rentaLiquida,
            tipoTrabajador,
            otrasDeudasMensuales,
            valorUF,
            edad,
            tieneDicom,
        ],
    );

    const mercado = resultado.escenarios[1];
    const montoMaxUF =
        valorUF > 0 ? resultado.montoMaximoReferencial / valorUF : 0;

    function patch(parcial: Partial<EstadoPersistido>) {
        setEstado((prev) => ({ ...prev, ...parcial }));
    }

    function handleMonedaPrecio(next: string) {
        const moneda = next === 'CLP' ? 'CLP' : 'UF';
        if (moneda === monedaPrecio) return;
        setEstado((prev) => {
            const actual = parseMonto(prev.precioTexto);
            const clp =
                prev.monedaPrecio === 'CLP' ? actual : ufAClp(actual, valorUF);
            const uf =
                prev.monedaPrecio === 'UF' ? actual : clpAUf(actual, valorUF);
            const convertido = moneda === 'UF' ? uf : clp;
            return {
                ...prev,
                monedaPrecio: moneda,
                precioTexto: formatMontoTexto(convertido, moneda),
            };
        });
    }

    function handleTipoVivienda(v: TipoVivienda) {
        if (v === 'segunda') {
            patch({ tipoVivienda: v, financiamientoPct: 70 });
            return;
        }
        patch({
            tipoVivienda: v,
            financiamientoPct: financiamientoPct < 80 ? 80 : financiamientoPct,
        });
    }

    function handleReiniciar() {
        limpiarEstadoSimulador(STORAGE_KEY);
        setEstado(
            estadoVacio({
                tipoPropiedad: initialTipoPropiedad ?? 'usada',
            }),
        );
    }

    function handleSolicitar() {
        if (!tieneDatos) return;
        if (onSolicitar) {
            onSolicitar({
                valorPropiedad: valorPropiedadCLP,
                financiamientoPct: financiamientoEfectivo / 100,
                plazoAnios,
                resultado,
            });
            return;
        }
        const mensaje = encodeURIComponent(
            `Hola SimplePropiedades, quiero simular un crédito hipotecario.\n` +
                (listingTitle ? `Publicación: ${listingTitle}\n` : '') +
                (listingId ? `ID: ${listingId}\n` : '') +
                `Tipo: ${tipologia} · ${tipoPropiedad === 'nueva' ? 'Nueva' : 'Usada'} · ${tipoVivienda === 'primera' ? '1ª vivienda' : '2ª vivienda'}\n` +
                `Valor: ${formatUF(precioUF, 0)} / ${formatCLP(valorPropiedadCLP)}\n` +
                `Financiamiento: ${financiamientoEfectivo}% · Pie: ${formatCLP(resultado.pieCLP)}\n` +
                `Plazo: ${plazoAnios} años · Dividendo est.: ${formatCLP(Math.round(mercado.dividendoTotalMensual))}/mes`,
        );
        window.open(`https://wa.me/${whatsappNumero}?text=${mensaje}`, '_blank', 'noopener,noreferrer');
    }

    async function handleDescargarPdf() {
        if (!tieneDatos) return;
        setDescargandoPdf(true);
        try {
            await descargarSimulacionPdf({
                marca: 'SimplePropiedades',
                titulo: 'Simulación crédito hipotecario',
                referencia: listingTitle
                    ? `${listingTitle}${listingId ? ` (${listingId})` : ''}`
                    : undefined,
                resumen: {
                    etiqueta: 'Dividendo estimado · mercado',
                    valor: formatCLP(Math.round(mercado.dividendoTotalMensual)),
                    detalle: `${cargaMensaje(resultado.cargaFinanciera.nivel)} (${formatPct(resultado.cargaFinanciera.porcentajeSobreRenta, 0)})`,
                },
                secciones: [
                    {
                        titulo: 'Propiedad y crédito',
                        filas: [
                            { label: 'Tipo inmueble', valor: tipologia },
                            {
                                label: 'Condición / uso',
                                valor: `${tipoPropiedad === 'nueva' ? 'Nueva' : 'Usada'} · ${tipoVivienda === 'primera' ? '1ª vivienda' : '2ª vivienda'}`,
                            },
                            {
                                label: 'Valor propiedad',
                                valor: `${formatUF(precioUF, 0)} / ${formatCLP(valorPropiedadCLP)}`,
                            },
                            { label: 'Financiamiento', valor: `${financiamientoEfectivo}%` },
                            {
                                label: 'Pie',
                                valor: `${formatUF(pieUF, 0)} / ${formatCLP(resultado.pieCLP)}`,
                            },
                            {
                                label: 'Monto a financiar',
                                valor: `${formatUF(montoUF, 0)} / ${formatCLP(resultado.montoAFinanciar)}`,
                            },
                            { label: 'Plazo', valor: `${plazoAnios} años` },
                            {
                                label: 'UF del cálculo',
                                valor: `${valorUF.toLocaleString('es-CL')}${valorUFFuente === 'referencial' ? ' (ref.)' : ''}`,
                            },
                        ],
                    },
                    {
                        titulo: 'Perfil',
                        filas: [
                            { label: 'Renta líquida', valor: formatCLP(rentaLiquida) },
                            {
                                label: 'Trabajo',
                                valor:
                                    tipoTrabajador === 'dependiente'
                                        ? 'Dependiente'
                                        : 'Independiente',
                            },
                            { label: 'Edad', valor: edad > 0 ? `${edad} años` : '—' },
                            {
                                label: 'DICOM / protestos',
                                valor: tieneDicom === 'si' ? 'Sí' : 'No',
                            },
                            {
                                label: 'Otras deudas / mes',
                                valor: formatCLP(otrasDeudasMensuales),
                            },
                            {
                                label: 'Monto máx. referencial',
                                valor: `${formatUF(montoMaxUF, 0)} (≈ ${formatCLP(Math.round(resultado.montoMaximoReferencial))})`,
                            },
                        ],
                    },
                    {
                        titulo: 'Escenarios (dividendo CLP / mes)',
                        filas: resultado.escenarios.map((esc) => ({
                            label: `${esc.etiqueta} · ${formatPct(esc.tasaAnual, 2)}`,
                            valor: formatCLP(Math.round(esc.dividendoTotalMensual)),
                        })),
                    },
                ],
                advertencias: resultado.advertencias,
                disclaimer:
                    'Estimación orientativa. No constituye oferta ni aprobación de crédito. SimplePropiedades no es entidad financiera.',
                nombreArchivo: `simulacion-hipotecaria-${new Date().toISOString().slice(0, 10)}.pdf`,
            });
        } finally {
            setDescargandoPdf(false);
        }
    }

    const currencySlot = (
        <ModernSelect
            value={monedaPrecio}
            onChange={handleMonedaPrecio}
            options={CURRENCY_OPTIONS}
            placeholder="Moneda"
            ariaLabel="Seleccionar moneda"
        />
    );

    return (
        <ShellSimulador
            eyebrow="Simulador"
            titulo="Crédito hipotecario"
            subtitle="Estimación orientativa · no es aprobación"
            meta={
                <div className="flex items-center gap-3 text-[var(--fg-muted)]">
                    <span title={valorUFFuente === 'vivo' ? 'UF del día' : 'UF referencial (fallback)'}>
                        UF {valorUF.toLocaleString('es-CL')}
                        {valorUFFuente === 'referencial' ? ' · ref.' : ''}
                    </span>
                    {tieneDatos ? (
                        <span className="inline-flex items-center gap-1 text-[var(--fg)]">
                            <IconCalculator size={14} className="text-[var(--accent)]" />
                            {formatCLP(Math.round(mercado.dividendoTotalMensual))}/mes
                        </span>
                    ) : null}
                </div>
            }
        >
            {listingTitle ? (
                <p className="mb-4 text-sm text-[var(--fg-muted)]">
                    Referencia: <span className="font-medium text-[var(--fg)]">{listingTitle}</span>
                </p>
            ) : null}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
                <TarjetaFormulario>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--fg-muted)]">Tus datos</p>
                        <button
                            type="button"
                            onClick={handleReiniciar}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                        >
                            <IconRefresh size={15} />
                            Reiniciar
                        </button>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-[var(--fg)]">
                            Tipo de propiedad
                        </label>
                        <SimuladorPropertyTypePicker
                            value={tipologia}
                            onChange={(v) => patch({ tipologia: v })}
                        />
                    </div>

                    <div className="space-y-3">
                        <SimplePublishPriceBlock
                            mainPrice={precioTexto}
                            onMainPriceChange={(value) => patch({ precioTexto: value })}
                            mainPriceLabel="Valor propiedad"
                            mainPricePlaceholder={monedaPrecio === 'UF' ? '3200' : '120000000'}
                            formatThousands={monedaPrecio === 'CLP'}
                            mainPriceInputMode={monedaPrecio === 'UF' ? 'number' : 'text'}
                            currencySlot={currencySlot}
                            showOffer={false}
                        />
                        {tieneDatos ? (
                            <p className="text-xs text-[var(--fg-muted)]">
                                {monedaPrecio === 'UF'
                                    ? `≈ ${formatCLP(valorPropiedadCLP)}`
                                    : `≈ ${formatUF(precioUF, 0)}`}
                            </p>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--fg)]">
                                Condición
                            </label>
                            <ModernSelect
                                value={tipoPropiedad}
                                onChange={(v) =>
                                    patch({ tipoPropiedad: v === 'nueva' ? 'nueva' : 'usada' })
                                }
                                options={[
                                    { value: 'usada', label: 'Usada' },
                                    { value: 'nueva', label: 'Nueva' },
                                ]}
                                ariaLabel="Condición de la propiedad"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--fg)]">
                                Uso
                            </label>
                            <ModernSelect
                                value={tipoVivienda}
                                onChange={(v) =>
                                    handleTipoVivienda(v === 'segunda' ? 'segunda' : 'primera')
                                }
                                options={[
                                    { value: 'primera', label: '1ª vivienda' },
                                    { value: 'segunda', label: '2ª vivienda' },
                                ]}
                                ariaLabel="Uso de la vivienda"
                            />
                        </div>
                    </div>

                    <CampoSlider
                        label="Financiamiento"
                        valorTexto={`${financiamientoEfectivo}%`}
                        min={50}
                        max={maxFinSlider}
                        step={5}
                        valor={financiamientoEfectivo}
                        onChange={(v) => patch({ financiamientoPct: v })}
                        pie={
                            <span className="text-[var(--fg-muted)]">
                                {tieneDatos
                                    ? monedaPrecio === 'UF'
                                        ? `Pie ${formatUF(pieUF, 0)} · ${formatCLP(resultado.pieCLP)}`
                                        : `Pie ${formatCLP(resultado.pieCLP)} · ${formatUF(pieUF, 0)}`
                                    : 'Pie —'}
                            </span>
                        }
                    />

                    <CampoSlider
                        label="Plazo"
                        valorTexto={`${plazoAnios} años`}
                        min={5}
                        max={30}
                        step={5}
                        valor={plazoAnios}
                        onChange={(v) => patch({ plazoAnios: snapPlazoAnios(v) })}
                    />

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <CampoMoneda
                            label="Renta líquida"
                            valor={rentaLiquida}
                            onChange={(v) => patch({ rentaLiquida: v })}
                            placeholder="Ej: 1.600.000"
                            ayuda={
                                tipoTrabajador === 'independiente'
                                    ? 'Se usa ~65% de tu renta (habitual en bancos).'
                                    : undefined
                            }
                        />
                        <CampoNumero
                            label="Edad"
                            valor={edad}
                            min={18}
                            max={80}
                            onChange={(v) => patch({ edad: v })}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--fg)]">
                                Trabajo
                            </label>
                            <ModernSelect
                                value={tipoTrabajador}
                                onChange={(v) =>
                                    patch({
                                        tipoTrabajador:
                                            v === 'independiente' ? 'independiente' : 'dependiente',
                                    })
                                }
                                options={[
                                    { value: 'dependiente', label: 'Dependiente' },
                                    { value: 'independiente', label: 'Independiente' },
                                ]}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--fg)]">
                                DICOM / protestos
                            </label>
                            <ModernSelect
                                value={tieneDicom}
                                onChange={(v) => patch({ tieneDicom: v === 'si' ? 'si' : 'no' })}
                                options={[
                                    { value: 'no', label: 'No' },
                                    { value: 'si', label: 'Sí' },
                                ]}
                            />
                        </div>
                    </div>

                    <CampoMoneda
                        label="Otras deudas / mes"
                        valor={otrasDeudasMensuales}
                        onChange={(v) => patch({ otrasDeudasMensuales: v })}
                        placeholder="0"
                    />
                </TarjetaFormulario>

                <div className="space-y-5 lg:col-span-3 lg:pt-1">
                    {tieneDatos ? (
                        <>
                            <PanelPrincipal
                                etiqueta="Dividendo estimado · mercado"
                                valorPrincipal={formatCLP(
                                    Math.round(mercado.dividendoTotalMensual),
                                )}
                                nivelCarga={resultado.cargaFinanciera.nivel}
                                porcentajeSobreRenta={formatPct(
                                    resultado.cargaFinanciera.porcentajeSobreRenta,
                                    0,
                                )}
                                desglose={[
                                    {
                                        label: 'Crédito',
                                        valor: formatCLP(Math.round(mercado.dividendoCredito)),
                                    },
                                    {
                                        label: 'Desgravamen',
                                        valor: formatCLP(
                                            Math.round(mercado.seguroDesgravamenMensual),
                                        ),
                                    },
                                    {
                                        label: 'Incendio/sismo',
                                        valor: formatCLP(
                                            Math.round(mercado.seguroIncendioSismoMensual),
                                        ),
                                    },
                                ]}
                            />

                            <p className="text-center text-xs text-[var(--fg-muted)]">
                                {tipologia} · tasa {formatPct(mercado.tasaAnual, 2)} anual UF
                            </p>

                            <div className="grid grid-cols-3 gap-3">
                                {resultado.escenarios.map((esc) => (
                                    <TarjetaEscenario
                                        key={esc.nivel}
                                        etiqueta={esc.etiqueta}
                                        destacada={esc.nivel === 'promedioMercado'}
                                        valorPrincipal={formatCLP(
                                            Math.round(esc.dividendoTotalMensual),
                                        )}
                                        detalle={`${formatPct(esc.tasaAnual, 2)} · CAE ${formatPct(esc.caeReferencial, 1)}`}
                                    />
                                ))}
                            </div>

                            <DatoCompacto
                                label="Monto máx. referencial"
                                valor={formatUF(montoMaxUF, 0)}
                                hint={
                                    tipoTrabajador === 'independiente'
                                        ? `≈ ${formatCLP(Math.round(resultado.montoMaximoReferencial))} · ~65% renta`
                                        : `≈ ${formatCLP(Math.round(resultado.montoMaximoReferencial))}`
                                }
                            />

                            <AlertasCompactas items={resultado.advertencias} />

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <BotonSecundario
                                    onClick={handleDescargarPdf}
                                    disabled={descargandoPdf}
                                >
                                    <IconDownload size={18} />
                                    {descargandoPdf ? 'Generando…' : 'Descargar PDF'}
                                </BotonSecundario>
                                <BotonCTA onClick={handleSolicitar}>
                                    <IconBrandWhatsapp size={18} />
                                    Pedir evaluación
                                </BotonCTA>
                            </div>
                        </>
                    ) : (
                        <div className="marketplace-flow-section flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
                            <IconCalculator size={22} className="text-[var(--accent)]" />
                            <p className="text-sm font-medium text-[var(--fg)]">
                                Ingresa el valor de la propiedad
                            </p>
                            <p className="max-w-sm text-xs text-[var(--fg-muted)]">
                                Elige tipo, UF o pesos, y verás el dividendo en pesos chilenos.
                            </p>
                        </div>
                    )}

                    <DisclaimerLegal texto="Estimación orientativa. SimplePropiedades no es entidad financiera." />
                </div>
            </div>
        </ShellSimulador>
    );
}
