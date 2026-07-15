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
    guardarEstadoSimulador,
    leerEstadoSimulador,
    limpiarEstadoSimulador,
    PanelPrincipal,
    ShellSimulador,
    TarjetaEscenario,
    TarjetaFormulario,
} from '@simple/simulador-ui';
import {
    estimarPieYPlazoSugeridos,
    simular,
    type ResultadoSimulacion,
    type TipoTrabajador,
    type TipoVehiculo,
} from '@/lib/financiamiento/calculadora';
import {
    getBrandsForVehicleType,
    getModelsForBrand,
    loadPublishWizardCatalog,
    type PublishWizardCatalog,
    type VehicleCatalogType,
} from '@/lib/publish-wizard-catalog';
import {
    labelForVehicleType,
    SimuladorVehicleTypePicker,
} from '@/components/financiamiento/simulador-vehicle-type-picker';

const ANIO_ACTUAL = new Date().getFullYear();
const STORAGE_KEY = 'simple.simulador.automotriz.v3';
const YEAR_OPTIONS = Array.from({ length: ANIO_ACTUAL - 1990 + 1 }, (_, index) => {
    const year = String(ANIO_ACTUAL - index);
    return { value: year, label: year };
});

type EstadoPersistido = {
    vehicleType: VehicleCatalogType;
    brandId: string;
    modelId: string;
    customBrand: string;
    customModel: string;
    precioTexto: string;
    tipoVehiculo: TipoVehiculo;
    anioVehiculo: number;
    pieMonto: number;
    plazoMeses: number;
    rentaLiquida: number;
    tipoTrabajador: TipoTrabajador;
    otrasDeudasMensuales: number;
    edad: number;
    tieneDicom: 'no' | 'si';
};

function parseMonto(texto: string): number {
    const digits = parseDigits(texto);
    return digits ? Number.parseInt(digits, 10) : 0;
}

function formatMontoTexto(valor: number): string {
    if (!(valor > 0)) return '';
    return formatClPriceInput(String(valor));
}

