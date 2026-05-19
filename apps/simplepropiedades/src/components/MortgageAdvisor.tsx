'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    IconUser, IconBuildingBank, IconTrendingUp, IconStar,
    IconCalculator, IconDownload, IconHistory, IconTrash,
    IconDeviceFloppy, IconCheck, IconAlertTriangle, IconX,
    IconChevronDown, IconChevronUp, IconInfoCircle,
} from '@tabler/icons-react';
import {
    CalculationResult,
    SavedSimulation,
    MortgageRates,
    calculateMortgage,
    formatCurrency,
    formatUF,
    UF_FALLBACK,
} from '@/lib/mortgage-utils';

// ─── Types ─────────────────────────────────────────────────────────
interface UFData {
    value: number;
    source: string;
}

// ─── Helpers ───────────────────────────────────────────────────────
function getApprovalColor(prob: 'high' | 'medium' | 'low') {
    switch (prob) {
        case 'high': return 'bg-green-500';
        case 'medium': return 'bg-yellow-500';
        case 'low': return 'bg-red-500';
    }
}

function getApprovalLabel(prob: 'high' | 'medium' | 'low') {
    switch (prob) {
        case 'high': return 'APROBADO';
        case 'medium': return 'REVISIÓN';
        case 'low': return 'NO APROBADO';
    }
}

