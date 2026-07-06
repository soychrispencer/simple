'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconArrowRight,
    IconCheck,
    IconClipboardList,
    IconInfoCircle,
    IconShieldCheck,
} from '@tabler/icons-react';
import { formatCurrency, formatRut, validateRut } from '@simple/utils';
import { PanelBlockHeader, PanelButton, PanelCard, PanelField, PanelNotice, PanelSegmentedToggle } from '@simple/ui/panel';
import { ModernSelect } from '@simple/ui/forms';
import {
    DOWN_PAYMENT_PRESETS,
    getMinDownPaymentPercent,
    VEHICLE_USE_OPTIONS,
    type VehicleUseType,
} from '@/lib/financing-precheck.config';
import {
    buildFinancingLeadMailto,
    evaluateFinancingPrecheck,
    type FinancingPrecheckResult,
    type WorkerType,
} from '@/lib/financing-precheck';

const STEPS = [
    'Vehículo',
    'Tus datos',
    'Ingresos',
    'Trabajo',
    'Pie',
    'DICOM',
    'Resultado',
] as const;

type StepId = (typeof STEPS)[number];

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

export function FinancingPrecheckWizard() {
    const searchParams = useSearchParams();
    const [stepIndex, setStepIndex] = useState(0);
    const [vehiclePrice, setVehiclePrice] = useState(() => formatCLPInput(searchParams.get('precio') ?? ''));
    const [vehicleYear, setVehicleYear] = useState(searchParams.get('anio') ?? '');
    const [vehicleBrand, setVehicleBrand] = useState(searchParams.get('marca') ?? '');
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
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const minPie = getMinDownPaymentPercent(vehicleType);
    const downPaymentPercent = downPreset === 'other'
        ? Math.min(100, Math.max(0, Number(downCustom.replace(',', '.')) || 0))
        : Number(downPreset);

    const result: FinancingPrecheckResult | null = useMemo(() => {
        if (stepIndex < 6 || canProveIncome !== true || hasDicom === null) return null;
        return evaluateFinancingPrecheck({
            vehiclePrice: parseCLP(vehiclePrice),
            vehicleYear: parseYear(vehicleYear),
            vehicleBrand: vehicleBrand.trim(),
            vehicleType,
            listingId: listingId || undefined,
            listingTitle: listingTitle || undefined,
            canProveIncome: true,
            workerType,
            monthlyIncome: parseCLP(monthlyIncome),
            downPaymentPercent,
            hasDicom,
        });
    }, [stepIndex, canProveIncome, hasDicom, vehiclePrice, vehicleYear, vehicleBrand, vehicleType, listingId, listingTitle, workerType, monthlyIncome, downPaymentPercent]);

    const goNext = () => {
        setFieldError(null);
        const step = STEPS[stepIndex];

        if (step === 'Vehículo') {
            if (parseCLP(vehiclePrice) < 1_000_000) {
                setFieldError('Indica un precio de referencia del vehículo.');
                return;
            }
            if (parseYear(vehicleYear) < 1995 || parseYear(vehicleYear) > new Date().getFullYear() + 1) {
                setFieldError('Indica un año válido.');
                return;
            }
            if (!vehicleBrand.trim()) {
                setFieldError('Indica la marca del vehículo.');
                return;
            }
        }

        if (step === 'Tus datos') {
            if (!contactName.trim()) {
                setFieldError('Indica tu nombre.');
                return;
            }
            const rut = formatRut(contactRut);
            if (!validateRut(rut)) {
                setFieldError('RUT inválido.');
                return;
            }
            if (contactPhone.replace(/\D/g, '').length < 9) {
                setFieldError('Indica un teléfono válido.');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
                setFieldError('Indica un correo válido.');
                return;
            }
        }

        if (step === 'Ingresos' && canProveIncome === null) {
            setFieldError('Selecciona si puedes acreditar ingresos.');
            return;
        }

        if (step === 'Ingresos' && canProveIncome === false) {
            setStepIndex(6);
            return;
        }

        if (step === 'Trabajo' && parseCLP(monthlyIncome) < 1) {
            setFieldError('Indica tu ingreso líquido mensual.');
            return;
        }

        if (step === 'Pie') {
            if (downPaymentPercent < minPie) {
                setFieldError(`Para este tipo de vehículo el pie mínimo es ${minPie}%.`);
                return;
            }
        }

        if (step === 'DICOM' && hasDicom === null) {
            setFieldError('Indica si tienes deudas en DICOM.');
            return;
        }

        setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
    };

    const goBack = () => {
        setFieldError(null);
        if (stepIndex === 6 && canProveIncome === false) {
            setStepIndex(2);
            return;
        }
        setStepIndex((current) => Math.max(current - 1, 0));
    };

    const handleSendLead = () => {
        if (!result || canProveIncome !== true || hasDicom === null) return;
        const mailto = buildFinancingLeadMailto(
            {
                vehiclePrice: parseCLP(vehiclePrice),
                vehicleYear: parseYear(vehicleYear),
                vehicleBrand: vehicleBrand.trim(),
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

    const blockedNoIncome = stepIndex === 6 && canProveIncome === false;
    const currentStep = STEPS[stepIndex];

    return (
        <div className="marketplace-flow-page">
            <div className="marketplace-flow-header">
                <div className="container-app marketplace-flow-header-inner">
                    <div>
                        <p className="marketplace-flow-eyebrow">Asistente de precalificación</p>
                        <h1 className="marketplace-flow-title">Financiamiento vehicular</h1>
                        <p className="marketplace-flow-subtitle">Sin cuotas estimadas · no es aprobación crediticia</p>
                    </div>
                    <div className="marketplace-flow-steps">
                        {STEPS.map((label, index) => (
                            <span
                                key={label}
                                className={`marketplace-flow-step${
                                    index === stepIndex
                                        ? ' marketplace-flow-step--active'
                                        : index < stepIndex
                                            ? ' marketplace-flow-step--done'
                                            : ''
                                }`}
                            >
                                {index + 1}. {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container-app panel-page marketplace-flow-body max-w-2xl mx-auto">
                {listingTitle ? (
                    <PanelNotice tone="neutral" className="mb-4">
                        Vehículo de referencia: <strong>{listingTitle}</strong>
                    </PanelNotice>
                ) : null}

                <PanelCard size="lg" className="space-y-4">
                    {currentStep === 'Vehículo' ? (
                        <div className="space-y-4">
                            <PanelBlockHeader title="1. Vehículo" className="mb-0" />
                            <PanelField label="Precio del vehículo" hint="Valor de publicación o pactado con el vendedor.">
                                <input
                                    className="form-input"
                                    inputMode="numeric"
                                    value={vehiclePrice}
                                    onChange={(e) => setVehiclePrice(formatCLPInput(e.target.value))}
                                    placeholder="12.500.000"
                                />
                            </PanelField>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <PanelField label="Año">
                                    <input
                                        className="form-input"
                                        inputMode="numeric"
                                        value={vehicleYear}
                                        onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="2019"
                                    />
                                </PanelField>
                                <PanelField label="Marca">
                                    <input
                                        className="form-input"
                                        value={vehicleBrand}
                                        onChange={(e) => setVehicleBrand(e.target.value)}
                                        placeholder="Kia, Hyundai, Toyota…"
                                    />
                                </PanelField>
                            </div>
                            <PanelField label="Tipo de vehículo">
                                <div className="grid gap-2">
                                    {VEHICLE_USE_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setVehicleType(option.value)}
                                            className={`marketplace-flow-option w-full transition-colors ${
                                                vehicleType === option.value ? 'marketplace-flow-option--active' : ''
                                            }`}
                                        >
                                            <p className="text-sm font-medium text-[var(--fg)]">{option.label}</p>
                                            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{option.hint}</p>
                                        </button>
                                    ))}
                                </div>
                            </PanelField>
                        </div>
                    ) : null}

                    {currentStep === 'Tus datos' ? (
                        <div className="space-y-4">
                            <PanelBlockHeader title="2. Tus datos" className="mb-0" />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <PanelField label="Nombre" className="sm:col-span-2">
                                <input className="form-input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                            </PanelField>
                            <PanelField label="RUT">
                                <input
                                    className="form-input"
                                    value={contactRut}
                                    onChange={(e) => setContactRut(e.target.value)}
                                    placeholder="12.345.678-9"
                                />
                            </PanelField>
                            <PanelField label="Teléfono">
                                <input className="form-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+56 9 …" />
                            </PanelField>
                            <PanelField label="Email" className="sm:col-span-2">
                                <input className="form-input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                            </PanelField>
                        </div>
                        </div>
                    ) : null}

                    {currentStep === 'Ingresos' ? (
                        <div className="space-y-4">
                            <PanelBlockHeader title="3. Ingresos" className="mb-0" />
                            <p className="text-sm text-[var(--fg-secondary)]">¿Puedes acreditar ingresos con documentos?</p>
                            <PanelSegmentedToggle
                                items={[
                                    { key: 'yes', label: 'Sí' },
                                    { key: 'no', label: 'No' },
                                ]}
                                activeKey={canProveIncome === null ? '' : canProveIncome ? 'yes' : 'no'}
                                onChange={(key) => setCanProveIncome(key === 'yes')}
                            />
                            {canProveIncome === false ? (
                                <PanelNotice tone="warning">
                                    Actualmente no es posible continuar con la evaluación para financiamiento sin acreditar ingresos.
                                </PanelNotice>
                            ) : (
                                <PanelNotice tone="neutral">
                                    Se solicitarán liquidaciones, boletas o certificado de pensión según tu tipo de trabajador.
                                </PanelNotice>
                            )}
                        </div>
                    ) : null}

                    {currentStep === 'Trabajo' ? (
                        <div className="space-y-4">
                            <PanelBlockHeader title="4. Trabajo" className="mb-0" />
                            <PanelField label="Tipo de trabajador">
                                <ModernSelect
                                    value={workerType}
                                    onChange={(v) => setWorkerType(v as WorkerType)}
                                    options={WORKER_OPTIONS}
                                    ariaLabel="Tipo de trabajador"
                                />
                            </PanelField>
                            <PanelField label="Ingreso líquido mensual" hint="Monto que recibes después de descuentos legales.">
                                <input
                                    className="form-input"
                                    inputMode="numeric"
                                    value={monthlyIncome}
                                    onChange={(e) => setMonthlyIncome(formatCLPInput(e.target.value))}
                                    placeholder="900.000"
                                />
                            </PanelField>
                        </div>
                    ) : null}

                    {currentStep === 'Pie' ? (
                        <div className="space-y-4">
                            <PanelBlockHeader title="5. Pie" className="mb-0" />
                            <PanelNotice tone="neutral">
                                Pie mínimo para este tipo: <strong>{minPie}%</strong>
                                {vehicleType === 'carga' ? ' (vehículos de carga / comercial).' : '.'}
                            </PanelNotice>
                            <PanelField label="¿Cuánto pie tienes disponible?">
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
                            </PanelField>
                            {downPreset === 'other' ? (
                                <PanelField label="Porcentaje de pie">
                                    <input
                                        className="form-input"
                                        inputMode="decimal"
                                        value={downCustom}
                                        onChange={(e) => setDownCustom(e.target.value)}
                                        placeholder={`Mínimo ${minPie}`}
                                    />
                                </PanelField>
                            ) : null}
                            {parseCLP(vehiclePrice) > 0 && downPaymentPercent > 0 ? (
                                <p className="text-sm text-[var(--fg-muted)]">
                                    Pie aproximado: {formatCurrency(Math.round(parseCLP(vehiclePrice) * downPaymentPercent / 100))}
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    {currentStep === 'DICOM' ? (
                        <div className="space-y-4">
                            <PanelBlockHeader title="6. DICOM" className="mb-0" />
                            <p className="text-sm text-[var(--fg-secondary)]">¿Tienes deudas publicadas en DICOM?</p>
                            <PanelSegmentedToggle
                                items={[
                                    { key: 'no', label: 'No' },
                                    { key: 'yes', label: 'Sí' },
                                ]}
                                activeKey={hasDicom === null ? '' : hasDicom ? 'yes' : 'no'}
                                onChange={(key) => setHasDicom(key === 'yes')}
                            />
                            {hasDicom ? (
                                <PanelNotice tone="warning">
                                    El financiamiento está sujeto a evaluación y normalmente se requiere no mantener DICOM, o condiciones más exigentes (mayor pie, aval o tasas distintas).
                                </PanelNotice>
                            ) : null}
                        </div>
                    ) : null}

                    {currentStep === 'Resultado' ? (
                        <div className="space-y-5">
                            <PanelBlockHeader title="7. Resultado" className="mb-0" />
                            {blockedNoIncome ? (
                                <>
                                    <PanelNotice tone="error">
                                        Actualmente no es posible continuar con la evaluación para financiamiento.
                                    </PanelNotice>
                                    <p className="text-sm text-[var(--fg-muted)]">
                                        Cuando puedas acreditar ingresos, vuelve a completar el asistente o contacta al vendedor directamente.
                                    </p>
                                </>
                            ) : result ? (
                                <>
                                    <PanelCard size="lg" className="flex items-start gap-4">
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full marketplace-flow-result-icon${
                                            result.status === 'blocked' ? ' marketplace-flow-result-icon--blocked' : ''
                                        }`}>
                                            {result.status === 'blocked' ? <IconInfoCircle size={24} /> : <IconShieldCheck size={24} />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Precalificación</p>
                                            <p className="text-lg font-semibold text-[var(--fg)]">{result.headline}</p>
                                            <p className="mt-1 text-sm text-[var(--fg-secondary)]">{result.summary}</p>
                                        </div>
                                    </PanelCard>

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

                                    {result.status !== 'blocked' ? (
                                        <PanelButton type="button" variant="accent" className="w-full justify-center" onClick={handleSendLead}>
                                            Enviar antecedentes
                                        </PanelButton>
                                    ) : null}
                                    {submitted ? (
                                        <PanelNotice tone="success">Si tu cliente de correo no se abrió, escríbenos a hola@simpleplataforma.app con tus datos.</PanelNotice>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                    ) : null}

                    {fieldError ? <PanelNotice tone="error" className="mt-4">{fieldError}</PanelNotice> : null}

                    {currentStep !== 'Resultado' ? (
                        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                            <PanelButton type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
                                <IconArrowLeft size={16} />
                                Atrás
                            </PanelButton>
                            <PanelButton type="button" variant="accent" onClick={goNext}>
                                {currentStep === 'Ingresos' && canProveIncome === false ? 'Ver resultado' : 'Continuar'}
                                <IconArrowRight size={16} />
                            </PanelButton>
                        </div>
                    ) : (
                        <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
                            {stepIndex > 0 ? (
                                <PanelButton type="button" variant="secondary" onClick={goBack}>
                                    <IconArrowLeft size={16} />
                                    Atrás
                                </PanelButton>
                            ) : null}
                            <Link href="/ventas" className="text-sm text-[var(--fg-muted)] underline-offset-2 hover:underline">
                                Volver a comprar
                            </Link>
                        </div>
                    )}
                </PanelCard>
            </div>
        </div>
    );
}
