'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Flag para evitar cálculo automático inmediatamente después de reset
const skipCalculationRef = { current: false };

import {
    IconBuildingBank, IconTrendingUp, IconStar,
    IconCalculator, IconDownload, IconCheck, IconAlertTriangle, IconX,
    IconChevronDown, IconChevronUp, IconInfoCircle, IconRotate,
} from '@tabler/icons-react';
import { jsPDF } from 'jspdf';
import ModernSelect from '@/components/ui/modern-select';

// Nota: Ajuste por subsidio estatal. Valor referencial; validar con condiciones vigentes del banco/Subsidio DS1.
const SUBSIDY_REDUCTION_DEFAULT = 0.87;
const MAX_LOAN_YEARS = 30;
const TOTAL_INSURANCE_RATE = 0.45 + 0.08 + 0.065 + 0.002 + 0.003;
const MIN_MONTHLY_INCOME = 800000;

interface FeeBreakdown {
    total: number; appraisal: number; notary: number; stamps: number; mortgageTax: number; bankFees: number; titleStudy: number;
}
interface CalculationResult {
    monthlyIncome: number; monthlyDebts: number;
    adjustedMonthlyIncome?: number; // Ingreso reconocido por el banco (ajustado para independientes)
    employmentIncomeFactor?: number; // Factor aplicado (1.0 para dependientes, ~0.6 para independientes)
    availableQuota25: number; availableQuota30: number; availableQuota33: number;
    maxCredit25: number; maxCredit30: number; maxCredit33: number;
    propertyValue25: number; propertyValue30: number; propertyValue33: number;
    monthlyPayment25: number; monthlyPayment30: number; monthlyPayment33: number;
    loanTermYears: number;
    totalInsuranceMonthly: number;
    totalInsurance25: number; totalInsurance30: number; totalInsurance33: number;
    totalInterest25: number; totalInterest30: number; totalInterest33: number;
    totalCost25: number; totalCost30: number; totalCost33: number;
    pie25: number; pie30: number; pie33: number;
    approvalProbability: 'high' | 'medium' | 'low';
    approvalProbability25: 'high' | 'medium' | 'low';
    approvalProbability30: 'high' | 'medium' | 'low';
    approvalProbability33: 'high' | 'medium' | 'low';
    dtiRatio: number;
    dtiPostRatio25: number; dtiPostRatio30: number; dtiPostRatio33: number;
    rejectionReason?: string;
    rejectionReason25?: string;
    rejectionReason30?: string;
    rejectionReason33?: string;
    cae25: number; cae30: number; cae33: number;
    totalFees25: number; totalFees30: number; totalFees33: number;
    feeDetails25: FeeBreakdown; feeDetails30: FeeBreakdown; feeDetails33: FeeBreakdown;
    availableDownPayment: number;
    minPieNeeded25: number; minPieNeeded30: number; minPieNeeded33: number;
    capacity25: number;
    capacity30: number;
    capacity33: number;
}

interface MortgageRates {
    standardRate: number; subsidyRate: number; bestMarketRate: number; highestRate: number;
    sourceName: string; sourceUrl: string | null; updatedAt: string;
}