function getApprovalMessage(prob: 'high' | 'medium' | 'low') {
    switch (prob) {
        case 'high': return 'El cliente cumple con los requisitos. Puede postular con confianza.';
        case 'medium': return 'Requiere revisión adicional. Considerar pie mayor o ingreso adicional.';
        case 'low': return 'No cumple requisitos actuales. Revisar deudas o ingresos.';
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ─── Component ───────────────────────────────────────────────────
export default function MortgageAdvisor() {
    // -- UF --
    const [ufValue, setUfValue] = useState<number>(UF_FALLBACK);
    const [ufLoading, setUfLoading] = useState(false);

    // -- Client --
    const [monthlyIncome, setMonthlyIncome] = useState<string>('');
    const [monthlyDebts, setMonthlyDebts] = useState<string>('');
    const [clientName, setClientName] = useState<string>('');
    const [clientPhone, setClientPhone] = useState<string>('');
    const [clientEmail, setClientEmail] = useState<string>('');
    const [employmentType, setEmploymentType] = useState<string>('dependent');
    const [employmentYears, setEmploymentYears] = useState<string>('');

    // -- Conditions --
    const [age, setAge] = useState<string>('35');
    const [maxAge, setMaxAge] = useState<string>('75');
    const [annualRate, setAnnualRate] = useState<string>('3.39');
    const [bankPercentage, setBankPercentage] = useState<string>('80');
    const [customLoanYears, setCustomLoanYears] = useState<string>('');
    const [propertyType, setPropertyType] = useState<'new' | 'used'>('new');

    // -- Results --
    const [result, setResult] = useState<CalculationResult | null>(null);

    // -- Saved simulations --
    const [saved, setSaved] = useState<SavedSimulation[]>([]);
    const [showSaved, setShowSaved] = useState(false);

    // -- Mortgage rates --
    const [mortgageRates, setMortgageRates] = useState<MortgageRates | null>(null);

    // -- Advanced toggle --
    const [showAdvanced, setShowAdvanced] = useState(false);

    // -- UI --
    const [activeStep, setActiveStep] = useState<1 | 2>(1);

    // Fetch UF
    useEffect(() => {
        setUfLoading(true);
        fetch('https://mindicador.cl/api/uf')
            .then(r => r.json())
            .then((data: any) => {
                if (data?.serie?.[0]?.valor) {
                    setUfValue(data.serie[0].valor);
                }
            })
            .catch(() => { })
            .finally(() => setUfLoading(false));
    }, []);

    // Fetch mortgage rates
    useEffect(() => {
        fetch('/api/mortgage-rates')
            .then(r => r.json())
            .then((data: any) => {
                if (data.ok && data.rates) {
                    setMortgageRates(data.rates);
                    setAnnualRate(data.rates.bestMarketRate.toString());
                }
            })
            .catch(() => { });
    }, []);

    // Load saved
    useEffect(() => {
        try {
            const raw = localStorage.getItem('mortgageSimulations');
            if (raw) setSaved(JSON.parse(raw));
        } catch { }
    }, []);

    const saveToStorage = useCallback((list: SavedSimulation[]) => {
        localStorage.setItem('mortgageSimulations', JSON.stringify(list));
        setSaved(list);
    }, []);

    const handleCalculate = useCallback(() => {
        const income = parseFloat(monthlyIncome) || 0;
        const debts = parseFloat(monthlyDebts) || 0;
        const a = parseInt(age) || 35;
        const maxA = parseInt(maxAge) || 75;
        const rate = parseFloat(annualRate) || 3.39;
        const pct = parseFloat(bankPercentage) || 80;
        const years = customLoanYears ? parseInt(customLoanYears) : undefined;

        if (income <= 0) {
            setResult(null);
            return;
        }

        const res = calculateMortgage(
            income, a, rate, pct, maxA, debts, years,
            false, propertyType, ufValue
        );
        setResult(res);
        setActiveStep(2);
    }, [monthlyIncome, monthlyDebts, age, maxAge, annualRate, bankPercentage, customLoanYears, propertyType, ufValue]);

    const handleSave = useCallback(() => {
        if (!result) return;
        const sim: SavedSimulation = {
            id: generateId(),
            date: new Date().toLocaleDateString('es-CL'),
            monthlyIncome: result.monthlyIncome,
            loanTermYears: result.loanTermYears,
            propertyValue25: result.propertyValue25,
            propertyValue33: result.propertyValue33,
            clientName: clientName || undefined,
            notes: undefined,
        };
        saveToStorage([sim, ...saved]);
    }, [result, clientName, saved, saveToStorage]);

    const handleDelete = useCallback((id: string) => {
        saveToStorage(saved.filter(s => s.id !== id));
    }, [saved, saveToStorage]);

    const handleDownload = useCallback(() => {
        if (!result) return;
        const data = {
            cliente: clientName || 'Sin nombre',
            ingresoMensual: formatCurrency(result.monthlyIncome),
            deudasMensuales: formatCurrency(result.monthlyDebts),
            tasaAnual: annualRate + '%',
            plazoAnos: result.loanTermYears,
            valorPropiedad25: formatCurrency(result.propertyValue25),
            valorPropiedad30: formatCurrency(result.propertyValue30),
            valorPropiedad33: formatCurrency(result.propertyValue33),
            pie25: formatCurrency(result.pie25),
            pie30: formatCurrency(result.pie30),
            pie33: formatCurrency(result.pie33),
            cuota25: formatCurrency(result.monthlyPayment25),
            cuota30: formatCurrency(result.monthlyPayment30),
            cuota33: formatCurrency(result.monthlyPayment33),
            fecha: new Date().toLocaleDateString('es-CL'),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulacion_${clientName || 'cliente'}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [result, clientName, annualRate]);

    const hasValidIncome = useMemo(() => {
        const income = parseFloat(monthlyIncome) || 0;
        return income > 0;
    }, [monthlyIncome]);

    const approvalColor = result ? getApprovalColor(result.approvalProbability) : 'bg-gray-400';
    const approvalLabel = result ? getApprovalLabel(result.approvalProbability) : 'SIN DATOS';
    const approvalMsg = result ? getApprovalMessage(result.approvalProbability) : 'Ingresa los datos del cliente para evaluar.';

    return (
        <div className="min-h-screen mortgage-page">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 border-b backdrop-blur-md mortgage-sticky-header">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mortgage-accent-icon">
                            <IconBuildingBank size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm mortgage-fg">Simulador Hipotecario</h1>
                            <p className="text-[10px] mortgage-muted">Para asesores · {ufValue.toLocaleString('es-CL')} UF {ufLoading && '⟳'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] mortgage-muted">
                        <div className="flex items-center gap-1.5">
                            <IconStar size={14} className="mortgage-icon-success" />
                            <span>{mortgageRates?.bestMarketRate?.toFixed(2) ?? '3.39'}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconTrendingUp size={14} className="mortgage-fg" />
                            <span>{mortgageRates?.standardRate?.toFixed(2) ?? '5.50'}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconCalculator size={14} className="mortgage-accent" />
                            <span>CAE {((mortgageRates?.bestMarketRate ?? 3.39) + 0.21).toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Hero */}
                <div className="mb-6 p-4 rounded-2xl border mortgage-card">
                    <div className="flex items-center gap-2 mb-1">
                        <IconInfoCircle size={16} className="mortgage-accent" />
                        <h2 className="font-semibold text-sm mortgage-fg">Perfil rápido del cliente</h2>
                    </div>
                    <p className="text-xs mortgage-muted">
                        Ingresa los datos básicos para evaluar capacidad de crédito hipotecario en videollamada.
                    </p>
                </div>

                {/* Semáforo */}
                {result && (
                    <div className="mb-6 p-4 rounded-2xl border flex items-center gap-4 mortgage-card">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xs ${approvalColor}`}>
                            {result.approvalProbability === 'high' ? <IconCheck size={24} /> :
                                result.approvalProbability === 'low' ? <IconX size={24} /> :
                                    <IconAlertTriangle size={24} />}
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide font-semibold mortgage-muted">Evaluación</p>
                            <p className="text-lg font-bold mortgage-fg">{approvalLabel}</p>
                            <p className="text-xs mt-0.5 mortgage-muted">{approvalMsg}</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                    {/* Left: Form */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Step 1: Cliente */}
                        <div className="p-4 rounded-2xl border mortgage-card">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 mortgage-fg">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mortgage-step-badge">1</div>
                                Datos del cliente
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Nombre completo</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Ingreso líquido mensual</label>
                                    <input
                                        type="number"
                                        value={monthlyIncome}
                                        onChange={e => setMonthlyIncome(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                        placeholder="Ej: 1500000"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Deudas mensuales totales</label>
                                    <input
                                        type="number"
                                        value={monthlyDebts}
                                        onChange={e => setMonthlyDebts(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                        placeholder="Ej: 200000"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Edad actual</label>
                                    <input
                                        type="number"
                                        value={age}
                                        onChange={e => setAge(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Edad límite</label>
                                    <input
                                        type="number"
                                        value={maxAge}
                                        onChange={e => setMaxAge(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Tipo empleo</label>
                                    <select
                                        value={employmentType}
                                        onChange={e => setEmploymentType(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none mortgage-input"
                                    >
                                        <option value="dependent">Dependiente</option>
                                        <option value="independent">Independiente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Años en el empleo</label>
                                    <input
                                        type="number"
                                        value={employmentYears}
                                        onChange={e => setEmploymentYears(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                        placeholder="Ej: 3"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                        placeholder="+56 9 1234 5678"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Email</label>
                                    <input
                                        type="email"
                                        value={clientEmail}
                                        onChange={e => setClientEmail(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                        placeholder="cliente@email.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Condiciones */}
                        <div className="p-4 rounded-2xl border mortgage-card">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 mortgage-fg">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mortgage-step-badge">2</div>
                                Condiciones del crédito
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Tasa anual (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={annualRate}
                                        onChange={e => setAnnualRate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                    />
                                    <p className="text-[10px] mt-1 mortgage-muted">Mejor tasa disponible</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Financiamiento (%)</label>
                                    <input
                                        type="number"
                                        value={bankPercentage}
                                        onChange={e => setBankPercentage(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Tipo propiedad</label>
                                    <select
                                        value={propertyType}
                                        onChange={e => setPropertyType(e.target.value as 'new' | 'used')}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none mortgage-input"
                                    >
                                        <option value="new">Nueva</option>
                                        <option value="used">Usada</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block mortgage-muted">Plazo (años) · opcional</label>
                                    <input
                                        type="number"
                                        value={customLoanYears}
                                        onChange={e => setCustomLoanYears(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 mortgage-input"
                                        placeholder="Auto"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Calculate Button */}
                        <button
                            onClick={handleCalculate}
                            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 mortgage-btn-primary"
                        >
                            Calcular capacidad de crédito
                        </button>
                    </div>

                    {/* Right: Results */}
                    <div className="lg:col-span-2 space-y-4">
                        {result && (
                            <>
                                {/* Main Result Card */}
                                <div className="p-4 rounded-2xl border mortgage-card">
                                    <p className="text-[10px] uppercase tracking-wide font-semibold mb-1 mortgage-muted">Valor máx. propiedad</p>
                                    <p className="text-2xl font-bold mortgage-fg">
                                        {hasValidIncome ? formatCurrency(result.propertyValue30) : '$0'}
                                    </p>
                                    <p className="text-xs mt-1 mortgage-muted">
                                        {hasValidIncome ? formatUF(result.propertyValue30 / ufValue, ufValue) : '0.00 UF'}
                                    </p>
                                </div>

                                {/* Key Numbers */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl border mortgage-stat-cell">
                                        <p className="text-[10px] uppercase font-semibold mortgage-muted">Pie necesario</p>
                                        <p className="text-sm font-semibold mortgage-fg">
                                            {hasValidIncome ? formatCurrency(result.pie30) : '$0'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl border mortgage-stat-cell">
                                        <p className="text-[10px] uppercase font-semibold mortgage-muted">Cuota mensual</p>
                                        <p className="text-sm font-semibold mortgage-fg">
                                            {hasValidIncome ? formatCurrency(result.monthlyPayment30) : '$0'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl border mortgage-stat-cell">
                                        <p className="text-[10px] uppercase font-semibold mortgage-muted">Monto crédito</p>
                                        <p className="text-sm font-semibold mortgage-fg">
                                            {hasValidIncome ? formatCurrency(result.maxCredit30) : '$0'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl border mortgage-stat-cell">
                                        <p className="text-[10px] uppercase font-semibold mortgage-muted">Plazo</p>
                                        <p className="text-sm font-semibold mortgage-fg">
                                            {result.loanTermYears} años
                                        </p>
                                    </div>
                                </div>

                                {/* Ranges */}
                                <div className="p-4 rounded-2xl border space-y-2 mortgage-range-panel">
                                    <p className="text-xs font-semibold mb-2 mortgage-muted">Rango según DTI</p>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="mortgage-muted">Conservador (25%)</span>
                                        <span className="font-semibold mortgage-fg">{hasValidIncome ? formatCurrency(result.propertyValue25) : '$0'}</span>
                                    </div>
                                    <div className="h-1 rounded-full mortgage-range-track">
                                        <div className="h-1 rounded-full mortgage-range-fill--25" />
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="mortgage-muted">Recomendado (30%)</span>
                                        <span className="font-semibold mortgage-fg">{hasValidIncome ? formatCurrency(result.propertyValue30) : '$0'}</span>
                                    </div>
                                    <div className="h-1 rounded-full mortgage-range-track">
                                        <div className="h-1 rounded-full mortgage-range-fill--30" />
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="mortgage-muted">Límite (33%)</span>
                                        <span className="font-semibold mortgage-fg">{hasValidIncome ? formatCurrency(result.propertyValue33) : '$0'}</span>
                                    </div>
                                    <div className="h-1 rounded-full mortgage-range-track">
                                        <div className="h-1 rounded-full mortgage-range-fill--33" />
                                    </div>
                                </div>

                                {/* Advanced toggle */}
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border mortgage-btn-ghost"
                                >
                                    {showAdvanced ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                    {showAdvanced ? 'Ocultar detalles' : 'Ver detalles avanzados'}
                                </button>

                                {showAdvanced && (
                                    <div className="p-4 rounded-2xl border space-y-2 text-xs mortgage-range-panel">
                                        <div className="flex justify-between">
                                            <span className="mortgage-muted">DTI actual</span>
                                            <span className="font-medium mortgage-fg">{result.dtiRatio.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="mortgage-muted">Cuota disponible</span>
                                            <span className="font-medium mortgage-fg">{formatCurrency(result.availableQuota30)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="mortgage-muted">Seguros mensuales</span>
                                            <span className="font-medium mortgage-fg">{formatCurrency(result.totalInsuranceMonthly)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="mortgage-muted">Intereses totales</span>
                                            <span className="font-medium mortgage-fg">{formatCurrency(result.totalInterest30)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="mortgage-muted">Costo total</span>
                                            <span className="font-medium mortgage-fg">{formatCurrency(result.totalCost30)}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {!result && (
                            <div className="p-6 rounded-2xl border text-center mortgage-stat-cell">
                                <IconCalculator size={32} className="mx-auto mb-2 mortgage-muted" />
                                <p className="text-sm font-medium mortgage-muted">Ingresa los datos y calcula</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Section */}
                <div className="mt-6 p-4 rounded-2xl border mortgage-stat-cell">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 mortgage-fg">
                            <IconDeviceFloppy size={16} />
                            Guardar y gestionar simulaciones
                        </h3>
                        <div className="flex gap-2">
                            {result && (
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white mortgage-btn-primary"
                                >
                                    Guardar
                                </button>
                            )}
                            <button
                                onClick={() => setShowSaved(!showSaved)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border mortgage-input"
                            >
                                <IconHistory size={14} className="inline mr-1" />
                                Historial ({saved.length})
                            </button>
                        </div>
                    </div>

                    {showSaved && (
                        <div className="space-y-2">
                            {saved.length === 0 ? (
                                <p className="text-xs text-center py-2 mortgage-muted">No hay simulaciones guardadas</p>
                            ) : (
                                saved.map(sim => (
                                    <div key={sim.id} className="flex items-center justify-between p-3 rounded-xl border mortgage-card-subtle">
                                        <div>
                                            <p className="text-xs font-medium mortgage-fg">{sim.clientName || 'Sin nombre'}</p>
                                            <p className="text-[10px] mortgage-muted">
                                                {sim.date} · {formatCurrency(sim.monthlyIncome)} · {sim.loanTermYears}años
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(sim.id)}
                                            className="p-1.5 rounded-lg mortgage-danger"
                                        >
                                            <IconTrash size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {result && (
                        <button
                            onClick={handleDownload}
                            className="mt-3 w-full py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 mortgage-input"
                        >
                            <IconDownload size={14} />
                            Descargar resumen (JSON)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