function estadoVacio(overrides?: Partial<EstadoPersistido>): EstadoPersistido {
    return {
        vehicleType: 'car',
        brandId: '',
        modelId: '',
        customBrand: '',
        customModel: '',
        precioTexto: '',
        tipoVehiculo: 'usado',
        anioVehiculo: 0,
        pieMonto: 0,
        plazoMeses: 48,
        rentaLiquida: 0,
        tipoTrabajador: 'dependiente',
        otrasDeudasMensuales: 0,
        edad: 0,
        tieneDicom: 'no',
        ...overrides,
    };
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

export default function SimuladorCreditoAuto({
    onSolicitar,
    whatsappNumero = '56978623828',
    initialPrecio,
    initialAnio,
    initialTipoVehiculo,
    listingTitle,
    listingId,
}: SimuladorCreditoAutoProps) {
    const tienePrefillListing = Boolean(initialPrecio && initialPrecio > 0);
    const tipoInicial = initialTipoVehiculo ?? 'usado';
    const anioInicial =
        initialAnio && initialAnio >= 1990 && initialAnio <= ANIO_ACTUAL
            ? initialAnio
            : 0;
    const precioInicial = tienePrefillListing ? initialPrecio! : 0;

    const [estado, setEstado] = useState<EstadoPersistido>(() =>
        estadoVacio({
            precioTexto: formatMontoTexto(precioInicial),
            tipoVehiculo: tipoInicial,
            anioVehiculo: anioInicial,
            pieMonto:
                precioInicial > 0
                    ? Math.round(precioInicial * pieInicialPct(tipoInicial))
                    : 0,
        }),
    );
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [listoPersistencia, setListoPersistencia] = useState(false);
    const [descargandoPdf, setDescargandoPdf] = useState(false);

    const {
        vehicleType,
        brandId,
        modelId,
        customBrand,
        customModel,
        precioTexto,
        tipoVehiculo,
        anioVehiculo,
        pieMonto,
        plazoMeses,
        rentaLiquida,
        tipoTrabajador,
        otrasDeudasMensuales,
        edad,
        tieneDicom,
    } = estado;

    useEffect(() => {
        let cancelled = false;
        void loadPublishWizardCatalog().then((next) => {
            if (!cancelled) setCatalog(next);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!tienePrefillListing) {
            const guardado = leerEstadoSimulador<EstadoPersistido>(STORAGE_KEY);
            if (guardado) {
                setEstado(
                    estadoVacio({
                        ...guardado,
                        precioTexto: String(guardado.precioTexto ?? ''),
                        brandId: String(guardado.brandId ?? ''),
                        modelId: String(guardado.modelId ?? ''),
                        customBrand: String(guardado.customBrand ?? ''),
                        customModel: String(guardado.customModel ?? ''),
                        anioVehiculo: Number(guardado.anioVehiculo) || 0,
                        pieMonto: Number(guardado.pieMonto) || 0,
                        plazoMeses: Number(guardado.plazoMeses) || 48,
                        rentaLiquida: Number(guardado.rentaLiquida) || 0,
                        otrasDeudasMensuales: Number(guardado.otrasDeudasMensuales) || 0,
                        edad: Number(guardado.edad) || 0,
                        vehicleType: (guardado.vehicleType as VehicleCatalogType) || 'car',
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

    const precioVehiculo = parseMonto(precioTexto);
    const tieneDatos = precioVehiculo > 0;
    const pieEfectivoPct = precioVehiculo > 0 ? pieMonto / precioVehiculo : 0;

    const brands = catalog ? getBrandsForVehicleType(catalog, vehicleType) : [];
    const models =
        catalog && brandId && brandId !== '__custom__'
            ? getModelsForBrand(catalog, brandId, vehicleType)
            : [];

    const brandLabel =
        brandId === '__custom__'
            ? customBrand.trim() || 'Marca personalizada'
            : brands.find((b) => b.id === brandId)?.name || '';
    const modelLabel =
        modelId === '__custom__'
            ? customModel.trim() || 'Modelo personalizado'
            : models.find((m) => m.id === modelId)?.name ||
              catalog?.models.find((m) => m.id === modelId)?.name ||
              '';

    function patch(parcial: Partial<EstadoPersistido>) {
        setEstado((prev) => ({ ...prev, ...parcial }));
    }

    function syncPrecioYPie(next: {
        precioTexto?: string;
        tipo?: TipoVehiculo;
        anio?: number;
        tipoTrabajador?: TipoTrabajador;
        tieneDicom?: 'no' | 'si';
        edad?: number;
        resetPiePct?: boolean;
    }) {
        setEstado((prev) => {
            const precio = parseMonto(next.precioTexto ?? prev.precioTexto);
            const tipo = next.tipo ?? prev.tipoVehiculo;
            const anio = next.anio ?? prev.anioVehiculo;
            const trabajador = next.tipoTrabajador ?? prev.tipoTrabajador;
            const dicom = next.tieneDicom ?? prev.tieneDicom;
            const edadNext = next.edad ?? prev.edad;
            const perfil = estimarPieYPlazoSugeridos({
                tipoVehiculo: tipo,
                anioVehiculo: anio || ANIO_ACTUAL - 4,
                tipoTrabajador: trabajador,
                tieneDicom: dicom === 'si',
                edad: edadNext || 35,
            });

            const precioPrev = parseMonto(prev.precioTexto);
            let piePct = perfil.pieMinimoSugeridoPct;
            if (!next.resetPiePct && precioPrev > 0) {
                const actualPct = prev.pieMonto / precioPrev;
                // Solo sube el pie si queda bajo el habitual del nuevo perfil.
                piePct =
                    actualPct + 0.001 < perfil.pieMinimoSugeridoPct
                        ? perfil.pieMinimoSugeridoPct
                        : actualPct;
            }

            return {
                ...prev,
                precioTexto: next.precioTexto ?? prev.precioTexto,
                tipoVehiculo: tipo,
                anioVehiculo: anio,
                tipoTrabajador: trabajador,
                tieneDicom: dicom,
                edad: edadNext,
                pieMonto: Math.round(precio * piePct),
                plazoMeses: Math.min(
                    Math.max(prev.plazoMeses, 12),
                    perfil.plazoMaxSugerido,
                ),
            };
        });
    }

    const resultado = useMemo(
        () =>
            simular({
                precioVehiculo,
                tipoVehiculo,
                anioVehiculo: anioVehiculo || ANIO_ACTUAL - 4,
                pieMonto,
                plazoMeses,
                rentaLiquida,
                tipoTrabajador,
                otrasDeudasMensuales,
                edad,
                tieneDicom: tieneDicom === 'si',
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
            edad,
            tieneDicom,
        ],
    );

    const mercado = resultado.escenarios[1];
    const pieBajoSugerido =
        tieneDatos && pieEfectivoPct + 0.001 < resultado.pieMinimoSugeridoPct;

    function aplicarPieSugerido() {
        if (!(precioVehiculo > 0)) return;
        patch({
            pieMonto: Math.round(precioVehiculo * resultado.pieMinimoSugeridoPct),
            plazoMeses: Math.min(plazoMeses, resultado.plazoMaxSugerido),
        });
    }

    function handleReiniciar() {
        limpiarEstadoSimulador(STORAGE_KEY);
        setEstado(
            estadoVacio({
                tipoVehiculo: initialTipoVehiculo ?? 'usado',
            }),
        );
    }

    function handleSolicitar() {
        if (!tieneDatos) return;
        if (onSolicitar) {
            onSolicitar({ precioVehiculo, pieMonto, plazoMeses, resultado });
            return;
        }
        const vehiculoLine = [
            labelForVehicleType(vehicleType),
            brandLabel,
            modelLabel,
            tipoVehiculo === 'nuevo' ? 'Nuevo' : anioVehiculo ? `Usado ${anioVehiculo}` : 'Usado',
        ]
            .filter(Boolean)
            .join(' · ');
        const mensaje = encodeURIComponent(
            `Hola SimpleAutos, quiero una evaluación comercial de crédito automotriz.\n` +
                (listingTitle ? `Publicación: ${listingTitle}\n` : '') +
                (listingId ? `ID: ${listingId}\n` : '') +
                `Vehículo: ${vehiculoLine}\n` +
                `Precio: ${formatCLP(precioVehiculo)}\n` +
                `Pie simulado: ${formatCLP(pieMonto)} (${formatPct(pieEfectivoPct, 0)}; habitual ~${formatPct(resultado.pieMinimoSugeridoPct, 0)})\n` +
                `Plazo: ${plazoMeses} meses · Cuota est.: ${formatCLP(mercado.cuotaTotalMensual)}/mes\n` +
                `Nota: simulación referencial, sujeta a evaluación.`,
        );
        window.open(`https://wa.me/${whatsappNumero}?text=${mensaje}`, '_blank', 'noopener,noreferrer');
    }

    async function handleDescargarPdf() {
        if (!tieneDatos) return;
        setDescargandoPdf(true);
        try {
            await descargarSimulacionPdf({
                marca: 'SimpleAutos',
                titulo: 'Simulación crédito automotriz',
                referencia: listingTitle
                    ? `${listingTitle}${listingId ? ` (${listingId})` : ''}`
                    : undefined,
                resumen: {
                    etiqueta: 'Cuota estimada · mercado',
                    valor: formatCLP(Math.round(mercado.cuotaTotalMensual)),
                    detalle: `${cargaMensaje(resultado.cargaFinanciera.nivel)} (${formatPct(resultado.cargaFinanciera.porcentajeSobreRenta, 0)})`,
                },
                secciones: [
                    {
                        titulo: 'Vehículo y crédito',
                        filas: [
                            { label: 'Tipo', valor: labelForVehicleType(vehicleType) },
                            { label: 'Marca', valor: brandLabel || '—' },
                            { label: 'Modelo', valor: modelLabel || '—' },
                            {
                                label: 'Condición',
                                valor:
                                    tipoVehiculo === 'nuevo'
                                        ? 'Nuevo'
                                        : `Usado${anioVehiculo ? ` · ${anioVehiculo}` : ''}`,
                            },
                            { label: 'Precio', valor: formatCLP(precioVehiculo) },
                            {
                                label: 'Pie',
                                valor: `${formatCLP(pieMonto)} (${formatPct(pieEfectivoPct, 0)})`,
                            },
                            {
                                label: 'Monto a financiar',
                                valor: formatCLP(resultado.montoAFinanciar),
                            },
                            { label: 'Plazo', valor: `${plazoMeses} meses` },
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
                                label: 'Antecedentes comerciales',
                                valor: tieneDicom === 'si' ? 'Sí (evaluación caso a caso)' : 'No',
                            },
                            {
                                label: 'Otras deudas / mes',
                                valor: formatCLP(otrasDeudasMensuales),
                            },
                            {
                                label: 'Pie habitual sugerido',
                                valor: formatPct(resultado.pieMinimoSugeridoPct, 0),
                            },
                            {
                                label: 'Monto máx. referencial',
                                valor: formatCLP(Math.round(resultado.montoMaximoReferencial)),
                            },
                        ],
                    },
                    {
                        titulo: 'Escenarios (cuota total / mes)',
                        filas: resultado.escenarios.map((esc) => ({
                            label: `${esc.etiqueta} · ${formatPct(esc.tasaMensual, 2)} m.`,
                            valor: formatCLP(Math.round(esc.cuotaTotalMensual)),
                        })),
                    },
                ],
                advertencias: resultado.advertencias,
                disclaimer:
                    'Estimación orientativa. No constituye oferta ni aprobación de crédito. Tasas, pie y plazos varían por financiera y evaluación comercial (incluye antecedentes CMF/DICOM). SimpleAutos no es entidad financiera.',
                nombreArchivo: `simulacion-automotriz-${new Date().toISOString().slice(0, 10)}.pdf`,
            });
        } finally {
            setDescargandoPdf(false);
        }
    }

    return (
        <ShellSimulador
            eyebrow="Simulador"
            titulo="Crédito automotriz"
            subtitle="Estimación orientativa · no es aprobación"
            meta={
                tieneDatos ? (
                    <div className="flex items-center gap-1.5">
                        <IconCalculator size={14} className="text-[var(--accent)]" />
                        <span>{formatCLP(Math.round(mercado.cuotaTotalMensual))}/mes</span>
                    </div>
                ) : undefined
            }
        >
            {listingTitle ? (
                <p className="mb-4 text-sm text-[var(--fg-muted)]">
                    Referencia: <span className="font-medium text-[var(--fg)]">{listingTitle}</span>
                </p>
            ) : null}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                <TarjetaFormulario>
                    <div className="flex items-center justify-between gap-2 pb-1">
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

                    <div className="min-w-0 space-y-1.5">
                        <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                            Tipo de vehículo
                        </label>
                        <SimuladorVehicleTypePicker
                            value={vehicleType}
                            onChange={(value) =>
                                patch({
                                    vehicleType: value,
                                    brandId: '',
                                    modelId: '',
                                    customBrand: '',
                                    customModel: '',
                                })
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        <div className="min-w-0 space-y-1.5">
                            <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                                Marca
                            </label>
                            <ModernSelect
                                value={brandId}
                                onChange={(v) =>
                                    patch({
                                        brandId: v,
                                        modelId: '',
                                        customModel: '',
                                        customBrand: v === '__custom__' ? customBrand : '',
                                    })
                                }
                                options={[
                                    { value: '', label: 'Seleccionar' },
                                    ...brands.map((b) => ({ value: b.id, label: b.name })),
                                    { value: '__custom__', label: 'Otra marca' },
                                ]}
                            />
                            {brandId === '__custom__' ? (
                                <input
                                    type="text"
                                    placeholder="Nombre marca"
                                    value={customBrand}
                                    onChange={(e) => patch({ customBrand: e.target.value })}
                                    className="form-input mt-2"
                                />
                            ) : null}
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                                Modelo
                            </label>
                            <ModernSelect
                                value={modelId}
                                onChange={(v) =>
                                    patch({
                                        modelId: v,
                                        customModel: v === '__custom__' ? customModel : '',
                                    })
                                }
                                disabled={!brandId}
                                options={[
                                    {
                                        value: '',
                                        label: brandId ? 'Seleccionar' : 'Primero marca',
                                    },
                                    ...models.map((m) => ({ value: m.id, label: m.name })),
                                    { value: '__custom__', label: 'Otro modelo' },
                                ]}
                            />
                            {modelId === '__custom__' ? (
                                <input
                                    type="text"
                                    placeholder="Nombre modelo"
                                    value={customModel}
                                    onChange={(e) => patch({ customModel: e.target.value })}
                                    className="form-input mt-2"
                                />
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-end">
                        <div className="min-w-0 space-y-1.5">
                            <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                                Condición
                            </label>
                            <ModernSelect
                                value={tipoVehiculo}
                                onChange={(v) => {
                                    const tipo = v === 'nuevo' ? 'nuevo' : 'usado';
                                    syncPrecioYPie({
                                        tipo,
                                        anio: tipo === 'nuevo' ? ANIO_ACTUAL : anioVehiculo,
                                        resetPiePct: true,
                                    });
                                }}
                                options={[
                                    { value: 'usado', label: 'Usado' },
                                    { value: 'nuevo', label: 'Nuevo' },
                                ]}
                            />
                        </div>
                        {tipoVehiculo === 'usado' ? (
                            <div className="min-w-0 space-y-1.5">
                                <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                                    Año
                                </label>
                                <ModernSelect
                                    value={anioVehiculo ? String(anioVehiculo) : ''}
                                    onChange={(value) =>
                                        syncPrecioYPie({
                                            anio: Number.parseInt(value, 10) || 0,
                                            resetPiePct: true,
                                        })
                                    }
                                    options={[
                                        { value: '', label: 'Seleccionar' },
                                        ...YEAR_OPTIONS,
                                    ]}
                                />
                            </div>
                        ) : null}
                    </div>

                    <SimplePublishPriceBlock
                        mainPrice={precioTexto}
                        onMainPriceChange={(value) => syncPrecioYPie({ precioTexto: value })}
                        mainPriceLabel="Precio del vehículo"
                        mainPricePlaceholder="12500000"
                        formatThousands
                        showOffer={false}
                    />

                    {tieneDatos ? (
                        <div className="space-y-2">
                            <CampoSlider
                                label="Pie"
                                valorTexto={formatPct(pieEfectivoPct, 0)}
                                min={0}
                                max={precioVehiculo}
                                step={50_000}
                                valor={Math.min(pieMonto, precioVehiculo)}
                                onChange={(v) => patch({ pieMonto: v })}
                                pie={
                                    <span className="text-[var(--fg-muted)]">
                                        {formatCLP(pieMonto)}
                                    </span>
                                }
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--fg-muted)]">
                                <span>
                                    Habitual para este perfil:{' '}
                                    <span className="font-medium text-[var(--fg)]">
                                        ~{formatPct(resultado.pieMinimoSugeridoPct, 0)}
                                    </span>
                                </span>
                                {pieBajoSugerido ? (
                                    <button
                                        type="button"
                                        onClick={aplicarPieSugerido}
                                        className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                                    >
                                        Usar pie sugerido
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <CampoSlider
                        label="Plazo"
                        valorTexto={`${plazoMeses} meses`}
                        min={12}
                        max={resultado.plazoMaxSugerido}
                        step={6}
                        valor={Math.min(plazoMeses, resultado.plazoMaxSugerido)}
                        onChange={(v) => patch({ plazoMeses: v })}
                    />

                    <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-end">
                            <CampoMoneda
                                label="Renta líquida"
                                valor={rentaLiquida}
                                onChange={(v) => patch({ rentaLiquida: v })}
                                placeholder="Ej: 900.000"
                            />
                            <CampoNumero
                                label="Edad"
                                valor={edad}
                                min={18}
                                max={80}
                                placeholder="35"
                                onChange={(v) => patch({ edad: v })}
                            />
                        </div>
                        {tipoTrabajador === 'independiente' ? (
                            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
                                Independiente: se usa ~60% de tu renta (habitual en bancos).
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-end">
                            <div className="min-w-0 space-y-1.5">
                                <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                                    Trabajo
                                </label>
                                <ModernSelect
                                    value={tipoTrabajador}
                                    onChange={(v) =>
                                        syncPrecioYPie({
                                            tipoTrabajador:
                                                v === 'independiente'
                                                    ? 'independiente'
                                                    : 'dependiente',
                                        })
                                    }
                                    options={[
                                        { value: 'dependiente', label: 'Dependiente' },
                                        { value: 'independiente', label: 'Independiente' },
                                    ]}
                                />
                            </div>
                            <div className="min-w-0 space-y-1.5">
                                <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                                    DICOM / protestos
                                </label>
                                <ModernSelect
                                    value={tieneDicom}
                                    onChange={(v) =>
                                        syncPrecioYPie({
                                            tieneDicom: v === 'si' ? 'si' : 'no',
                                        })
                                    }
                                    options={[
                                        { value: 'no', label: 'No' },
                                        { value: 'si', label: 'Sí' },
                                    ]}
                                />
                            </div>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
                            Antecedentes comerciales: no es un rechazo automático; se evalúa caso a
                            caso.
                        </p>
                    </div>

                    <CampoMoneda
                        label="Otras deudas / mes"
                        valor={otrasDeudasMensuales}
                        onChange={(v) => patch({ otrasDeudasMensuales: v })}
                        placeholder="0"
                    />
                </TarjetaFormulario>

                <div className="space-y-4 lg:col-span-3">
                    {tieneDatos ? (
                        <>
                            {(brandLabel || modelLabel) && (
                                <p className="text-sm text-[var(--fg-muted)]">
                                    Simulando:{' '}
                                    <span className="font-medium text-[var(--fg)]">
                                        {[labelForVehicleType(vehicleType), brandLabel, modelLabel]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </span>
                                </p>
                            )}

                            <PanelPrincipal
                                etiqueta="Cuota estimada · mercado"
                                valorPrincipal={formatCLP(Math.round(mercado.cuotaTotalMensual))}
                                nivelCarga={resultado.cargaFinanciera.nivel}
                                porcentajeSobreRenta={formatPct(
                                    resultado.cargaFinanciera.porcentajeSobreRenta,
                                    0,
                                )}
                                desglose={[
                                    {
                                        label: 'Crédito',
                                        valor: formatCLP(Math.round(mercado.cuotaCredito)),
                                    },
                                    {
                                        label: 'Desgravamen',
                                        valor: formatCLP(
                                            Math.round(mercado.seguroDesgravamenMensual),
                                        ),
                                    },
                                    {
                                        label: 'Cesantía',
                                        valor: formatCLP(Math.round(mercado.seguroCesantiaMensual)),
                                    },
                                ]}
                            />

                            <div className="grid grid-cols-3 gap-3">
                                {resultado.escenarios.map((esc) => (
                                    <TarjetaEscenario
                                        key={esc.nivel}
                                        etiqueta={esc.etiqueta}
                                        destacada={esc.nivel === 'promedioMercado'}
                                        valorPrincipal={formatCLP(
                                            Math.round(esc.cuotaTotalMensual),
                                        )}
                                        detalle={`${formatPct(esc.tasaMensual, 2)} · CAE ${formatPct(esc.caeReferencial, 1)}`}
                                    />
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <DatoCompacto
                                    label="Pie habitual sugerido"
                                    valor={formatPct(resultado.pieMinimoSugeridoPct, 0)}
                                    hint={`Plazo hab. hasta ${resultado.plazoMaxSugerido} meses`}
                                />
                                <DatoCompacto
                                    label="Monto máx. referencial"
                                    valor={formatCLP(Math.round(resultado.montoMaximoReferencial))}
                                    hint={
                                        tipoTrabajador === 'independiente'
                                            ? 'Con ~60% de renta reconocida'
                                            : 'Cuota ≤ 30% de renta líquida'
                                    }
                                />
                            </div>

                            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
                                {resultado.resumenPerfil}
                            </p>

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
                                Ingresa el precio del vehículo
                            </p>
                            <p className="max-w-sm text-xs text-[var(--fg-muted)]">
                                Elige tipo, marca y modelo para una simulación más realista.
                            </p>
                        </div>
                    )}

                    <DisclaimerLegal texto="Estimación orientativa. Tasas, pie y plazos varían por financiera y evaluación comercial (incluye CMF/DICOM). SimpleAutos no es entidad financiera ni aprueba créditos." />
                </div>
            </div>
        </ShellSimulador>
    );
}