function formatCurrency(a: number): string {
    return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(a);
}
function cleanNumber(v: string): string { return v.replace(/\D/g, ''); }
function formatCLP(v: string | number): string {
    const s = typeof v === 'number' ? String(Math.round(v)) : cleanNumber(v);
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function parseCLP(v: string): number { return parseFloat(cleanNumber(v)) || 0; }
function formatUF(a: number, uf=39643): string { return (a/uf).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})+' UF'; }
function getApprovalColor(p: 'high'|'medium'|'low') { switch(p){case'high':return'bg-green-500';case'medium':return'bg-yellow-500';case'low':return'bg-red-500';} }
function getApprovalLabel(p: 'high'|'medium'|'low') { switch(p){case'high':return'APROBADO';case'medium':return'REVISAR';case'low':return'NO APROBADO';} }
function getApprovalMessage(p: 'high'|'medium'|'low', reason?: string) {
    switch(p){
        case'high':return'Cumple requisitos.';
        case'medium':return reason || 'Requiere revision adicional.';
        case'low':return reason || 'No cumple requisitos.';
    }
}
function evaluateScenario(
    monthlyIncome: number, pv: number, dtiPost: number, scenarioPct: number,
    propertyType: 'new'|'used', ufValue: number,
    employmentType: 'dependent'|'independent', employmentYears: number
): { ap: 'high'|'medium'|'low'; reason?: string } {
    if (monthlyIncome < MIN_MONTHLY_INCOME) {
        return { ap: 'low', reason: `Ingreso mensual inferior al minimo requerido (${formatCurrency(MIN_MONTHLY_INCOME)}).` };
    }
    if (propertyType === 'new' && pv > 0 && pv < 1300 * ufValue) {
        return { ap: 'low', reason: `Valor maximo de propiedad insuficiente para viviendas nuevas (minimo 1.300 UF, ~${formatCurrency(1300*ufValue)}).` };
    }
    if (pv <= 0) {
        return { ap: 'low', reason: `No califica para comprar una propiedad en escenario ${scenarioPct}%.` };
    }
    if (dtiPost > scenarioPct + 5) {
        return { ap: 'low', reason: `DTI post-hipoteca excede el ${scenarioPct + 5}% en escenario ${scenarioPct}%.` };
    }
    if (dtiPost > scenarioPct) {
        return { ap: 'medium', reason: `DTI post-hipoteca excede el ${scenarioPct}% en escenario ${scenarioPct}%.` };
    }
    if (employmentType === 'dependent' && employmentYears < 0.25) {
        return { ap: 'medium', reason: 'Antiguedad laboral insuficiente (minimo 3 meses recomendado para dependientes).' };
    }
    if (employmentType === 'independent' && employmentYears < 2) {
        return { ap: 'medium', reason: 'Antiguedad insuficiente: se requieren minimo 2 anos de inicio de actividades y 2 declaraciones de renta (Formulario 22) para independientes.' };
    }
    return { ap: 'high' };
}
function getBankByDTI(dtiPost: number): { name: string; status: 'likely'|'review'|'unlikely' }[] {
    // Umbrales típicos de aprobación en bancos chilenos según DTI post-hipoteca
    return [
        { name: 'BancoEstado', status: dtiPost <= 25 ? 'likely' : dtiPost <= 30 ? 'review' : 'unlikely' },
        { name: 'Bco. Chile', status: dtiPost <= 30 ? 'likely' : dtiPost <= 33 ? 'review' : 'unlikely' },
        { name: 'Bci / Itaú', status: dtiPost <= 33 ? 'likely' : dtiPost <= 37 ? 'review' : 'unlikely' },
        { name: 'Santander', status: dtiPost <= 32 ? 'likely' : dtiPost <= 37 ? 'review' : 'unlikely' },
    ];
}
function calculateOperationalFees(propertyValue: number, creditAmount: number, propertyType: 'new'|'used', ufValue: number = 39643) {
    // Tasas de mercado chileno (aprox.):
    // Avalúo: UF 15 (~$594.645 dinámico según UF)
    // Notaría + Conservador: ~1.2% del valor propiedad
    // Timbres y estampillas (usadas): ~1.5% del valor propiedad
    // Impuesto al mutuo (usadas): 0.5% sobre crédito
    // Gastos bancarios (copias, revisión): $150.000
    // Estudio de títulos: $150.000
    const appraisal = Math.round(15 * ufValue);
    const notary = Math.round(propertyValue * 0.012);
    const stamps = propertyType === 'used' ? Math.round(propertyValue * 0.015) : 0;
    const mortgageTax = propertyType === 'used' ? Math.round(creditAmount * 0.005) : 0;
    const bankFees = 150000;
    const titleStudy = 150000;
    const total = appraisal + notary + stamps + mortgageTax + bankFees + titleStudy;
    return { total, appraisal, notary, stamps, mortgageTax, bankFees, titleStudy };
}
function emptyMortgageResult(
    monthlyIncome: number, monthlyDebts: number, availableDownPayment: number,
    overrides: Partial<CalculationResult> = {}
): CalculationResult {
    return {
        monthlyIncome, monthlyDebts,
        availableQuota25: 0, availableQuota30: 0, availableQuota33: 0,
        maxCredit25: 0, maxCredit30: 0, maxCredit33: 0,
        propertyValue25: 0, propertyValue30: 0, propertyValue33: 0,
        monthlyPayment25: 0, monthlyPayment30: 0, monthlyPayment33: 0,
        loanTermYears: 0,
        totalInsuranceMonthly: 0, totalInsurance25: 0, totalInsurance30: 0, totalInsurance33: 0,
        totalInterest25: 0, totalInterest30: 0, totalInterest33: 0,
        totalCost25: 0, totalCost30: 0, totalCost33: 0,
        pie25: 0, pie30: 0, pie33: 0,
        approvalProbability: 'low', approvalProbability25: 'low', approvalProbability30: 'low', approvalProbability33: 'low',
        dtiRatio: 0,
        dtiPostRatio25: 0, dtiPostRatio30: 0, dtiPostRatio33: 0,
        cae25: 0, cae30: 0, cae33: 0,
        totalFees25: 0, totalFees30: 0, totalFees33: 0,
        feeDetails25: { total: 0, appraisal: 0, notary: 0, stamps: 0, mortgageTax: 0, bankFees: 0, titleStudy: 0 },
        feeDetails30: { total: 0, appraisal: 0, notary: 0, stamps: 0, mortgageTax: 0, bankFees: 0, titleStudy: 0 },
        feeDetails33: { total: 0, appraisal: 0, notary: 0, stamps: 0, mortgageTax: 0, bankFees: 0, titleStudy: 0 },
        availableDownPayment,
        minPieNeeded25: 0, minPieNeeded30: 0, minPieNeeded33: 0,
        capacity25: 0, capacity30: 0, capacity33: 0,
        ...overrides,
    };
}
function calculateMortgage(
    monthlyIncome: number, age: number, annualRate: number, bankPercentage: number,
    maxAge: number, monthlyDebts: number,
    options: {
        customLoanYears?: number;
        hasSubsidy?: boolean;
        propertyType?: 'new'|'used';
        ufValue?: number;
        employmentYears?: number;
        availableDownPayment?: number;
        employmentType?: 'dependent'|'independent';
    } = {}
): CalculationResult {
    const {
        customLoanYears,
        hasSubsidy = false,
        propertyType = 'new',
        ufValue = 39643,
        employmentYears = 0,
        availableDownPayment = 0,
        employmentType = 'dependent',
    } = options;
    // --- Validaciones tempranas ---
    if (age >= maxAge) {
        return emptyMortgageResult(monthlyIncome, monthlyDebts, availableDownPayment, {
            rejectionReason: 'Edad supera el limite permitido (75 anos).',
        });
    }
    if (annualRate <= 0) {
        return emptyMortgageResult(monthlyIncome, monthlyDebts, availableDownPayment, {
            rejectionReason: 'Tasa de interes invalida.',
        });
    }

    const ageBasedTerm=Math.max(5,Math.min(maxAge-age,MAX_LOAN_YEARS));
    const loanTermYears=customLoanYears?Math.min(customLoanYears,MAX_LOAN_YEARS):ageBasedTerm;
    const loanTermMonths=loanTermYears*12;
    const effectiveRate=hasSubsidy?Math.max(0,annualRate-SUBSIDY_REDUCTION_DEFAULT):annualRate;
    const mr=effectiveRate/12/100;
    const af=mr===0?loanTermMonths:(1-Math.pow(1+mr,-loanTermMonths))/mr;

    // Ajuste de renta por tipo de empleo: bancos reconocen 100% a dependientes,
    // pero solo ~70-80% a independientes por variabilidad de ingresos (promedio 75%)
    const EMPLOYMENT_INCOME_FACTOR = employmentType === 'independent' ? 0.75 : 1.0;
    const adjustedMonthlyIncome = monthlyIncome * EMPLOYMENT_INCOME_FACTOR;

    // Cuotas disponibles brutas (usando ingreso ajustado reconocido por el banco)
    const aq25=adjustedMonthlyIncome*0.25-monthlyDebts;
    const aq30=adjustedMonthlyIncome*0.30-monthlyDebts;
    const aq33=adjustedMonthlyIncome*0.33-monthlyDebts;

    // Estimar seguro desgravamen ~0.15% mensual sobre saldo promedio (60% del inicial)
    // y recalcular crédito con cuota ajustada (iteración convergente)
    function estimateCredit(quota: number): number {
        if (quota <= 0 || mr <= 0) return 0;
        let credit = quota * af;
        for (let i = 0; i < 5; i++) {
            const estInsurance = credit * 0.6 * (TOTAL_INSURANCE_RATE / 1000);
            const adjQuota = Math.max(0, quota - estInsurance);
            const newCredit = Math.max(0, adjQuota * af);
            if (Math.abs(newCredit - credit) < 1000) break;
            credit = newCredit;
        }
        return Math.max(0, credit);
    }

    const mc25=estimateCredit(aq25);
    const mc30=estimateCredit(aq30);
    const mc33=estimateCredit(aq33);

    const ebp=propertyType==='used'?Math.min(bankPercentage,90):bankPercentage;

    // Valor de propiedad: si el pie disponible excede el necesario, aumenta el valor
    function computePropertyValue(maxCredit: number): number {
        if (maxCredit <= 0) return 0;
        const baseValue = maxCredit / (ebp/100);
        const requiredPie = baseValue - maxCredit;
        if (availableDownPayment > requiredPie) {
            return baseValue + (availableDownPayment - requiredPie);
        }
        return baseValue;
    }

    const pv25=computePropertyValue(mc25);
    const pv30=computePropertyValue(mc30);
    const pv33=computePropertyValue(mc33);

    // Seguro mensual estimado: saldo promedio del crédito (60% del inicial) * tasa total de seguros (%) / 12 meses.
    // TOTAL_INSURANCE_RATE ya está en puntos porcentuales mensuales (ej: 0.6%).
    // Se aproxima como: credito * 0.6 * (tasa/1000) para obtener CLP mensual.
    const im25 = mc25 > 0 ? mc25 * 0.6 * (TOTAL_INSURANCE_RATE / 1000) : 0;
    const im30 = mc30 > 0 ? mc30 * 0.6 * (TOTAL_INSURANCE_RATE / 1000) : 0;
    const im33 = mc33 > 0 ? mc33 * 0.6 * (TOTAL_INSURANCE_RATE / 1000) : 0;

    // Cuota real mensual (capital+intereses+seguro estimado)
    const realPayment25 = mc25>0?(mc25*mr)/(1-Math.pow(1+mr,-loanTermMonths))+im25:0;
    const realPayment30 = mc30>0?(mc30*mr)/(1-Math.pow(1+mr,-loanTermMonths))+im30:0;
    const realPayment33 = mc33>0?(mc33*mr)/(1-Math.pow(1+mr,-loanTermMonths))+im33:0;

    // DTI post-hipoteca (real: deudas + cuota real del préstamo)
    const dtiPostRatio25=monthlyIncome>0?((monthlyDebts+realPayment25)/monthlyIncome)*100:0;
    const dtiPostRatio30=monthlyIncome>0?((monthlyDebts+realPayment30)/monthlyIncome)*100:0;
    const dtiPostRatio33=monthlyIncome>0?((monthlyDebts+realPayment33)/monthlyIncome)*100:0;

    // DTI actual
    const dtiRatio=monthlyIncome>0?(monthlyDebts/monthlyIncome)*100:0;

    const tp25=aq25*loanTermMonths;
    const tp30=aq30*loanTermMonths;
    const tp33=aq33*loanTermMonths;
    const ti25=tp25-mc25;
    const ti30=tp30-mc30;
    const ti33=tp33-mc33;

    const totalInsurance25 = im25 * loanTermMonths;
    const totalInsurance30 = im30 * loanTermMonths;
    const totalInsurance33 = im33 * loanTermMonths;

    // Approval probability por escenario (usando ingreso ajustado reconocido por banco)
    const eval25 = evaluateScenario(adjustedMonthlyIncome, pv25, dtiPostRatio25, 25, propertyType, ufValue, employmentType, employmentYears);
    const eval30 = evaluateScenario(adjustedMonthlyIncome, pv30, dtiPostRatio30, 30, propertyType, ufValue, employmentType, employmentYears);
    const eval33 = evaluateScenario(adjustedMonthlyIncome, pv33, dtiPostRatio33, 33, propertyType, ufValue, employmentType, employmentYears);

    // Global approval = mejor escenario viable (priorizando mas conservador)
    const ap: 'high'|'medium'|'low' = eval25.ap==='high' ? 'high' : eval30.ap==='high' ? 'medium' : eval33.ap==='high' ? 'medium' : eval30.ap==='medium' || eval33.ap==='medium' ? 'medium' : 'low';
    let reason = eval25.reason || eval30.reason || eval33.reason;
    
    // Agregar nota sobre ajuste de renta para independientes
    if (employmentType === 'independent' && EMPLOYMENT_INCOME_FACTOR < 1.0) {
        const recognizedIncome = formatCurrency(adjustedMonthlyIncome);
        const actualIncome = formatCurrency(monthlyIncome);
        const adjustmentNote = `Como independiente, los bancos reconocen ~${Math.round(EMPLOYMENT_INCOME_FACTOR*100)}% de tu ingreso (${recognizedIncome} de ${actualIncome}).`;
        reason = reason ? `${reason} ${adjustmentNote}` : adjustmentNote;
    }

    // Gastos operacionales y CAE por escenario
    const fees25 = calculateOperationalFees(pv25, mc25, propertyType, ufValue);
    const fees30 = calculateOperationalFees(pv30, mc30, propertyType, ufValue);
    const fees33 = calculateOperationalFees(pv33, mc33, propertyType, ufValue);

    const totalCost25 = tp25 + totalInsurance25 + fees25.total;
    const totalCost30 = tp30 + totalInsurance30 + fees30.total;
    const totalCost33 = tp33 + totalInsurance33 + fees33.total;

    const minPieNeeded25 = pv25 - mc25 + fees25.total;
    const minPieNeeded30 = pv30 - mc30 + fees30.total;
    const minPieNeeded33 = pv33 - mc33 + fees33.total;

    const calcCae = (mc: number, totalIns: number, fees: number) => {
        if (mc <= 0) return 0;
        const monthlyInsuranceRate = (totalIns / loanTermMonths) / mc;
        const monthlyFeeRate = (fees / loanTermMonths) / mc;
        const effectiveMonthly = mr + monthlyInsuranceRate + monthlyFeeRate;
        return (Math.pow(1 + effectiveMonthly, 12) - 1) * 100;
    };
    const cae25 = calcCae(mc25, im25, fees25.total);
    const cae30 = calcCae(mc30, im30, fees30.total);
    const cae33 = calcCae(mc33, im33, fees33.total);

    return {
        monthlyIncome, monthlyDebts,
        adjustedMonthlyIncome,
        employmentIncomeFactor: EMPLOYMENT_INCOME_FACTOR,
        availableQuota25: Math.max(0, aq25), availableQuota30: Math.max(0, aq30), availableQuota33: Math.max(0, aq33),
        maxCredit25: mc25, maxCredit30: mc30, maxCredit33: mc33,
        propertyValue25: pv25, propertyValue30: pv30, propertyValue33: pv33,
        monthlyPayment25: realPayment25, monthlyPayment30: realPayment30, monthlyPayment33: realPayment33,
        loanTermYears,
        totalInsuranceMonthly: im30,
        totalInsurance25: im25, totalInsurance30: im30, totalInsurance33: im33,
        totalInterest25: Math.max(0, ti25), totalInterest30: Math.max(0, ti30), totalInterest33: Math.max(0, ti33),
        totalCost25, totalCost30, totalCost33,
        pie25: pv25 - mc25, pie30: pv30 - mc30, pie33: pv33 - mc33,
        approvalProbability: ap, approvalProbability25: eval25.ap, approvalProbability30: eval30.ap, approvalProbability33: eval33.ap,
        dtiRatio: dtiRatio,
        dtiPostRatio25, dtiPostRatio30, dtiPostRatio33,
        rejectionReason: reason,
        rejectionReason25: eval25.reason, rejectionReason30: eval30.reason, rejectionReason33: eval33.reason,
        cae25, cae30, cae33,
        totalFees25: fees25.total, totalFees30: fees30.total, totalFees33: fees33.total,
        feeDetails25: fees25, feeDetails30: fees30, feeDetails33: fees33,
        availableDownPayment,
        minPieNeeded25, minPieNeeded30, minPieNeeded33,
        capacity25: monthlyIncome * 0.25,
        capacity30: monthlyIncome * 0.30,
        capacity33: monthlyIncome * 0.33,
    };
}

