'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    IconAlertTriangle,
    IconCalculator,
    IconCheck,
    IconClipboardList,
    IconInfoCircle,
    IconShieldCheck,
    IconX,
} from '@tabler/icons-react';
import { formatCurrency, formatRut, validateRut } from '@simple/utils';
import { PanelBlockHeader, PanelButton, PanelCard, PanelNotice, PanelSegmentedToggle } from '@simple/ui/panel';
import { ModernSelect } from '@simple/ui/forms';
import {
    DOWN_PAYMENT_PRESETS,
    getMinDownPaymentPercent,
    mapVehicleUseToCatalogType,
    VEHICLE_USE_OPTIONS,
    type VehicleUseType,
} from '@/lib/financing-precheck.config';
import {
    getBrandsForVehicleType,
    getModelsForBrand,
    loadPublishWizardCatalog,
    resolveCatalogBrandId,
    resolveCatalogModelId,
    type PublishWizardCatalog,
} from '@/lib/publish-wizard-catalog';
import {
    buildFinancingLeadMailto,
    evaluateFinancingPrecheck,
    type FinancingPrecheckResult,
    type WorkerType,
} from '@/lib/financing-precheck';

function parseCLP(value: string): number {
    return Number(value.replace(/\D/g, '')) || 0;
}

function formatCLPInput(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseYear(value: string): number {
    const year = Number(value.replace(/\D/g, ''));
    return Number.isFinite(year) ? year : 0;
}

const WORKER_OPTIONS: { value: WorkerType; label: string }[] = [
    { value: 'dependent', label: 'Dependiente' },
    { value: 'independent', label: 'Independiente' },
    { value: 'pensioned', label: 'Pensionado' },
];

function getStatusBadge(status: FinancingPrecheckResult['status'] | null) {
    switch (status) {
        case 'eligible':
            return { color: 'marketplace-flow-badge-success', icon: IconCheck, label: 'PRECALIFICA' };
        case 'review':
            return { color: 'marketplace-flow-badge-warning', icon: IconAlertTriangle, label: 'REVISAR' };
        case 'blocked':
            return { color: 'marketplace-flow-badge-error', icon: IconX, label: 'NO PRECALIFICA' };
        default:
            return { color: 'bg-[var(--bg-muted)]', icon: IconInfoCircle, label: 'SIN DATOS' };
    }
}

export function FinancingPrecheckWizard() {
    const searchParams = useSearchParams();
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [vehiclePrice, setVehiclePrice] = useState(() => formatCLPInput(searchParams.get('precio') ?? ''));
    const [vehicleYear, setVehicleYear] = useState(searchParams.get('anio') ?? '');
    const [brandId, setBrandId] = useState('');
    const [modelId, setModelId] = useState('');
    const [vehicleType, setVehicleType] = useState<VehicleUseType>(
        (searchParams.get('tipo') as VehicleUseType) || 'particular',
    );
    const [listingId] = useState(searchParams.get('listingId') ?? '');
    const [listingTitle] = useState(searchParams.get('titulo') ?? '');
    const [contactName, setContactName] = useState('');
    const [contactRut, setContactRut] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [canProveIncome, setCanProveIncome] = useState<boolean | null>(null);
    const [workerType, setWorkerType] = useState<WorkerType>('dependent');
    const [monthlyIncome, setMonthlyIncome] = useState('');
    const [downPreset, setDownPreset] = useState<string>('20');
    const [downCustom, setDownCustom] = useState('');
    const [hasDicom, setHasDicom] = useState<boolean | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [result, setResult] = useState<FinancingPrecheckResult | null>(null);
    const [hasPrechecked, setHasPrechecked] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isPrechecking, setIsPrechecking] = useState(false);

    const catalogVehicleType = mapVehicleUseToCatalogType(vehicleType);
    const brands = useMemo(
        () => (catalog ? getBrandsForVehicleType(catalog, catalogVehicleType) : []),
        [catalog, catalogVehicleType],
    );
    const models = useMemo(
        () => (catalog && brandId ? getModelsForBrand(catalog, brandId, catalogVehicleType) : []),
        [catalog, brandId, catalogVehicleType],
    );
    const brandName = catalog?.brands.find((brand) => brand.id === brandId)?.name ?? '';
    const modelName = catalog?.models.find((model) => model.id === modelId)?.name ?? '';

    useEffect(() => {
        let cancelled = false;
        setCatalogLoading(true);
        loadPublishWizardCatalog()
            .then((loaded) => {
                if (!cancelled) setCatalog(loaded);
            })
            .catch(() => {
                if (!cancelled) setCatalog(null);
            })
            .finally(() => {
                if (!cancelled) setCatalogLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!catalog) return;
        const resolvedBrandId = resolveCatalogBrandId(
            catalog,
            catalogVehicleType,
            searchParams.get('marca'),
        );
        if (!resolvedBrandId) return;
        setBrandId((current) => current || resolvedBrandId);
    }, [catalog, catalogVehicleType, searchParams]);

    useEffect(() => {
        if (!catalog || !brandId) return;
        const resolvedModelId = resolveCatalogModelId(
            catalog,
            brandId,
            catalogVehicleType,
            searchParams.get('modelo'),
        );
        if (!resolvedModelId) return;
        setModelId((current) => current || resolvedModelId);
    }, [catalog, brandId, catalogVehicleType, searchParams]);

    const minPie = getMinDownPaymentPercent(vehicleType);
    const downPaymentPercent = downPreset === 'other'
        ? Math.min(100, Math.max(0, Number(downCustom.replace(',', '.')) || 0))
        : Number(downPreset);
    const downAmount = parseCLP(vehiclePrice) > 0 && downPaymentPercent > 0
        ? Math.round(parseCLP(vehiclePrice) * downPaymentPercent / 100)
        : 0;
    const financedAmount = Math.max(0, parseCLP(vehiclePrice) - downAmount);

    const statusBadge = getStatusBadge(result?.status ?? null);
    const StatusIcon = statusBadge.icon;

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (parseCLP(vehiclePrice) < 1_000_000) {
            errors.push('Indica un precio de referencia del vehículo.');
        }
        if (parseYear(vehicleYear) < 1995 || parseYear(vehicleYear) > new Date().getFullYear() + 1) {
            errors.push('Indica un año válido del vehículo.');
        }
        if (!brandId) {
            errors.push('Selecciona la marca del vehículo.');
        }
        if (!modelId) {
            errors.push('Selecciona el modelo del vehículo.');
        }
        if (canProveIncome === null) {
            errors.push('Indica si puedes acreditar ingresos.');
        }

        if (canProveIncome === true) {
            if (!contactName.trim()) errors.push('Indica tu nombre.');
            const rut = formatRut(contactRut);
            if (!validateRut(rut)) errors.push('RUT inválido.');
            if (contactPhone.replace(/\D/g, '').length < 9) errors.push('Indica un teléfono válido.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) errors.push('Indica un correo válido.');
            if (parseCLP(monthlyIncome) < 1) errors.push('Indica tu ingreso líquido mensual.');
            if (downPaymentPercent < minPie) errors.push(`Para este tipo de vehículo el pie mínimo es ${minPie}%.`);
            if (hasDicom === null) errors.push('Indica si tienes deudas en DICOM.');
        }

        return errors;
    };

    const handlePrecheck = () => {
        const errors = validateForm();
        setValidationErrors(errors);
        if (errors.length > 0) {
            setResult(null);
            setHasPrechecked(false);
            return;
        }

        setIsPrechecking(true);
        const evaluation = evaluateFinancingPrecheck({
            vehiclePrice: parseCLP(vehiclePrice),
            vehicleYear: parseYear(vehicleYear),
            vehicleBrand: brandName || brandId,
            vehicleModel: modelName || modelId,
            vehicleType,
            listingId: listingId || undefined,
            listingTitle: listingTitle || undefined,
            canProveIncome: canProveIncome === true,
            workerType: canProveIncome === true ? workerType : undefined,
            monthlyIncome: canProveIncome === true ? parseCLP(monthlyIncome) : 0,
            downPaymentPercent: canProveIncome === true ? downPaymentPercent : 0,
            hasDicom: canProveIncome === true ? Boolean(hasDicom) : false,
        });
        setResult(evaluation);
        setHasPrechecked(true);
        setIsPrechecking(false);
    };

    const handleSendLead = () => {
        if (!result || canProveIncome !== true || hasDicom === null) return;
        const mailto = buildFinancingLeadMailto(
            {
                vehiclePrice: parseCLP(vehiclePrice),
                vehicleYear: parseYear(vehicleYear),
                vehicleBrand: brandName || brandId,
                vehicleModel: modelName || modelId,
                vehicleType,
                listingId: listingId || undefined,
                listingTitle: listingTitle || undefined,
                canProveIncome: true,
                workerType,
                monthlyIncome: parseCLP(monthlyIncome),
                downPaymentPercent,
                hasDicom,
                contactName: contactName.trim(),
                contactRut: formatRut(contactRut),
                contactPhone: contactPhone.trim(),
                contactEmail: contactEmail.trim(),
            },
            result,
        );
        window.location.href = mailto;
        setSubmitted(true);
    };

    return (
        <div className="marketplace-flow-page">
            <div className="marketplace-flow-header">
                <div className="container-app marketplace-flow-header-inner">
                    <div>
                        <p className="marketplace-flow-eyebrow">Precalificación gratuita</p>
                        <h1 className="marketplace-flow-title">Financiamiento vehicular</h1>
                        <p className="marketplace-flow-subtitle">Gratis · sin registro · no es aprobación crediticia</p>
                    </div>
                    <div className="marketplace-flow-meta">
                        <div className="flex items-center gap-1.5">
                            <IconShieldCheck size={14} className="text-[var(--color-success)]" />
                            <span>Pie mín. {minPie}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconInfoCircle size={14} className="text-[var(--fg-muted)]" />
                            <span>Sin cuotas estimadas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconCalculator size={14} className="text-[var(--accent)]" />
                            <span>{hasPrechecked ? statusBadge.label : 'Completa y precalifica'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-app panel-page marketplace-flow-body max-w-4xl mx-auto">
                {listingTitle ? (
                    <PanelNotice tone="neutral" className="mb-4">
                        Vehículo de referencia: <strong>{listingTitle}</strong>
                    </PanelNotice>
                ) : null}

                {result ? (
                    <PanelCard size="lg" className="mb-6 flex items-center gap-5">
                        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${statusBadge.color}`}>
                            <StatusIcon size={32} />
                        </div>
                        <div className="flex-1">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Evaluación</p>
                            <p className="text-xl font-semibold text-[var(--fg)]">{result.headline}</p>
                            <p className="mt-1 text-sm text-[var(--fg-muted)]">{result.summary}</p>
                        </div>
                    </PanelCard>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="space-y-6 lg:col-span-3">
                        <PanelCard size="lg" className="space-y-4">
                            <PanelBlockHeader title="1. Vehículo y contacto" className="mb-0" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Tipo de vehículo</label>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        {VEHICLE_USE_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setVehicleType(option.value);
                                                    setBrandId('');
                                                    setModelId('');
                                                }}
                                                className={`marketplace-flow-option w-full transition-colors ${
                                                    vehicleType === option.value ? 'marketplace-flow-option--active' : ''
                                                }`}
                                            >
                                                <p className="text-sm font-medium text-[var(--fg)]">{option.label}</p>
                                                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{option.hint}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Marca</label>
                                    <ModernSelect
                                        value={brandId}
                                        onChange={(value) => {
                                            setBrandId(value);
                                            setModelId('');
                                        }}
                                        placeholder={catalogLoading ? 'Cargando marcas…' : 'Seleccionar'}
                                        disabled={catalogLoading || !catalog}
                                        options={[
                                            { value: '', label: catalogLoading ? 'Cargando marcas…' : 'Seleccionar' },
                                            ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                                        ]}
                                        ariaLabel="Seleccionar marca"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Modelo</label>
                                    <ModernSelect
                                        value={modelId}
                                        onChange={setModelId}
                                        placeholder={brandId ? 'Seleccionar' : 'Primero marca'}
                                        disabled={!brandId || catalogLoading || !catalog}
                                        options={[
                                            { value: '', label: brandId ? 'Seleccionar' : 'Primero marca' },
                                            ...models.map((model) => ({ value: model.id, label: model.name })),
                                        ]}
                                        ariaLabel="Seleccionar modelo"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Año</label>
                                    <input
                                        className="form-input w-full"
                                        inputMode="numeric"
                                        value={vehicleYear}
                                        onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="2019"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Precio del vehículo</label>
                                    <input
                                        className="form-input w-full"
                                        inputMode="numeric"
                                        value={vehiclePrice}
                                        onChange={(e) => setVehiclePrice(formatCLPInput(e.target.value))}
                                        placeholder="12.500.000"
                                    />
                                    <p className="mt-1 text-[10px] text-[var(--fg-muted)]">Valor de publicación o pactado con el vendedor.</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Nombre completo</label>
                                    <input
                                        className="form-input w-full"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">RUT</label>
                                    <input
                                        className="form-input w-full"
                                        value={contactRut}
                                        onChange={(e) => setContactRut(e.target.value)}
                                        placeholder="12.345.678-9"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Teléfono</label>
                                    <input
                                        className="form-input w-full"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="+56 9 …"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Email</label>
                                    <input
                                        className="form-input w-full"
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        placeholder="correo@ejemplo.cl"
                                    />
                                </div>
                            </div>
                        </PanelCard>

                        <PanelCard size="lg" className="space-y-4">
                            <PanelBlockHeader title="2. Perfil crediticio" className="mb-0" />
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-2 block text-xs font-medium text-[var(--fg-muted)]">¿Puedes acreditar ingresos con documentos?</label>
                                    <PanelSegmentedToggle
                                        items={[
                                            { key: 'yes', label: 'Sí' },
                                            { key: 'no', label: 'No' },
                                        ]}
                                        activeKey={canProveIncome === null ? '' : canProveIncome ? 'yes' : 'no'}
                                        onChange={(key) => setCanProveIncome(key === 'yes')}
                                    />
                                </div>
                                {canProveIncome === false ? (
                                    <PanelNotice tone="warning">
                                        Sin comprobantes de ingreso no es posible continuar con la evaluación formal.
                                    </PanelNotice>
                                ) : (
                                    <>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Tipo de trabajador</label>
                                                <ModernSelect
                                                    value={workerType}
                                                    onChange={(v) => setWorkerType(v as WorkerType)}
                                                    options={WORKER_OPTIONS}
                                                    ariaLabel="Tipo de trabajador"
                                                    disabled={canProveIncome !== true}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Ingreso líquido mensual</label>
                                                <input
                                                    className="form-input w-full"
                                                    inputMode="numeric"
                                                    value={monthlyIncome}
                                                    onChange={(e) => setMonthlyIncome(formatCLPInput(e.target.value))}
                                                    placeholder="900.000"
                                                    disabled={canProveIncome !== true}
                                                />
                                            </div>
                                        </div>
                                        <PanelNotice tone="neutral">
                                            Se solicitarán liquidaciones, boletas o certificado de pensión según tu tipo de trabajador.
                                        </PanelNotice>
                                    </>
                                )}
                            </div>
                        </PanelCard>

                        <PanelCard size="lg" className={`space-y-4${canProveIncome !== true ? ' pointer-events-none opacity-60' : ''}`}>
                            <PanelBlockHeader title="3. Pie y antecedentes" className="mb-0" />
                            <PanelNotice tone="neutral">
                                Pie mínimo para este tipo: <strong>{minPie}%</strong>
                                {vehicleType === 'carga' ? ' (vehículos de carga / comercial).' : '.'}
                            </PanelNotice>
                            <div>
                                <label className="mb-2 block text-xs font-medium text-[var(--fg-muted)]">¿Cuánto pie tienes disponible?</label>
                                <div className="flex flex-wrap gap-2">
                                    {DOWN_PAYMENT_PRESETS.filter((pct) => pct >= minPie || vehicleType !== 'carga').map((pct) => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => { setDownPreset(String(pct)); setDownCustom(''); }}
                                            className={`marketplace-flow-pill ${
                                                downPreset === String(pct) ? 'marketplace-flow-pill--active' : ''
                                            }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setDownPreset('other')}
                                        className={`marketplace-flow-pill ${
                                            downPreset === 'other' ? 'marketplace-flow-pill--active' : ''
                                        }`}
                                    >
                                        Otro %
                                    </button>
                                </div>
                            </div>
                            {downPreset === 'other' ? (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Porcentaje de pie</label>
                                    <input
                                        className="form-input w-full"
                                        inputMode="decimal"
                                        value={downCustom}
                                        onChange={(e) => setDownCustom(e.target.value)}
                                        placeholder={`Mínimo ${minPie}`}
                                    />
                                </div>
                            ) : null}
                            {downAmount > 0 ? (
                                <p className="text-sm text-[var(--fg-muted)]">
                                    Pie aproximado: {formatCurrency(downAmount)}
                                    {financedAmount > 0 ? ` · Monto a financiar: ${formatCurrency(financedAmount)}` : ''}
                                </p>
                            ) : null}
                            <div>
                                <label className="mb-2 block text-xs font-medium text-[var(--fg-muted)]">¿Tienes deudas publicadas en DICOM?</label>
                                <PanelSegmentedToggle
                                    items={[
                                        { key: 'no', label: 'No' },
                                        { key: 'yes', label: 'Sí' },
                                    ]}
                                    activeKey={hasDicom === null ? '' : hasDicom ? 'yes' : 'no'}
                                    onChange={(key) => setHasDicom(key === 'yes')}
                                />
                            </div>
                            {hasDicom ? (
                                <PanelNotice tone="warning">
                                    El financiamiento está sujeto a evaluación y normalmente se requiere no mantener DICOM, o condiciones más exigentes (mayor pie, aval o tasas distintas).
                                </PanelNotice>
                            ) : null}
                        </PanelCard>

                        {validationErrors.length > 0 ? (
                            <PanelNotice tone="error">
                                <p className="mb-1 font-semibold">Faltan datos requeridos:</p>
                                <ul className="space-y-0.5">
                                    {validationErrors.map((error) => (
                                        <li key={error}>• {error}</li>
                                    ))}
                                </ul>
                            </PanelNotice>
                        ) : null}

                        <PanelButton
                            type="button"
                            variant="accent"
                            className="w-full justify-center"
                            onClick={handlePrecheck}
                            disabled={isPrechecking || catalogLoading || !catalog}
                            loading={isPrechecking}
                        >
                            {isPrechecking ? 'Evaluando…' : hasPrechecked ? 'Actualizar precalificación' : 'Precalificar'}
                        </PanelButton>
                    </div>

                    <div className="space-y-6 lg:col-span-2">
                        {result ? (
                            <>
                                <PanelCard size="lg" className="overflow-hidden text-center">
                                    <PanelBlockHeader
                                        title="Resumen del vehículo"
                                        className="mb-0 text-center [&_h2]:text-xs [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-[var(--fg-muted)]"
                                    />
                                    <div className="pb-4 pt-2">
                                        <p className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
                                            {[brandName || 'Vehículo', modelName].filter(Boolean).join(' ')} {vehicleYear || '—'}
                                        </p>
                                        <p className="mt-2 text-sm font-medium text-[var(--fg-muted)]">
                                            {parseCLP(vehiclePrice) > 0 ? formatCurrency(parseCLP(vehiclePrice)) : '—'}
                                        </p>
                                    </div>
                                </PanelCard>

                                {downAmount > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <PanelCard size="sm" className="text-center">
                                            <p className="text-[10px] font-semibold uppercase text-[var(--fg-muted)]">Pie indicado</p>
                                            <p className="mt-1 text-lg font-semibold text-[var(--fg)]">{formatCurrency(downAmount)}</p>
                                            <p className="text-[10px] text-[var(--fg-muted)]">{downPaymentPercent}%</p>
                                        </PanelCard>
                                        <PanelCard size="sm" className="text-center">
                                            <p className="text-[10px] font-semibold uppercase text-[var(--fg-muted)]">A financiar</p>
                                            <p className="mt-1 text-lg font-semibold text-[var(--fg)]">{formatCurrency(financedAmount)}</p>
                                        </PanelCard>
                                    </div>
                                ) : null}

                                {result.blockers.map((item) => (
                                    <PanelNotice key={item} tone="error">{item}</PanelNotice>
                                ))}
                                {result.warnings.map((item) => (
                                    <PanelNotice key={item} tone="warning">{item}</PanelNotice>
                                ))}

                                {result.status !== 'blocked' ? (
                                    <PanelCard size="md">
                                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
                                            <IconClipboardList size={16} />
                                            Documentos a preparar
                                        </p>
                                        <ul className="space-y-1 text-sm text-[var(--fg-muted)]">
                                            {result.documentsHint.map((doc) => (
                                                <li key={doc} className="flex items-start gap-2">
                                                    <IconCheck size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                                                    {doc}
                                                </li>
                                            ))}
                                        </ul>
                                    </PanelCard>
                                ) : null}

                                <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
                                    {result.referenceNotes.join(' ')}
                                </p>

                                {result.status !== 'blocked' && canProveIncome === true ? (
                                    <PanelButton type="button" variant="accent" className="w-full justify-center" onClick={handleSendLead}>
                                        Enviar antecedentes
                                    </PanelButton>
                                ) : null}
                                {submitted ? (
                                    <PanelNotice tone="success">
                                        Si tu cliente de correo no se abrió, escríbenos a hola@simpleplataforma.app con tus datos.
                                    </PanelNotice>
                                ) : null}
                            </>
                        ) : (
                            <PanelCard size="lg" className="text-center">
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--fg-muted)]">
                                        <IconCalculator size={28} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--fg)]">Resultado de precalificación</p>
                                        <p className="mt-1 text-xs text-[var(--fg-muted)]">
                                            Completa el formulario y pulsa Precalificar para ver si tu perfil puede ser evaluado.
                                        </p>
                                    </div>
                                </div>
                            </PanelCard>
                        )}

                        <Link href="/ventas" className="block text-center text-sm text-[var(--fg-muted)] underline-offset-2 hover:underline">
                            Volver a comprar
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