export default function SimuladorPage() {
    const [ufValue,setUfValue]=useState(39643);
    const [clientName,setClientName]=useState('');
    const [monthlyIncome,setMonthlyIncome]=useState('800000');
    const [age,setAge]=useState('35');
    const [employmentType,setEmploymentType]=useState('dependent');
    const [employmentYears,setEmploymentYears]=useState('');
    const [annualRate,setAnnualRate]=useState('3.39');
    const [bankPercentage,setBankPercentage]=useState('80');
    const [customLoanYears,setCustomLoanYears]=useState('');
    const [propertyType,setPropertyType]=useState<'new'|'used'>('new');
    const [showAdvanced,setShowAdvanced]=useState(false);
    const [result,setResult]=useState<CalculationResult|null>(null);
    const [availableDownPayment,setAvailableDownPayment]=useState('');
    const [hasSubsidy, setHasSubsidy] = useState(false);
    const [debts, setDebts] = useState({
        dividendoHipotecario: '',
        creditoConsumo: '',
        tarjetaCredito: '',
        lineaCredito: '',
        creditoAutomotriz: '',
        otraDeuda: '',
    });
    const totalDebts = Object.values(debts).reduce((sum, v) => sum + parseCLP(v), 0);
    const [scenarioTab,setScenarioTab]=useState<'25'|'30'|'33'>('30');
    const [mortgageRates,setMortgageRates]=useState<MortgageRates|null>(null);

    useEffect(()=>{
        fetch('https://mindicador.cl/api/uf')
            .then(r=>r.json())
            .then((d:any)=>{ if(d?.serie?.[0]?.valor){ setUfValue(d.serie[0].valor); } })
            .catch(()=>{});
    },[]);

    useEffect(()=>{
        fetch('/api/public/mortgage-rates')
            .then(r=>r.json())
            .then((d:any)=>{ if(d.ok&&d.rates){ setMortgageRates(d.rates); setAnnualRate(d.rates.bestMarketRate.toString()); } })
            .catch(()=>{});
    },[]);

    const handleReset=useCallback(()=>{
        skipCalculationRef.current = true; // Evitar cálculo automático después de reset
        setMonthlyIncome('800000');setClientName('');setAge('35');
        setEmploymentType('dependent');setEmploymentYears('');setAnnualRate('3.39');setBankPercentage('80');
        setCustomLoanYears('');setPropertyType('new');setAvailableDownPayment('');setShowAdvanced(false);setScenarioTab('30');setResult(null);setHasSubsidy(false);
        setDebts({ dividendoHipotecario: '', creditoConsumo: '', tarjetaCredito: '', lineaCredito: '', creditoAutomotriz: '', otraDeuda: '' });
    },[]);

    const handleCalculate=useCallback(()=>{
        const income=parseCLP(monthlyIncome);
        const parsedAge=parseInt(age)||35;
        const parsedBankPct=parseFloat(bankPercentage)||80;
        if(!income||income<=0) { setResult(null); return; }
        if(parsedAge < 18) { setResult(null); return; }
        if(parsedBankPct <= 0 || parsedBankPct > 90) { setResult(null); return; }
        const res=calculateMortgage(
            income, parsedAge, parseFloat(annualRate)||3.39,
            parsedBankPct, 75,
            totalDebts,
            {
                customLoanYears: customLoanYears ? parseInt(customLoanYears) : undefined,
                hasSubsidy,
                propertyType,
                ufValue,
                employmentYears: parseFloat(employmentYears)||0,
                availableDownPayment: parseCLP(availableDownPayment),
                employmentType: employmentType as 'dependent'|'independent',
            }
        );
        setResult(res);
    },[monthlyIncome,age,annualRate,bankPercentage,debts,hasSubsidy,customLoanYears,propertyType,ufValue,employmentYears,availableDownPayment,employmentType]);

    useEffect(()=>{
        if (skipCalculationRef.current) {
            skipCalculationRef.current = false; // Resetear flag para próxima vez
            return;
        }
        handleCalculate();
    },[handleCalculate]);

    const handleDownload=useCallback(async()=>{
        if(!result)return;

        // Load logo as base64
        let logoBase64='';
        try{
            const resp=await fetch('/logo.png');
            const blob=await resp.blob();
            logoBase64=await new Promise<string>((res)=>{ const r=new FileReader(); r.onloadend=()=>res(r.result as string); r.readAsDataURL(blob); });
        }catch{/*logo will be omitted*/}

        const doc=new jsPDF();
        const pageW=doc.internal.pageSize.getWidth();
        const margin=18;
        const w=pageW-margin*2;
        let y=14;

        // INSTITUTIONAL PALETTE
        const C={
            navy:[23,37,84],black:[0,0,0],dark:[31,41,55],grey:[107,114,128],
            line:[229,231,235],light:[248,250,252],green:[16,185,129],
            amber:[245,158,11],red:[239,68,68],errorBg:[254,242,242],errorBorder:[239,68,68]
        };

        // Helpers
        const horizLine=(lw=0.4)=>{ doc.setDrawColor(...C.line as [number,number,number]); doc.setLineWidth(lw); doc.line(margin,y,margin+w,y); y+=4; };
        const thickLine=()=>{ doc.setDrawColor(...C.navy as [number,number,number]); doc.setLineWidth(1.2); doc.line(margin,y,margin+w,y); y+=6; };

        // ---- LETTERHEAD ----
        if(logoBase64){
            doc.addImage(logoBase64,'PNG',margin,y,14,14);
        }
        // Right-aligned meta
        doc.setFont('helvetica','normal'); doc.setTextColor(...C.grey as [number,number,number]); doc.setFontSize(8);
        doc.text('www.simplepropiedades.app',margin+w-doc.getTextWidth('www.simplepropiedades.app'),y+12);
        y+=20;
        thickLine();

        // Document meta row
        const docId='PCH-'+Date.now().toString().slice(-6);
        doc.setFont('helvetica','normal'); doc.setTextColor(...C.dark as [number,number,number]); doc.setFontSize(9);
        doc.text('DOCUMENTO: '+docId,margin,y);
        doc.text('FECHA: '+new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'}),margin+w-50,y);
        doc.text('HORA: '+new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}),margin+w-14,y);
        y+=10;
        horizLine();

        // ---- STATUS BOX ----
        const sem=scenarioTab==='25' ? result.approvalProbability25 : scenarioTab==='30' ? result.approvalProbability30 : result.approvalProbability33;
        const semLabel=getApprovalLabel(sem);
        const semColor=sem==='high'?C.green:sem==='medium'?C.amber:C.red;
        doc.setFillColor(...C.light as [number,number,number]);
        doc.setDrawColor(...C.line as [number,number,number]);
        doc.setLineWidth(0.4);
        doc.rect(margin,y,w,18,'FD');
        // left stripe
        doc.setFillColor(...semColor as [number,number,number]);
        doc.rect(margin,y,3,18,'F');
        doc.setFont('helvetica','bold'); doc.setTextColor(...C.dark as [number,number,number]); doc.setFontSize(8);
        doc.text('ESTADO DEL PERFIL',margin+7,y+6);
        doc.setFontSize(11); doc.setTextColor(...semColor as [number,number,number]);
        doc.text(semLabel.toUpperCase(),margin+7,y+14);
        doc.setFont('helvetica','normal'); doc.setTextColor(...C.grey as [number,number,number]); doc.setFontSize(8);
        const semMsg=getApprovalMessage(sem);
        doc.text(semMsg,margin+w-doc.getTextWidth(semMsg)-4,y+10);
        y+=24;

        // ---- TABLE HELPER (full grid) ----
        const gridRow=(label:string,value:string,h=10)=>{
            if(y+h>270){doc.addPage();y=14;}
            doc.setDrawColor(...C.line as [number,number,number]); doc.setLineWidth(0.3);
            doc.rect(margin,y,w,h,'S');
            // vertical separator at 55%
            doc.line(margin+w*0.55,y,margin+w*0.55,y+h);
            doc.setFont('helvetica','bold'); doc.setTextColor(...C.dark as [number,number,number]); doc.setFontSize(9);
            doc.text(label,margin+3,y+h-3);
            doc.setFont('helvetica','normal'); doc.setTextColor(...C.black as [number,number,number]); doc.setFontSize(9.5);
            doc.text(value,margin+w-3,y+h-3,{align:'right'});
            y+=h;
        };
        const gridHeader=(t:string)=>{
            doc.setFillColor(...C.navy as [number,number,number]);
            doc.rect(margin,y,w,10,'F');
            doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255); doc.setFontSize(9);
            doc.text(t.toUpperCase(),margin+3,y+7);
            y+=10;
        };

        // ---- SECTION: CLIENTE ----
        gridHeader('Datos del solicitante');
        gridRow('Nombre del cliente',clientName||'Sin nombre');
        gridRow('Ingreso liquido mensual',formatCurrency(result.monthlyIncome));
        gridRow('Deudas mensuales totales',formatCurrency(result.monthlyDebts));
        gridRow('Relacion deuda/ingreso (DTI)',result.dtiRatio.toFixed(1)+'%');
        gridRow('Tipo de empleo',employmentType==='dependent'?'Dependiente':'Independiente');
        gridRow('Antiguedad laboral',employmentYears?employmentYears+' años':'No indicado');
        gridRow('Tipo propiedad',propertyType==='new'?'Nueva':'Usada');
        gridRow('Pie disponible',result.availableDownPayment>0?formatCurrency(result.availableDownPayment):'No indicado');
        y+=4;

        // ---- SECTION: RESULTADO ----
        gridHeader('Resultado de la simulacion');
        gridRow('Tasa anual aplicada',annualRate+'%');
        gridRow('Plazo del credito',result.loanTermYears+' anos');
        gridRow('Valor max. propiedad (25% DTI)',formatCurrency(result.propertyValue25));
        gridRow('Valor max. propiedad (30% DTI) - RECOMENDADO',formatCurrency(result.propertyValue30));
        gridRow('Valor max. propiedad (33% DTI) - LIMITE',formatCurrency(result.propertyValue33));
        const activeTab = scenarioTab;
        const activePV = activeTab==='25' ? result.propertyValue25 : activeTab==='30' ? result.propertyValue30 : result.propertyValue33;
        const activePie = activeTab==='25' ? result.pie25 : activeTab==='30' ? result.pie30 : result.pie33;
        const activeMP = activeTab==='25' ? result.monthlyPayment25 : activeTab==='30' ? result.monthlyPayment30 : result.monthlyPayment33;
        const activeCredit = activeTab==='25' ? result.maxCredit25 : activeTab==='30' ? result.maxCredit30 : result.maxCredit33;
        const activeFees = activeTab==='25' ? result.totalFees25 : activeTab==='30' ? result.totalFees30 : result.totalFees33;
        const activeMinPie = activeTab==='25' ? result.minPieNeeded25 : activeTab==='30' ? result.minPieNeeded30 : result.minPieNeeded33;
        const activeInterest = activeTab==='25' ? result.totalInterest25 : activeTab==='30' ? result.totalInterest30 : result.totalInterest33;
        const activeCAE = activeTab==='25' ? result.cae25 : activeTab==='30' ? result.cae30 : result.cae33;
        const activeCost = activeTab==='25' ? result.totalCost25 : activeTab==='30' ? result.totalCost30 : result.totalCost33;
        gridRow('Pie Estimado ('+activeTab+'% DTI)',formatCurrency(activePie));
        gridRow('Cuota mensual estimada ('+activeTab+'% DTI)',formatCurrency(activeMP));
        gridRow('Monto del credito ('+activeTab+'% DTI)',formatCurrency(activeCredit));
        y+=4;

        // ---- SECTION: DETALLES ----
        gridHeader('Detalles adicionales');
        gridRow('Seguros mensuales estimados',formatCurrency(result.totalInsuranceMonthly));
        gridRow('Gastos operacionales estimados',formatCurrency(activeFees));
        gridRow('Pie total necesario (incl. gastos)',formatCurrency(activeMinPie));
        gridRow('Intereses totales estimados ('+activeTab+'%)',formatCurrency(activeInterest));
        gridRow('Costo Anual Equivalente (CAE)',activeCAE.toFixed(2)+'%');
        gridRow('Costo total estimado ('+activeTab+'%)',formatCurrency(activeCost));
        y+=6;
        horizLine();

        // ---- INFORME ----
        doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...C.navy as [number,number,number]);
        doc.text('INFORME DE CAPACIDAD HIPOTECARIA',margin,y); y+=8;
        doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...C.grey as [number,number,number]); doc.setFontSize(8);
        const disclaimer='El presente documento tiene caracter exclusivamente informativo y de orientacion. Los valores aqui contenidos son estimaciones calculadas con base en la informacion proporcionada por el solicitante y no constituyen una oferta de credito, compromiso de pago ni obligacion contractual de Simple Propiedades ni de ninguna entidad financiera. Las condiciones finales de cualquier producto crediticio seran determinadas por la institucion financiera correspondiente, sujeto a evaluacion de riesgo, verificacion de antecedentes comerciales y cumplimiento de los requisitos establecidos en sus politicas internas. Simple Propiedades declina toda responsabilidad por decisiones de inversion o credito tomadas con base en este documento.';
        const split=doc.splitTextToSize(disclaimer,w);
        doc.text(split,margin,y);
        y+=split.length*4+8;

        // Footer line
        doc.setDrawColor(...C.line as [number,number,number]); doc.setLineWidth(0.3);
        doc.line(margin,285,margin+w,285);
        doc.setFont('helvetica','normal'); doc.setTextColor(...C.grey as [number,number,number]); doc.setFontSize(7);
        doc.text('Simple Propiedades  |  Documento generado el '+new Date().toLocaleDateString('es-CL')+'  |  Pagina 1 de 1',margin,289);

        doc.save('Perfil_Crediticio_'+clientName.trim().replace(/\s+/g,'_')+'_'+Date.now()+'.pdf');
    },[result,clientName,annualRate,employmentType,propertyType,scenarioTab]);

    const activeApproval = result ? (scenarioTab==='25' ? result.approvalProbability25 : scenarioTab==='30' ? result.approvalProbability30 : result.approvalProbability33) : null;
    const activeReason = result ? (scenarioTab==='25' ? result.rejectionReason25 : scenarioTab==='30' ? result.rejectionReason30 : result.rejectionReason33) : null;
    const apColor=activeApproval?getApprovalColor(activeApproval):'bg-gray-400';
    const apLabel=activeApproval?getApprovalLabel(activeApproval):'SIN DATOS';
    const apMsg=activeApproval?getApprovalMessage(activeApproval,activeReason??undefined):'Ingresa datos para evaluar.';

    return (
        <div className="min-h-screen bg-[var(--bg-subtle)]">
            <div className="border-b bg-[var(--bg)] border-[var(--border)]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent)]">
                            <IconBuildingBank size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm" style={{color:'var(--fg)'}}>Simulador Hipotecario</h1>
                            <p className="text-[10px]" style={{color:'var(--fg-muted)'}}>Para asesores &middot; {ufValue.toLocaleString('es-CL')} UF </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]" style={{color:'var(--fg-muted)'}}>
                        <div className="flex items-center gap-1.5">
                            <IconStar size={14} style={{color:'var(--color-success)'}} />
                            <span>{mortgageRates?.bestMarketRate?.toFixed(2)??'3.39'}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconTrendingUp size={14} style={{color:'var(--fg)'}} />
                            <span>{mortgageRates?.standardRate?.toFixed(2)??'5.50'}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconCalculator size={14} style={{color:'var(--accent)'}} />
                            <span>CAE {result ? (scenarioTab==='25' ? result.cae25 : scenarioTab==='30' ? result.cae30 : result.cae33).toFixed(2) : ((mortgageRates?.bestMarketRate??3.39)+0.21).toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6 p-4 rounded-2xl border bg-[var(--bg)] border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <IconInfoCircle size={16} style={{color:'var(--accent)'}} />
                        <h2 className="font-semibold text-sm" style={{color:'var(--fg)'}}>Perfil rapido del cliente</h2>
                    </div>
                    <p className="text-xs" style={{color:'var(--fg-muted)'}}>Ingresa los datos basicos para evaluar capacidad de credito hipotecario en videollamada.</p>
                </div>

                {result&&(
                    <div className="mb-6 p-4 rounded-2xl border flex items-center gap-4 bg-[var(--bg)] border-[var(--border)]">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xs ${apColor}`}>
                            {activeApproval==='high'?<IconCheck size={24}/>:activeApproval==='low'?<IconX size={24}/>:<IconAlertTriangle size={24}/>}
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wide font-semibold" style={{color:'var(--fg-muted)'}}>Evaluacion</p>
                            <p className="text-lg font-bold" style={{color:'var(--fg)'}}>{apLabel}</p>
                            <p className="text-xs mt-0.5" style={{color:'var(--fg-muted)'}}>{apMsg}</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-3 space-y-4">
                        <div className="p-4 rounded-2xl border bg-[var(--bg)] border-[var(--border)]">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[var(--fg)]">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[var(--accent)]">1</div>
                                Datos del cliente
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Nombre completo</label>
                                    <input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: Juan Perez" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Ingreso líquido mensual</label>
                                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-sm border bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]">
                                        <span className="font-semibold">{formatCurrency(parseCLP(monthlyIncome) || 800000)}</span>
                                    </div>
                                    <input type="range" min={800000} max={10000000} step={50000} value={parseCLP(monthlyIncome) || 800000} onChange={e=>setMonthlyIncome(e.target.value)} className="w-full mt-2" />
                                    <div className="flex justify-between text-[10px] mt-1" style={{color:'var(--fg-muted)'}}>
                                        <span>$800.000</span>
                                        <span>$10.000.000</span>
                                    </div>
                                    {parseCLP(monthlyIncome) < MIN_MONTHLY_INCOME && (
                                        <p className="text-[10px] mt-1 text-red-500">Ingreso inferior al mínimo requerido ({formatCurrency(MIN_MONTHLY_INCOME)})</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Edad actual</label>
                                    <input type="number" min={18} max={75} value={age} onChange={e=>setAge(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)] ${age && (parseInt(age) < 18 || parseInt(age) > 75) ? 'ring-1 ring-red-400' : ''}`} />
                                    {age && parseInt(age) < 18 && <p className="text-[10px] mt-1 text-red-500">Edad mínima 18 años</p>}
                                    {age && parseInt(age) > 75 && <p className="text-[10px] mt-1 text-red-500">Edad máxima 75 años</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Tipo empleo</label>
                                    <ModernSelect
                                        value={employmentType}
                                        onChange={v=>setEmploymentType(v)}
                                        options={[
                                            {value:'dependent',label:'Dependiente'},
                                            {value:'independent',label:'Independiente'},
                                        ]}
                                        placeholder="Seleccionar"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Antigüedad laboral</label>
                                    <ModernSelect
                                        value={employmentYears}
                                        onChange={v=>setEmploymentYears(v)}
                                        options={[
                                            {value:'',label:'Seleccionar...'},
                                            {value:'0.25',label:'+3 meses'},
                                            {value:'0.5',label:'+6 meses'},
                                            {value:'1',label:'1 año'},
                                            {value:'2',label:'2 años'},
                                            {value:'3',label:'3 años'},
                                            {value:'4',label:'4 años'},
                                            {value:'5',label:'+5 años'},
                                        ]}
                                        placeholder="Seleccionar..."
                                        triggerClassName={activeReason?.includes('Antiguedad') ? 'ring-1 ring-red-400' : ''}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Ahorros disponibles (opcional)</label>
                                    <input type="text" inputMode="numeric" value={availableDownPayment} onChange={e=>setAvailableDownPayment(formatCLP(e.target.value))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 5.000.000" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border bg-[var(--bg)] border-[var(--border)]">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[var(--fg)]">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[var(--accent)]">2</div>
                                Deudas actuales mensuales
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Dividendo hipotecario</label>
                                        <input type="text" inputMode="numeric" value={debts.dividendoHipotecario} onChange={e=>setDebts(p=>({...p,dividendoHipotecario:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Crédito de consumo</label>
                                        <input type="text" inputMode="numeric" value={debts.creditoConsumo} onChange={e=>setDebts(p=>({...p,creditoConsumo:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Tarjeta de crédito</label>
                                        <input type="text" inputMode="numeric" value={debts.tarjetaCredito} onChange={e=>setDebts(p=>({...p,tarjetaCredito:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Línea de crédito</label>
                                        <input type="text" inputMode="numeric" value={debts.lineaCredito} onChange={e=>setDebts(p=>({...p,lineaCredito:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Crédito automotriz</label>
                                        <input type="text" inputMode="numeric" value={debts.creditoAutomotriz} onChange={e=>setDebts(p=>({...p,creditoAutomotriz:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Otra deuda</label>
                                        <input type="text" inputMode="numeric" value={debts.otraDeuda} onChange={e=>setDebts(p=>({...p,otraDeuda:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                            </div>
                            <div className="mt-2 p-2 rounded-lg border bg-[var(--bg-subtle)] border-[var(--border)]">
                                <div className="flex justify-between text-xs">
                                    <span style={{color:'var(--fg-muted)'}}>Total deudas mensuales</span>
                                    <span className="font-semibold" style={{color:'var(--fg)'}}>{formatCurrency(totalDebts)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border bg-[var(--bg)] border-[var(--border)]">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[var(--fg)]">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[var(--accent)]">3</div>
                                Condiciones del credito
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Tasa anual (%)</label>
                                    <input type="number" min={0} step="0.01" value={annualRate} onChange={e=>setAnnualRate(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" />
                                    <p className="text-[10px] mt-1" style={{color:'var(--fg-muted)'}}>Mejor tasa disponible</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Financiamiento (%)</label>
                                    <input type="number" min={0} max={90} value={bankPercentage} onChange={e=>setBankPercentage(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)] ${(parseFloat(bankPercentage)||80) <= 0 || (parseFloat(bankPercentage)||80) > 90 ? 'ring-1 ring-red-400' : ''}`} />
                                    {((parseFloat(bankPercentage)||80) <= 0 || (parseFloat(bankPercentage)||80) > 90) && <p className="text-[10px] mt-1 text-red-500">Debe ser entre 1 y 90</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Tipo propiedad</label>
                                    <ModernSelect
                                        value={propertyType}
                                        onChange={v=>setPropertyType(v as 'new'|'used')}
                                        options={[
                                            {value:'new',label:'Nueva'},
                                            {value:'used',label:'Usada'},
                                        ]}
                                        placeholder="Seleccionar"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{color:'var(--fg-muted)'}}>Plazo (años)</label>
                                    <ModernSelect
                                        value={customLoanYears}
                                        onChange={v=>setCustomLoanYears(v)}
                                        options={[
                                            {value:'',label:`Auto (${Math.max(5,Math.min(30,75-(parseInt(age)||35)))} años)`},
                                            ...[10,15,20,25,30].filter(y=>y<=Math.min(30,75-(parseInt(age)||35))).map(y=>({value:String(y),label:`${y} años`}))
                                        ]}
                                        placeholder="Auto"
                                        triggerClassName={parseInt(age||'35')+(customLoanYears?parseInt(customLoanYears):Math.max(5,Math.min(30,75-(parseInt(age)||35))))>75 ? 'ring-1 ring-red-400' : ''}
                                    />
                                    {parseInt(age||'35')+(customLoanYears?parseInt(customLoanYears):Math.max(5,Math.min(30,75-(parseInt(age)||35))))>75 && (
                                        <p className="text-[10px] mt-1" style={{color:'var(--color-error)'}}>El plazo excede el límite de edad (75 años). Se ajustará automáticamente.</p>
                                    )}
                                </div>
                                <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                                    <input type="checkbox" id="hasSubsidy" checked={hasSubsidy} onChange={e=>setHasSubsidy(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
                                    <label htmlFor="hasSubsidy" className="text-xs" style={{color:'var(--fg-muted)'}}>¿Cliente tiene subsidio estatal? (DS1 / DS49)</label>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={()=> handleCalculate()}
                            className="btn btn-primary w-full"
                        >
                            Actualizar cálculo
                        </button>
                    </div>
                    <div className="lg:col-span-2 space-y-4">
                        {result?(
                            <>
                                {/* Tabs escenario */}
                                {/* Helper values según tab activo */}
                                {(()=>{
                                    const activePV = scenarioTab==='25' ? result.propertyValue25 : scenarioTab==='30' ? result.propertyValue30 : result.propertyValue33;
                                    const activeMP = scenarioTab==='25' ? result.monthlyPayment25 : scenarioTab==='30' ? result.monthlyPayment30 : result.monthlyPayment33;
                                    const activePie = scenarioTab==='25' ? result.minPieNeeded25 : scenarioTab==='30' ? result.minPieNeeded30 : result.minPieNeeded33;
                                    const activeDTI = scenarioTab==='25' ? result.dtiPostRatio25 : scenarioTab==='30' ? result.dtiPostRatio30 : result.dtiPostRatio33;
                                    const activeCredit = scenarioTab==='25' ? result.maxCredit25 : scenarioTab==='30' ? result.maxCredit30 : result.maxCredit33;
                                    const activeInterest = scenarioTab==='25' ? result.totalInterest25 : scenarioTab==='30' ? result.totalInterest30 : result.totalInterest33;
                                    const activeInsurance = scenarioTab==='25' ? result.totalInsurance25 : scenarioTab==='30' ? result.totalInsurance30 : result.totalInsurance33;
                                    const activeCost = scenarioTab==='25' ? result.totalCost25 : scenarioTab==='30' ? result.totalCost30 : result.totalCost33;
                                    return (
                                        <>
                                <div className="flex rounded-xl border overflow-hidden bg-[var(--bg)] border-[var(--border)]">
                                    <button
                                        onClick={()=>setScenarioTab('25')}
                                        className="flex-1 py-2 text-xs font-medium text-center transition-colors"
                                        style={{
                                            background: scenarioTab==='25' ? 'var(--accent)' : 'transparent',
                                            color: scenarioTab==='25' ? '#fff' : 'var(--fg-muted)'
                                        }}
                                    >
                                        Conservador (25%)
                                    </button>
                                    <button
                                        onClick={()=>setScenarioTab('30')}
                                        className="flex-1 py-2 text-xs font-medium text-center transition-colors"
                                        style={{
                                            background: scenarioTab==='30' ? 'var(--accent)' : 'transparent',
                                            color: scenarioTab==='30' ? '#fff' : 'var(--fg-muted)'
                                        }}
                                    >
                                        Recomendado (30%)
                                    </button>
                                    <button
                                        onClick={()=>setScenarioTab('33')}
                                        className="flex-1 py-2 text-xs font-medium text-center transition-colors"
                                        style={{
                                            background: scenarioTab==='33' ? 'var(--accent)' : 'transparent',
                                            color: scenarioTab==='33' ? '#fff' : 'var(--fg-muted)'
                                        }}
                                    >
                                        Favorable (33%)
                                    </button>
                                </div>

                                {/* Hero: propiedad máxima */}
                                <div className="text-center p-2 rounded-xl" style={{background:'var(--bg-subtle)'}}>
                                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{color:'var(--fg-muted)'}}>Propiedad máxima que puede comprar</p>
                                    {activePV > 0 ? (
                                        <>
                                            <p className="text-3xl font-bold">{formatUF(activePV,ufValue)}</p>
                                            <p className="text-xs" style={{color:'var(--fg-muted)'}}>{formatCurrency(activePV)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-3xl font-bold" style={{color:'var(--fg-muted)'}}>—</p>
                                            <p className="text-xs" style={{color:'var(--fg-muted)'}}>Complete los datos para calcular</p>
                                        </>
                                    )}
                                </div>
                                {parseCLP(debts.dividendoHipotecario) > 0 && (
                                    <p className="text-[10px] text-center -mt-1" style={{color:'var(--color-warning)'}}>⚠ Cliente ya tiene dividendo hipotecario activo. Evaluar como segunda vivienda.</p>
                                )}

                                {/* 3 minicards */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-xl border text-center bg-[var(--bg)] border-[var(--border)]">
                                        <p className="text-[10px] uppercase font-semibold text-[var(--fg-muted)]">Cuota mensual ({scenarioTab}%)</p>
                                        <p className="text-sm font-semibold mt-0.5 text-[var(--fg)]">{formatCurrency(activeMP)}</p>
                                    </div>
                                    <div className="p-3 rounded-xl border text-center bg-[var(--bg)] border-[var(--border)]">
                                        <p className="text-[10px] uppercase font-semibold text-[var(--fg-muted)]">Pie total ({scenarioTab}%)</p>
                                        <p className="text-sm font-semibold mt-0.5 text-[var(--fg)]">{formatCurrency(activePie)}</p>
                                    </div>
                                    <div className="p-3 rounded-xl border text-center bg-[var(--bg)] border-[var(--border)]">
                                        <p className="text-[10px] uppercase font-semibold text-[var(--fg-muted)]">Plazo</p>
                                        <p className="text-sm font-semibold mt-0.5 text-[var(--fg)]">{result.loanTermYears} años</p>
                                    </div>
                                </div>

                                {/* DTI bars: actual + post-hipoteca */}
                                <div className="p-3 rounded-xl border space-y-3 bg-[var(--bg)] border-[var(--border)]">
                                    {/* DTI actual */}
                                    <div>
                                        <div className="flex justify-between text-[10px] items-center mb-1" style={{color:'var(--fg-muted)'}}>
                                            <span>Endeudamiento actual</span>
                                            <span className="font-semibold" style={{color:'var(--fg)'}}>DTI {result.dtiRatio.toFixed(1)}%</span>
                                        </div>
                                        <div className="relative w-full rounded-full h-2 bg-[var(--bg-subtle)] overflow-hidden">
                                            <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{width:`${Math.min((result.dtiRatio/40)*100,100)}%`,background: result.dtiRatio > 33 ? 'var(--color-error)' : result.dtiRatio > 25 ? 'var(--color-warning)' : 'var(--color-success)'}} />
                                        </div>
                                    </div>
                                    {/* DTI post-hipoteca */}
                                    <div>
                                        <div className="flex justify-between text-[10px] items-center mb-1" style={{color:'var(--fg-muted)'}}>
                                            <span>DTI post-hipoteca ({scenarioTab}%)</span>
                                            <span className="font-semibold" style={{color: activeDTI > 40 ? 'var(--color-error)' : activeDTI > 33 ? 'var(--color-warning)' : 'var(--color-success)'}}>{activeDTI.toFixed(1)}%</span>
                                        </div>
                                        <div className="relative w-full rounded-full h-2 bg-[var(--bg-subtle)] overflow-hidden">
                                            <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{width:`${Math.min((activeDTI/40)*100,100)}%`,background: activeDTI > 40 ? 'var(--color-error)' : activeDTI > 33 ? 'var(--color-warning)' : 'var(--color-success)'}} />
                                        </div>
                                    </div>
                                </div>

                                {/* Recomendación de bancos según DTI */}
                                <div className="p-3 rounded-xl border space-y-1.5 bg-[var(--bg)] border-[var(--border)]">
                                    <p className="text-[10px] uppercase font-semibold" style={{color:'var(--fg-muted)'}}>Probabilidad por banco (DTI {scenarioTab}%)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {getBankByDTI(activeDTI).map(b => (
                                            <div key={b.name} className="flex items-center justify-between text-[10px] px-2 py-1 rounded-lg" style={{
                                                background: b.status==='likely' ? 'rgba(34,197,94,0.08)' : b.status==='review' ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)',
                                                border: `1px solid ${b.status==='likely' ? '#22c55e' : b.status==='review' ? '#eab308' : '#ef4444'}`,
                                                color: b.status==='likely' ? '#22c55e' : b.status==='review' ? '#eab308' : '#ef4444'
                                            }}>
                                                <span className="font-medium">{b.name}</span>
                                                <span>{b.status==='likely' ? 'Probable' : b.status==='review' ? 'Revisar' : 'Baja'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pie disponible vs estimado */}
                                {parseCLP(availableDownPayment) > 0 && (
                                    <div className="p-3 rounded-xl border" style={{background:'var(--bg-subtle)',borderColor:'var(--border)'}}>
                                        <p className="text-[10px] uppercase font-semibold mb-1" style={{color:'var(--fg-muted)'}}>Ahorros disponibles</p>
                                        <div className="flex justify-between text-xs items-center">
                                            <span style={{color:'var(--fg-muted)'}}>Pie disponible</span>
                                            <span style={{color:'var(--fg)'}}>{formatCurrency(parseCLP(availableDownPayment))}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span style={{color:'var(--fg-muted)'}}>Pie estimado ({scenarioTab}% escenario)</span>
                                            <span style={{color:'var(--fg)'}}>{formatCurrency(activePie)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center font-semibold pt-1 border-t mt-1" style={{borderColor:'var(--border)'}}>
                                            <span style={{color: parseCLP(availableDownPayment) >= activePie ? 'var(--color-success)' : 'var(--color-warning)'}}>
                                                {parseCLP(availableDownPayment) >= activePie ? 'Excedente' : 'Déficit'}
                                            </span>
                                            <span style={{color: parseCLP(availableDownPayment) >= activePie ? 'var(--color-success)' : 'var(--color-warning)'}}>
                                                {formatCurrency(Math.abs(parseCLP(availableDownPayment) - activePie))}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                        </>
                                    );
                                })()}

                                <button onClick={()=>setShowAdvanced(!showAdvanced)} className="btn btn-outline w-full">
                                    {showAdvanced?<IconChevronUp size={14}/>:<IconChevronDown size={14}/>}
                                    {showAdvanced?'Ocultar desglose completo':'Ver desglose completo'}
                                </button>

                                {showAdvanced&&(
                                    <div className="p-4 rounded-2xl border space-y-3 text-xs bg-[var(--bg)] border-[var(--border)]">
                                        {activeReason && (
                                            <div className="p-2 rounded-lg border text-[10px]" style={{background:'rgba(239,68,68,0.05)',borderColor:'#ef4444',color:'#ef4444'}}>
                                                <strong>Motivo:</strong> {activeReason}
                                            </div>
                                        )}
                                        {/* Crédito */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2" style={{color:'var(--fg-muted)'}}>Crédito hipotecario</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Monto préstamo</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.maxCredit25 : scenarioTab==='30' ? result.maxCredit30 : result.maxCredit33)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Tasa anual</span><span style={{color:'var(--fg)'}}>{annualRate}%</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Intereses totales</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.totalInterest25 : scenarioTab==='30' ? result.totalInterest30 : result.totalInterest33)}</span></div>
                                            </div>
                                        </div>
                                        <div style={{borderColor:'var(--border)'}} className="border-t pt-2" />
                                        {/* Propiedad */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2" style={{color:'var(--fg-muted)'}}>Propiedad</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Valor propiedad</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.propertyValue25 : scenarioTab==='30' ? result.propertyValue30 : result.propertyValue33)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Pie Estimado</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.pie25 : scenarioTab==='30' ? result.pie30 : result.pie33)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Gastos operacionales</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.totalFees25 : scenarioTab==='30' ? result.totalFees30 : result.totalFees33)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Pie total requerido</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.minPieNeeded25 : scenarioTab==='30' ? result.minPieNeeded30 : result.minPieNeeded33)}</span></div>
                                            </div>
                                        </div>
                                        <div style={{borderColor:'var(--border)'}} className="border-t pt-2" />
                                        {/* Mensualidad */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2" style={{color:'var(--fg-muted)'}}>Mensualidad</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Cuota mensual</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.monthlyPayment25 : scenarioTab==='30' ? result.monthlyPayment30 : result.monthlyPayment33)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}} title="Seguros de desgravamen, sismo e incendio estimados sobre el saldo promedio del crédito.">Seguros mensuales (estimado) ℹ</span><span style={{color:'var(--fg)'}}>{formatCurrency(scenarioTab==='25' ? result.totalInsurance25 : scenarioTab==='30' ? result.totalInsurance30 : result.totalInsurance33)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}} title="Costo Anual Equivalente: incluye la tasa de interés, seguros y gastos operacionales distribuidos.">CAE (Costo Anual Equivalente) ℹ</span><span style={{color:'var(--fg)'}}>{(scenarioTab==='25' ? result.cae25 : scenarioTab==='30' ? result.cae30 : result.cae33).toFixed(2)}%</span></div>
                                            </div>
                                        </div>
                                        <div style={{borderColor:'var(--border)'}} className="border-t pt-2" />
                                        {/* Capacidad */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2" style={{color:'var(--fg-muted)'}}>Capacidad</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Capacidad máx. (25%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(result.capacity25)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Capacidad máx. (30%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(result.capacity30)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Capacidad máx. (33%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(result.capacity33)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Cuota disponible (25%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(result.availableQuota25)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Cuota disponible (30%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(result.availableQuota30)}</span></div>
                                                <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Cuota disponible (33%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(result.availableQuota33)}</span></div>
                                            </div>
                                        </div>
                                        <div style={{borderColor:'var(--border)'}} className="border-t pt-2" />
                                        {/* Desglose gastos */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2" style={{color:'var(--fg-muted)'}}>Desglose gastos operacionales</p>
                                            <div className="space-y-1">
                                                {(() => {
                                                    const fd = scenarioTab === '25' ? result.feeDetails25 : scenarioTab === '30' ? result.feeDetails30 : result.feeDetails33;
                                                    const rpv = scenarioTab === '25' ? result.propertyValue25 : scenarioTab === '30' ? result.propertyValue30 : result.propertyValue33;
                                                    return (
                                                        <>
                                                            <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Avalúo / Tasación</span><span style={{color:'var(--fg)'}}>{formatCurrency(fd.appraisal)}</span></div>
                                                            <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Notaría + Conservador (1.2%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(fd.notary)}</span></div>
                                                            {fd.stamps > 0 && <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Timbres y estampillas (1.5%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(fd.stamps)}</span></div>}
                                                            {fd.mortgageTax > 0 && <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Impuesto al mutuo (0.5%)</span><span style={{color:'var(--fg)'}}>{formatCurrency(fd.mortgageTax)}</span></div>}
                                                            <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Gastos bancarios</span><span style={{color:'var(--fg)'}}>{formatCurrency(fd.bankFees)}</span></div>
                                                            <div className="flex justify-between"><span style={{color:'var(--fg-muted)'}}>Estudio de títulos</span><span style={{color:'var(--fg)'}}>{formatCurrency(fd.titleStudy)}</span></div>
                                                            <div className="flex justify-between font-semibold pt-1 border-t mt-1" style={{borderColor:'var(--border)',color:'var(--fg)'}}>
                                                                <span>Total gastos</span>
                                                                <span>{formatCurrency(fd.total)}</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-[10px] mt-2" style={{color:'var(--fg-muted)'}}>Gastos calculados sobre valor máx. alcanzable</p>
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleReset} className="btn btn-outline w-full">
                                    <IconRotate size={14}/>
                                    Nueva simulación
                                </button>
                            </>
                        ):(
                            <div className="p-6 rounded-2xl border text-center bg-[var(--bg)] border-[var(--border)]">
                                <IconCalculator size={32} className="mx-auto mb-2" style={{color:'var(--fg-muted)'}} />
                                <p className="text-sm font-medium" style={{color:'var(--fg-muted)'}}>Ingresa los datos y calcula</p>
                            </div>
                        )}
                    </div>
                </div>
                {result&&(
                    <div className="mt-6">
                        <button onClick={handleDownload} className="btn btn-outline w-full">
                            <IconDownload size={18}/>Descargar resumen (PDF)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
