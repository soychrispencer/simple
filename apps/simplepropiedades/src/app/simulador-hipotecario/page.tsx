'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Flag para evitar cálculo automático inmediatamente después de reset
const skipCalculationRef = { current: false };

import {
    IconBuildingBank, IconTrendingUp, IconStar,
    IconCalculator, IconDownload, IconCheck, IconAlertTriangle, IconX,
    IconChevronDown, IconChevronUp, IconInfoCircle, IconRotate,
    IconExternalLink, IconCalendar, IconHome,
} from '@tabler/icons-react';
import { jsPDF } from 'jspdf';
import ModernSelect from '@/components/ui/modern-select';
import { CURRENT_RATES, getRateCitation, SUBSIDY_DS1_REDUCTION, EMPLOYMENT_FACTORS, MIN_EMPLOYMENT_YEARS, getDTILimits, CLIENT_SEGMENTS, type ClientSegment, DEBT_TYPE_FACTORS, DEBT_TYPES_INFO } from './rates.config';

// Nota: Ajuste por subsidio estatal. Valor referencial; validar con condiciones vigentes del banco/Subsidio DS1.
const SUBSIDY_REDUCTION_DEFAULT = SUBSIDY_DS1_REDUCTION;
const MAX_LOAN_YEARS = 30;
const TOTAL_INSURANCE_RATE = 0.45 + 0.08 + 0.065 + 0.002 + 0.003;
const MIN_MONTHLY_INCOME = 800000;

interface FeeBreakdown {
    total: number; appraisal: number; notary: number; stamps: number; mortgageTax: number; bankFees: number; titleStudy: number;
}
interface ScenarioResult {
    dti: number;
    availableQuota: number;
    maxCredit: number;
    propertyValue: number;
    monthlyPayment: number;
    totalInsurance: number;
    totalInterest: number;
    totalCost: number;
    pie: number;
    approvalProbability: 'high' | 'medium' | 'low';
    dtiPostRatio: number;
    rejectionReason?: string;
    cae: number;
    totalFees: number;
    feeDetails: FeeBreakdown;
    minPieNeeded: number;
    capacity: number;
}

interface CalculationResult {
    monthlyIncome: number; monthlyDebts: number;
    adjustedMonthlyIncome?: number; // Ingreso reconocido por el banco (ajustado para independientes)
    employmentIncomeFactor?: number; // Factor aplicado (1.0 para dependientes, ~0.6 para independientes)
    clientSegment: ClientSegment; // Segmento del cliente según ingreso
    recommended: ScenarioResult; // Escenario recomendado (DTI seguro)
    limit: ScenarioResult; // Escenario límite (DTI máximo por segmento)
    loanTermYears: number;
    totalInsuranceMonthly: number;
    approvalProbability: 'high' | 'medium' | 'low';
    dtiRatio: number;
    rejectionReason?: string;
    availableDownPayment: number;
    recommendedDTI: number; // DTI usado para escenario recomendado
    maxDTI: number; // DTI máximo para el segmento
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
function formatUF(a: number, uf=39643): string { return (a/uf).toLocaleString('es-CL',{minimumFractionDigits:0,maximumFractionDigits:0})+' UF'; }
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
    // Margen de tolerancia del 0.5% para evitar problemas de redondeo decimal
    const TOLERANCE = 0.5;
    
    if (dtiPost > scenarioPct + 5 + TOLERANCE) {
        return { ap: 'low', reason: `DTI post-hipoteca excede el ${scenarioPct + 5}% en escenario ${scenarioPct}%.` };
    }
    if (dtiPost > scenarioPct + TOLERANCE) {
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
    // Margen de 0.5% de tolerancia para evitar falsos negativos por redondeo
    const TOLERANCE = 0.5;
    return [
        { name: 'BancoEstado', status: dtiPost <= 25 + TOLERANCE ? 'likely' : dtiPost <= 30 + TOLERANCE ? 'review' : 'unlikely' },
        { name: 'Bco. Chile', status: dtiPost <= 30 + TOLERANCE ? 'likely' : dtiPost <= 33 + TOLERANCE ? 'review' : 'unlikely' },
        { name: 'Bci / Itaú', status: dtiPost <= 33 + TOLERANCE ? 'likely' : dtiPost <= 37 + TOLERANCE ? 'review' : 'unlikely' },
        { name: 'Santander', status: dtiPost <= 32 + TOLERANCE ? 'likely' : dtiPost <= 37 + TOLERANCE ? 'review' : 'unlikely' },
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
    const emptyScenario: ScenarioResult = {
        dti: 0, availableQuota: 0, maxCredit: 0, propertyValue: 0, monthlyPayment: 0,
        totalInsurance: 0, totalInterest: 0, totalCost: 0, pie: 0,
        approvalProbability: 'low', dtiPostRatio: 0, cae: 0, totalFees: 0,
        feeDetails: { total: 0, appraisal: 0, notary: 0, stamps: 0, mortgageTax: 0, bankFees: 0, titleStudy: 0 },
        minPieNeeded: 0, capacity: 0
    };
    return {
        monthlyIncome, monthlyDebts,
        clientSegment: CLIENT_SEGMENTS[0],
        recommended: { ...emptyScenario },
        limit: { ...emptyScenario },
        loanTermYears: 0,
        totalInsuranceMonthly: 0,
        approvalProbability: 'low',
        dtiRatio: 0,
        availableDownPayment,
        recommendedDTI: CLIENT_SEGMENTS[0].recommendedDTI,
        maxDTI: CLIENT_SEGMENTS[0].maxDTI,
        ...overrides
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
    
    // --- Obtener límites DTI según segmento del cliente ---
    const dtiLimits = getDTILimits(monthlyIncome);
    const { recommendedDTI, maxDTI } = dtiLimits;
    
    // --- Validaciones tempranas ---
    if (age >= maxAge) {
        return emptyMortgageResult(monthlyIncome, monthlyDebts, availableDownPayment, {
            rejectionReason: 'Edad supera el limite permitido (75 anos).',
            clientSegment: dtiLimits,
            recommendedDTI,
            maxDTI,
        });
    }
    if (annualRate <= 0) {
        return emptyMortgageResult(monthlyIncome, monthlyDebts, availableDownPayment, {
            rejectionReason: 'Tasa de interes invalida.',
            clientSegment: dtiLimits,
            recommendedDTI,
            maxDTI,
        });
    }

    const ageBasedTerm = Math.max(5, Math.min(maxAge - age, MAX_LOAN_YEARS));
    const loanTermYears = customLoanYears ? Math.min(customLoanYears, MAX_LOAN_YEARS) : ageBasedTerm;
    const loanTermMonths = loanTermYears * 12;
    const effectiveRate = hasSubsidy ? Math.max(0, annualRate - SUBSIDY_REDUCTION_DEFAULT) : annualRate;
    const mr = effectiveRate / 12 / 100;
    const af = mr === 0 ? loanTermMonths : (1 - Math.pow(1 + mr, -loanTermMonths)) / mr;

    // Ajuste de renta por tipo de empleo: bancos reconocen 100% a dependientes,
    // pero solo ~70-80% a independientes por variabilidad de ingresos (promedio 75%)
    const EMPLOYMENT_INCOME_FACTOR = employmentType === 'independent' ? 0.75 : 1.0;
    const adjustedMonthlyIncome = monthlyIncome * EMPLOYMENT_INCOME_FACTOR;

    // --- Funciones auxiliares ---
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

    function computePropertyValue(maxCredit: number): number {
        if (maxCredit <= 0) return 0;
        const ebp = propertyType === 'used' ? Math.min(bankPercentage, 90) : bankPercentage;
        const baseValue = maxCredit / (ebp / 100);
        const requiredPie = baseValue - maxCredit;
        if (availableDownPayment > requiredPie) {
            return baseValue + (availableDownPayment - requiredPie);
        }
        return baseValue;
    }

    function calculateScenario(dti: number): ScenarioResult {
        const availableQuota = adjustedMonthlyIncome * (dti / 100) - monthlyDebts;
        const maxCredit = estimateCredit(availableQuota);
        const propertyValue = computePropertyValue(maxCredit);
        
        // Seguro mensual
        const insuranceMonthly = maxCredit > 0 ? maxCredit * 0.6 * (TOTAL_INSURANCE_RATE / 1000) : 0;
        
        // Cuota real mensual
        const monthlyPayment = maxCredit > 0 
            ? (maxCredit * mr) / (1 - Math.pow(1 + mr, -loanTermMonths)) + insuranceMonthly 
            : 0;
        
        // DTI post-hipoteca
        const dtiPostRatio = monthlyIncome > 0 ? ((monthlyDebts + monthlyPayment) / monthlyIncome) * 100 : 0;
        
        // Total pagado
        const totalPayment = availableQuota * loanTermMonths;
        const totalInterest = Math.max(0, totalPayment - maxCredit);
        const totalInsurance = insuranceMonthly * loanTermMonths;
        
        // Gastos operacionales
        const fees = calculateOperationalFees(propertyValue, maxCredit, propertyType, ufValue);
        const totalCost = totalPayment + totalInsurance + fees.total;
        
        // Pie necesario
        const minPieNeeded = propertyValue - maxCredit + fees.total;
        
        // CAE
        const cae = maxCredit > 0 
            ? (Math.pow(1 + mr + (totalInsurance / loanTermMonths) / maxCredit + fees.total / loanTermMonths / maxCredit, 12) - 1) * 100 
            : 0;
        
        // Evaluación de probabilidad
        const evalResult = evaluateScenario(adjustedMonthlyIncome, propertyValue, dtiPostRatio, dti, propertyType, ufValue, employmentType, employmentYears);
        
        return {
            dti,
            availableQuota: Math.max(0, availableQuota),
            maxCredit,
            propertyValue,
            monthlyPayment,
            totalInsurance,
            totalInterest,
            totalCost,
            pie: propertyValue - maxCredit,
            approvalProbability: evalResult.ap,
            dtiPostRatio,
            rejectionReason: evalResult.reason,
            cae,
            totalFees: fees.total,
            feeDetails: fees,
            minPieNeeded,
            capacity: monthlyIncome * (dti / 100),
        };
    }

    // DTI actual
    const dtiRatio = monthlyIncome > 0 ? (monthlyDebts / monthlyIncome) * 100 : 0;

    // --- Calcular 2 escenarios ---
    const recommendedScenario = calculateScenario(recommendedDTI);
    const limitScenario = calculateScenario(maxDTI);

    // Global approval = mejor escenario viable (priorizando el recomendado)
    const ap: 'high' | 'medium' | 'low' = recommendedScenario.approvalProbability === 'high' 
        ? 'high' 
        : limitScenario.approvalProbability === 'high' 
            ? 'medium' 
            : recommendedScenario.approvalProbability === 'medium' || limitScenario.approvalProbability === 'medium' 
                ? 'medium' 
                : 'low';
    
    let reason = recommendedScenario.rejectionReason || limitScenario.rejectionReason;
    
    // Agregar nota sobre ajuste de renta para independientes
    if (employmentType === 'independent' && EMPLOYMENT_INCOME_FACTOR < 1.0) {
        const recognizedIncome = formatCurrency(adjustedMonthlyIncome);
        const actualIncome = formatCurrency(monthlyIncome);
        const adjustmentNote = `Como independiente, los bancos reconocen ~${Math.round(EMPLOYMENT_INCOME_FACTOR * 100)}% de tu ingreso (${recognizedIncome} de ${actualIncome}).`;
        reason = reason ? `${reason} ${adjustmentNote}` : adjustmentNote;
    }

    return {
        monthlyIncome,
        monthlyDebts,
        adjustedMonthlyIncome,
        employmentIncomeFactor: EMPLOYMENT_INCOME_FACTOR,
        clientSegment: dtiLimits,
        recommended: recommendedScenario,
        limit: limitScenario,
        loanTermYears,
        totalInsuranceMonthly: recommendedScenario.totalInsurance / loanTermMonths,
        approvalProbability: ap,
        dtiRatio,
        rejectionReason: reason,
        availableDownPayment,
        recommendedDTI,
        maxDTI,
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
    // Cálculo de deudas con factores por tipo (cómo realmente lo evalúan los bancos)
    const calculatedDebts = {
        dividendoHipotecario: parseCLP(debts.dividendoHipotecario) * DEBT_TYPE_FACTORS.dividendoHipotecario,
        creditoConsumo: parseCLP(debts.creditoConsumo) * DEBT_TYPE_FACTORS.creditoConsumo,
        tarjetaCredito: parseCLP(debts.tarjetaCredito) * DEBT_TYPE_FACTORS.tarjetaCredito,
        lineaCredito: parseCLP(debts.lineaCredito) * DEBT_TYPE_FACTORS.lineaCredito,
        creditoAutomotriz: parseCLP(debts.creditoAutomotriz) * DEBT_TYPE_FACTORS.creditoAutomotriz,
        otraDeuda: parseCLP(debts.otraDeuda) * DEBT_TYPE_FACTORS.otraDeuda,
    };
    const totalDebts = Object.values(calculatedDebts).reduce((sum, v) => sum + v, 0);
    const [scenarioTab,setScenarioTab]=useState<'recommended'|'limit'>('recommended');
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
            .then((d:any)=>{ 
                if(d.ok&&d.rates){ 
                    setMortgageRates(d.rates); 
                    setAnnualRate(d.rates.bestMarketRate.toString()); 
                } else {
                    // Fallback a tasas documentadas manualmente desde fuentes oficiales
                    setAnnualRate(CURRENT_RATES.bestMarketRate.value.toString());
                }
            })
            .catch(()=>{
                // Fallback si API falla
                setAnnualRate(CURRENT_RATES.bestMarketRate.value.toString());
            });
    },[]);

    const handleReset=useCallback(()=>{
        skipCalculationRef.current = true; // Evitar cálculo automático después de reset
        setMonthlyIncome('800000');setClientName('');setAge('35');
        setEmploymentType('dependent');setEmploymentYears('');setAnnualRate('3.39');setBankPercentage('80');
        setCustomLoanYears('');setPropertyType('new');setAvailableDownPayment('');setShowAdvanced(false);setScenarioTab('recommended');setResult(null);setHasSubsidy(false);
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
        const sem = scenarioTab === 'recommended' ? result.recommended.approvalProbability : result.limit.approvalProbability;
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
        const activeScenario = scenarioTab === 'recommended' ? result.recommended : result.limit;
        const activeLabel = scenarioTab === 'recommended' ? 'RECOMENDADO' : 'LIMITE';
        gridRow(`Valor max. propiedad (${result.recommendedDTI}% DTI - RECOMENDADO)`,formatCurrency(result.recommended.propertyValue));
        gridRow(`Valor max. propiedad (${result.maxDTI}% DTI - ${result.clientSegment.name.toUpperCase()})`,formatCurrency(result.limit.propertyValue));
        const activePV = activeScenario.propertyValue;
        const activePie = activeScenario.pie;
        const activeMP = activeScenario.monthlyPayment;
        const activeCredit = activeScenario.maxCredit;
        const activeFees = activeScenario.totalFees;
        const activeMinPie = activeScenario.minPieNeeded;
        const activeInterest = activeScenario.totalInterest;
        const activeCAE = activeScenario.cae;
        const activeCost = activeScenario.totalCost;
        gridRow(`Pie Estimado (${activeLabel})`,formatCurrency(activePie));
        gridRow(`Cuota mensual estimada (${activeLabel})`,formatCurrency(activeMP));
        gridRow(`Monto del credito (${activeLabel})`,formatCurrency(activeCredit));
        y+=4;

        // ---- SECTION: DETALLES ----
        gridHeader('Detalles adicionales');
        gridRow('Seguros mensuales estimados',formatCurrency(result.totalInsuranceMonthly));
        gridRow('Gastos operacionales estimados',formatCurrency(activeFees));
        gridRow('Pie total necesario (incl. gastos)',formatCurrency(activeMinPie));
        gridRow(`Intereses totales estimados (${activeLabel})`,formatCurrency(activeInterest));
        gridRow('Costo Anual Equivalente (CAE)',activeCAE.toFixed(2)+'%');
        gridRow(`Costo total estimado (${activeLabel})`,formatCurrency(activeCost));
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

    const activeScenario = result ? (scenarioTab === 'recommended' ? result.recommended : result.limit) : null;
    const activeApproval = activeScenario?.approvalProbability ?? null;
    const activeReason = activeScenario?.rejectionReason ?? null;
    const activeDTIPost = activeScenario?.dtiPostRatio ?? 0;
    const apColor=activeApproval?getApprovalColor(activeApproval):'bg-gray-400';
    const apLabel=activeApproval?getApprovalLabel(activeApproval):'SIN DATOS';
    const apMsg=activeApproval?getApprovalMessage(activeApproval,activeReason??undefined):'Ingresa datos para evaluar.';

    return (
        <div className="min-h-screen bg-[var(--bg-subtle)]">
            {/* Header original con indicadores */}
            <div className="border-b bg-[var(--bg)] border-[var(--border)]">
                <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Logo + título */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent)]">
                            <IconBuildingBank size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm text-[var(--fg)]">Simulador Hipotecario</h1>
                            <p className="text-[10px] text-[var(--fg-muted)]">Para asesores</p>
                        </div>
                    </div>
                    {/* Indicadores - en móvil se apilan horizontalmente */}
                    <div className="flex items-center gap-3 text-[11px] flex-wrap text-[var(--fg-muted)]">
                        <div className="flex items-center gap-1.5" title={`UF: ${getRateCitation(CURRENT_RATES.uf)}`}>
                            <span className="text-[10px] font-semibold">UF</span>
                            <span>{ufValue.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={`Mejor tasa: ${getRateCitation(CURRENT_RATES.bestMarketRate)}`}>
                            <IconStar size={14} className="text-[var(--color-success)]" />
                            <span>{mortgageRates?.bestMarketRate?.toFixed(2)??CURRENT_RATES.bestMarketRate.value.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={`Tasa promedio: ${getRateCitation(CURRENT_RATES.averageMarketRate)}`}>
                            <IconTrendingUp size={14} className="text-[var(--fg)]" />
                            <span>{mortgageRates?.standardRate?.toFixed(2)??CURRENT_RATES.averageMarketRate.value.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconCalculator size={14} className="text-[var(--accent)]" />
                            <span>CAE {result ? (scenarioTab === 'recommended' ? result.recommended.cae : result.limit.cae).toFixed(2) : ((mortgageRates?.bestMarketRate??CURRENT_RATES.bestMarketRate.value)+0.21).toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 py-4">

                {/* Evaluación principal - EL PROTAGONISTA */}
                {result && (
                    <div className="mb-6 p-5 rounded-2xl border flex items-center gap-5 bg-[var(--bg)] border-[var(--border)]">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${apColor}`}>
                            {activeApproval==='high'?<IconCheck size={32}/>:activeApproval==='low'?<IconX size={32}/>:<IconAlertTriangle size={32}/>}
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] uppercase tracking-wide font-semibold mb-1 text-[var(--fg-muted)]">Evaluación</p>
                            <p className="text-xl font-bold text-[var(--fg)]">{apLabel}</p>
                            <p className="text-sm mt-1 text-[var(--fg-muted)]">{apMsg}</p>
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
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Nombre completo</label>
                                    <input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: Juan Perez" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Ingreso líquido mensual</label>
                                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-sm border bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]">
                                        <span className="font-semibold">{formatCurrency(parseCLP(monthlyIncome) || 800000)}</span>
                                    </div>
                                    <input type="range" min={800000} max={10000000} step={50000} value={parseCLP(monthlyIncome) || 800000} onChange={e=>setMonthlyIncome(e.target.value)} className="w-full mt-2" />
                                    <div className="flex justify-between text-[10px] mt-1 text-[var(--fg-muted)]">
                                        <span>$800.000</span>
                                        <span>$10.000.000</span>
                                    </div>
                                    {parseCLP(monthlyIncome) < MIN_MONTHLY_INCOME && (
                                        <p className="text-[10px] mt-1 text-red-500">Ingreso inferior al mínimo requerido ({formatCurrency(MIN_MONTHLY_INCOME)})</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Edad actual</label>
                                    <input type="number" min={18} max={75} value={age} onChange={e=>setAge(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)] ${age && (parseInt(age) < 18 || parseInt(age) > 75) ? 'ring-1 ring-red-400' : ''}`} />
                                    {age && parseInt(age) < 18 && <p className="text-[10px] mt-1 text-red-500">Edad mínima 18 años</p>}
                                    {age && parseInt(age) > 75 && <p className="text-[10px] mt-1 text-red-500">Edad máxima 75 años</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Tipo empleo</label>
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
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Antigüedad laboral</label>
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
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Ahorros disponibles (opcional)</label>
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
                                    <label className="text-[10px] font-medium mb-1 block text-[var(--fg-muted)]" title={DEBT_TYPES_INFO.dividendoHipotecario.bankTreatment}>
                                        Dividendo hipotecario ℹ
                                    </label>
                                    <input type="text" inputMode="numeric" value={debts.dividendoHipotecario} onChange={e=>setDebts(p=>({...p,dividendoHipotecario:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block text-[var(--fg-muted)]" title={DEBT_TYPES_INFO.creditoConsumo.bankTreatment}>
                                        Crédito de consumo ℹ
                                    </label>
                                    <input type="text" inputMode="numeric" value={debts.creditoConsumo} onChange={e=>setDebts(p=>({...p,creditoConsumo:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block text-[var(--fg-muted)]" title={DEBT_TYPES_INFO.tarjetaCredito.bankTreatment}>
                                        Límite tarjeta crédito ℹ
                                    </label>
                                    <input type="text" inputMode="numeric" value={debts.tarjetaCredito} onChange={e=>setDebts(p=>({...p,tarjetaCredito:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 5.000.000" />
                                    <p className="text-[9px] mt-0.5 text-[var(--fg-muted)]">Se considera {(DEBT_TYPE_FACTORS.tarjetaCredito * 100).toFixed(0)}% del límite</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block text-[var(--fg-muted)]" title={DEBT_TYPES_INFO.lineaCredito.bankTreatment}>
                                        Límite línea crédito ℹ
                                    </label>
                                    <input type="text" inputMode="numeric" value={debts.lineaCredito} onChange={e=>setDebts(p=>({...p,lineaCredito:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 10.000.000" />
                                    <p className="text-[9px] mt-0.5 text-[var(--fg-muted)]">Se considera {(DEBT_TYPE_FACTORS.lineaCredito * 100).toFixed(0)}% del límite</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block text-[var(--fg-muted)]" title={DEBT_TYPES_INFO.creditoAutomotriz.bankTreatment}>
                                        Crédito automotriz ℹ
                                    </label>
                                    <input type="text" inputMode="numeric" value={debts.creditoAutomotriz} onChange={e=>setDebts(p=>({...p,creditoAutomotriz:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium mb-1 block text-[var(--fg-muted)]" title={DEBT_TYPES_INFO.otraDeuda.bankTreatment}>
                                        Otra deuda ℹ
                                    </label>
                                    <input type="text" inputMode="numeric" value={debts.otraDeuda} onChange={e=>setDebts(p=>({...p,otraDeuda:formatCLP(e.target.value)}))} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" placeholder="Ej: 0" />
                                </div>
                            </div>
                            <div className="mt-2 p-3 rounded-lg border bg-[var(--bg-subtle)] border-[var(--border)] space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-[var(--fg-muted)]">Total deudas mensuales (evaluación bancaria)</span>
                                    <span className="font-semibold text-[var(--fg)]">{formatCurrency(totalDebts)}</span>
                                </div>
                                {(parseCLP(debts.tarjetaCredito) > 0 || parseCLP(debts.lineaCredito) > 0) && (
                                    <div className="text-[10px] pt-1 border-t text-[var(--fg-muted)] border-[var(--border)]">
                                        <p className="mb-0.5"><strong>Cálculo real según bancos:</strong></p>
                                        {parseCLP(debts.dividendoHipotecario) > 0 && (
                                            <p>• Dividendo: {formatCurrency(parseCLP(debts.dividendoHipotecario))} × {(DEBT_TYPE_FACTORS.dividendoHipotecario * 100).toFixed(0)}% = {formatCurrency(calculatedDebts.dividendoHipotecario)}</p>
                                        )}
                                        {parseCLP(debts.creditoConsumo) > 0 && (
                                            <p>• Crédito consumo: {formatCurrency(parseCLP(debts.creditoConsumo))} × {(DEBT_TYPE_FACTORS.creditoConsumo * 100).toFixed(0)}% = {formatCurrency(calculatedDebts.creditoConsumo)}</p>
                                        )}
                                        {parseCLP(debts.tarjetaCredito) > 0 && (
                                            <p>• Tarjeta ({formatCurrency(parseCLP(debts.tarjetaCredito))} límite): {(DEBT_TYPE_FACTORS.tarjetaCredito * 100).toFixed(0)}% = {formatCurrency(calculatedDebts.tarjetaCredito)}</p>
                                        )}
                                        {parseCLP(debts.lineaCredito) > 0 && (
                                            <p>• Línea ({formatCurrency(parseCLP(debts.lineaCredito))} límite): {(DEBT_TYPE_FACTORS.lineaCredito * 100).toFixed(0)}% = {formatCurrency(calculatedDebts.lineaCredito)}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border bg-[var(--bg)] border-[var(--border)]">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[var(--fg)]">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[var(--accent)]">3</div>
                                Condiciones del credito
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Tasa anual (%)</label>
                                    <input type="number" min={0} step="0.01" value={annualRate} onChange={e=>setAnnualRate(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)]" />
                                    <div className="flex items-center gap-1 mt-1">
                                        <p className="text-[10px] text-[var(--fg-muted)]">
                                            Fuente: {CURRENT_RATES.bestMarketRate.source}
                                        </p>
                                        <a 
                                            href={CURRENT_RATES.bestMarketRate.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-[10px] hover:underline inline-flex items-center text-[var(--accent)]"
                                        >
                                            <IconExternalLink size={10} />
                                        </a>
                                    </div>
                                    <p className="text-[9px] mt-0.5 text-[var(--fg-muted)]">
                                        Última actualización: {CURRENT_RATES.bestMarketRate.lastUpdated}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Financiamiento (%)</label>
                                    <input type="number" min={0} max={90} value={bankPercentage} onChange={e=>setBankPercentage(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-sm border outline-none bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--fg)] ${(parseFloat(bankPercentage)||80) <= 0 || (parseFloat(bankPercentage)||80) > 90 ? 'ring-1 ring-red-400' : ''}`} />
                                    {((parseFloat(bankPercentage)||80) <= 0 || (parseFloat(bankPercentage)||80) > 90) && <p className="text-[10px] mt-1 text-red-500">Debe ser entre 1 y 90</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Tipo propiedad</label>
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
                                    <label className="text-xs font-medium mb-1 block text-[var(--fg-muted)]">Plazo (años)</label>
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
                                        <p className="text-[10px] mt-1 text-[var(--color-error)]">El plazo excede el límite de edad (75 años). Se ajustará automáticamente.</p>
                                    )}
                                </div>
                                <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                                    <input type="checkbox" id="hasSubsidy" checked={hasSubsidy} onChange={e=>setHasSubsidy(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
                                    <label htmlFor="hasSubsidy" className="text-xs text-[var(--fg-muted)]">¿Cliente tiene subsidio estatal? (DS1 / DS49)</label>
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
                                {(()=>{
                                    const activeScenario = scenarioTab === 'recommended' ? result.recommended : result.limit;
                                    const activeLabel = scenarioTab === 'recommended' ? 'RECOMENDADO' : `LIMITE ${result.clientSegment.name.toUpperCase()}`;
                                    const activeDTI = scenarioTab === 'recommended' ? result.recommendedDTI : result.maxDTI;
                                    const banks = getBankByDTI(activeScenario.dtiPostRatio);
                                    const bestBank = banks.find(b => b.status === 'likely') || banks[0];
                                    return (
                                        <>
                                {/* HERO CARD: Propiedad máxima - Diseño sobrio y moderno */}
                                <div className="rounded-xl border bg-[var(--bg)] border-[var(--border)] shadow-sm">
                                    {/* Header minimalista con tabs */}
                                    <div className="flex px-4 pt-4 pb-2">
                                        <button
                                            onClick={()=>setScenarioTab('recommended')}
                                            className="flex-1 pb-2 text-xs font-medium text-center transition-all border-b-2"
                                            style={{
                                                borderColor: scenarioTab==='recommended' ? 'var(--accent)' : 'transparent',
                                                color: scenarioTab==='recommended' ? 'var(--accent)' : 'var(--fg-muted)'
                                            }}
                                        >
                                            Recomendado ({result.recommendedDTI}%)
                                        </button>
                                        <button
                                            onClick={()=>setScenarioTab('limit')}
                                            className="flex-1 pb-2 text-xs font-medium text-center transition-all border-b-2"
                                            style={{
                                                borderColor: scenarioTab==='limit' ? 'var(--accent)' : 'transparent',
                                                color: scenarioTab==='limit' ? 'var(--accent)' : 'var(--fg-muted)'
                                            }}
                                        >
                                            Límite ({result.maxDTI}%)
                                        </button>
                                    </div>
                                    
                                    {/* Contenido principal - más aire */}
                                    <div className="px-6 pb-6 pt-2 text-center">
                                        {/* Perfil tag - más sutil */}
                                        <div className="flex items-center justify-center gap-2 mb-4">
                                            <span className="text-[10px] text-[var(--fg-muted)]">Perfil</span>
                                            <span 
                                                className="text-[10px] font-medium px-2 py-0.5 rounded-full" 
                                                style={{ 
                                                    background: result.clientSegment.name === 'Estándar' ? 'rgba(107,114,128,0.1)' : result.clientSegment.name === 'Premium' ? 'rgba(245,158,11,0.1)' : 'rgba(124,58,237,0.1)',
                                                    color: result.clientSegment.name === 'Estándar' ? '#6b7280' : result.clientSegment.name === 'Premium' ? '#f59e0b' : '#7c3aed'
                                                }}
                                            >
                                                {result.clientSegment.name}
                                            </span>
                                            <span className="text-[10px] text-[var(--fg-muted)]">• {activeLabel}</span>
                                        </div>
                                        
                                        {/* Título con icono sutil */}
                                        <div className="flex items-center justify-center gap-1.5 mb-3">
                                            <IconHome size={16} className="text-[var(--fg-muted)]" />
                                            <span className="text-[11px] uppercase tracking-wide text-[var(--fg-muted)]">Propiedad máxima que puedes comprar</span>
                                        </div>
                                        
                                        {/* Valor principal - NUMERO GIGANTE */}
                                        {activeScenario.propertyValue > 0 ? (
                                            <>
                                                <p className="text-5xl font-bold text-[var(--fg)] tracking-tight">{formatUF(activeScenario.propertyValue,ufValue)}</p>
                                                <p className="text-sm text-[var(--fg-muted)] mt-2 font-medium">{formatCurrency(activeScenario.propertyValue)}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-5xl font-bold text-[var(--fg-muted)]">—</p>
                                                <p className="text-sm text-[var(--fg-muted)] mt-2">Complete los datos para calcular</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {parseCLP(debts.dividendoHipotecario) > 0 && (
                                    <p className="text-[10px] text-center text-[var(--color-warning)]">⚠ Cliente ya tiene dividendo hipotecario activo. Evaluar como segunda vivienda.</p>
                                )}

                                {/* Cuota mensual DESTACADA + Pie + Plazo */}
                                <div className="space-y-3">
                                    {/* Cuota mensual - HERO */}
                                    <div className="p-4 rounded-xl border-2 text-center bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
                                        <p className="text-[11px] uppercase font-semibold text-emerald-600 mb-1">Cuota mensual a pagar</p>
                                        <p className="text-2xl font-bold text-[var(--fg)]">{formatCurrency(activeScenario.monthlyPayment)}</p>
                                        <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">incluye seguros aproximados</p>
                                    </div>
                                    
                                    {/* Grid Pie + Plazo */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl border text-center bg-[var(--bg)] border-[var(--border)]">
                                            <p className="text-[10px] uppercase font-semibold text-[var(--fg-muted)]">Pie total necesario</p>
                                            <p className="text-lg font-semibold mt-1 text-[var(--fg)]">{formatCurrency(activeScenario.minPieNeeded)}</p>
                                        </div>
                                        <div className="p-3 rounded-xl border text-center bg-[var(--bg)] border-[var(--border)]">
                                            <p className="text-[10px] uppercase font-semibold text-[var(--fg-muted)]">Plazo</p>
                                            <p className="text-lg font-semibold mt-1 text-[var(--fg)]">{result.loanTermYears} años</p>
                                            <p className="text-[9px] text-[var(--fg-muted)]">{result.loanTermYears * 12} meses</p>
                                        </div>
                                    </div>
                                </div>

                                {/* DTI UNIFICADO: Barra única visual */}
                                <div className="p-4 rounded-xl border bg-[var(--bg)] border-[var(--border)]">
                                    <div className="flex justify-between text-[11px] items-center mb-2">
                                        <span className="font-medium text-[var(--fg)]">Indicador de endeudamiento (DTI)</span>
                                        <span className={`font-semibold ${activeScenario.dtiPostRatio > 40 ? 'text-[var(--color-error)]' : activeScenario.dtiPostRatio > 33 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                                            {result.dtiRatio.toFixed(1)}% → {activeScenario.dtiPostRatio.toFixed(1)}%
                                        </span>
                                    </div>
                                    {/* Barra unificada con marcadores */}
                                    <div className="relative w-full rounded-full h-3 bg-[var(--bg-subtle)] overflow-hidden">
                                        {/* Zonas de color */}
                                        <div className="absolute top-0 left-0 h-full w-[62.5%] bg-gradient-to-r from-emerald-400 to-emerald-300 opacity-30" /> {/* Hasta 25% */}
                                        <div className="absolute top-0 left-[62.5%] h-full w-[20%] bg-gradient-to-r from-amber-300 to-amber-400 opacity-30" /> {/* 25-33% */}
                                        <div className="absolute top-0 left-[82.5%] h-full w-[17.5%] bg-gradient-to-r from-red-300 to-red-400 opacity-30" /> {/* 33%+ */}
                                        {/* Marcador DTI actual */}
                                        <div 
                                            className="absolute top-0 w-1 h-full bg-[var(--fg)] rounded-full z-10 transition-all"
                                            style={{left:`${Math.min((result.dtiRatio/40)*100,98)}%`}}
                                            title={`DTI actual: ${result.dtiRatio.toFixed(1)}%`}
                                        />
                                        {/* Barra DTI post-hipoteca */}
                                        <div 
                                            className={`absolute top-0 left-0 h-full rounded-full transition-all opacity-80 ${activeScenario.dtiPostRatio > 40 ? 'bg-[var(--color-error)]' : activeScenario.dtiPostRatio > 33 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`}
                                            style={{width:`${Math.min((activeScenario.dtiPostRatio/40)*100,100)}%`}}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[9px] mt-1.5 text-[var(--fg-muted)]">
                                        <span>0%</span>
                                        <span className="text-emerald-600">25% ideal</span>
                                        <span className="text-amber-600">33% límite</span>
                                        <span>40%</span>
                                    </div>
                                </div>

                                {/* Mejor opción bancaria simplificada */}
                                <div className="p-4 rounded-xl border bg-[var(--bg)] border-[var(--border)]">
                                    <p className="text-[10px] uppercase font-semibold mb-2 text-[var(--fg-muted)]">Mejor opción para este perfil</p>
                                    {bestBank.status === 'likely' ? (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                <IconCheck size={20} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-emerald-700">{bestBank.name}</p>
                                                <p className="text-xs text-emerald-600">Probabilidad alta de aprobación</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white">
                                                <IconAlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-amber-700">{bestBank.name}</p>
                                                <p className="text-xs text-amber-600">Requiere revisión adicional</p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Otros bancos en lista compacta */}
                                    <div className="mt-2 pt-2 border-t border-[var(--border)]">
                                        <p className="text-[9px] text-[var(--fg-muted)] mb-1">Otras opciones:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {banks.filter(b => b.name !== bestBank.name).map(b => (
                                                <span 
                                                    key={b.name} 
                                                    className={`text-[9px] px-1.5 py-0.5 rounded ${b.status==='likely' ? 'bg-emerald-500/10 text-emerald-600' : b.status==='review' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}
                                                >
                                                    {b.name}: {b.status==='likely' ? 'Probable' : b.status==='review' ? 'Revisar' : 'Baja'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Pie disponible vs estimado */}
                                {parseCLP(availableDownPayment) > 0 && (
                                    <div className="p-3 rounded-xl border bg-[var(--bg-subtle)] border-[var(--border)]">
                                        <p className="text-[10px] uppercase font-semibold mb-1 text-[var(--fg-muted)]">Ahorros disponibles</p>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-[var(--fg-muted)]">Pie disponible</span>
                                            <span className="text-[var(--fg)]">{formatCurrency(parseCLP(availableDownPayment))}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-[var(--fg-muted)]">Pie estimado ({scenarioTab === 'recommended' ? result.recommendedDTI : result.maxDTI}% escenario)</span>
                                            <span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.minPieNeeded : result.limit.minPieNeeded)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center font-semibold pt-1 border-t mt-1 border-[var(--border)]">
                                            <span className={parseCLP(availableDownPayment) >= (scenarioTab === 'recommended' ? result.recommended.minPieNeeded : result.limit.minPieNeeded) ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>
                                                {parseCLP(availableDownPayment) >= (scenarioTab === 'recommended' ? result.recommended.minPieNeeded : result.limit.minPieNeeded) ? 'Excedente' : 'Déficit'}
                                            </span>
                                            <span className={parseCLP(availableDownPayment) >= (scenarioTab === 'recommended' ? result.recommended.minPieNeeded : result.limit.minPieNeeded) ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>
                                                {formatCurrency(Math.abs(parseCLP(availableDownPayment) - (scenarioTab === 'recommended' ? result.recommended.minPieNeeded : result.limit.minPieNeeded)))}
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
                                            <div className="p-2 rounded-lg border text-[10px] bg-red-500/5 border-red-500 text-red-500">
                                                <strong>Motivo:</strong> {activeReason}
                                            </div>
                                        )}
                                        {/* Crédito */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2 text-[var(--fg-muted)]">Crédito hipotecario</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Monto préstamo</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.maxCredit : result.limit.maxCredit)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Tasa anual</span><span className="text-[var(--fg)]">{annualRate}%</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Intereses totales</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.totalInterest : result.limit.totalInterest)}</span></div>
                                            </div>
                                        </div>
                                        <div className="border-t border-[var(--border)] pt-2" />
                                        {/* Propiedad */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2 text-[var(--fg-muted)]">Propiedad</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Valor propiedad</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.propertyValue : result.limit.propertyValue)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Pie Estimado</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.pie : result.limit.pie)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Gastos operacionales</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.totalFees : result.limit.totalFees)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Pie total requerido</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.minPieNeeded : result.limit.minPieNeeded)}</span></div>
                                            </div>
                                        </div>
                                        <div className="border-t border-[var(--border)] pt-2" />
                                        {/* Mensualidad */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2 text-[var(--fg-muted)]">Mensualidad</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Cuota mensual</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.monthlyPayment : result.limit.monthlyPayment)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]" title="Seguros de desgravamen, sismo e incendio estimados sobre el saldo promedio del crédito.">Seguros mensuales (estimado) ℹ</span><span className="text-[var(--fg)]">{formatCurrency(scenarioTab === 'recommended' ? result.recommended.totalInsurance : result.limit.totalInsurance)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]" title="Costo Anual Equivalente: incluye la tasa de interés, seguros y gastos operacionales distribuidos.">CAE (Costo Anual Equivalente) ℹ</span><span className="text-[var(--fg)]">{(scenarioTab === 'recommended' ? result.recommended.cae : result.limit.cae).toFixed(2)}%</span></div>
                                            </div>
                                        </div>
                                        <div className="border-t border-[var(--border)] pt-2" />
                                        {/* Capacidad */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2 text-[var(--fg-muted)]">Capacidad</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Capacidad máx. recomendada ({result.recommendedDTI}%)</span><span className="text-[var(--fg)]">{formatCurrency(result.recommended.capacity)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Capacidad máx. límite ({result.maxDTI}%)</span><span className="text-[var(--fg)]">{formatCurrency(result.limit.capacity)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Cuota disponible recomendada</span><span className="text-[var(--fg)]">{formatCurrency(result.recommended.availableQuota)}</span></div>
                                                <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Cuota disponible límite</span><span className="text-[var(--fg)]">{formatCurrency(result.limit.availableQuota)}</span></div>
                                            </div>
                                        </div>
                                        <div className="border-t border-[var(--border)] pt-2" />
                                        {/* Desglose gastos */}
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold mb-2 text-[var(--fg-muted)]">Desglose gastos operacionales</p>
                                            <div className="space-y-1">
                                                {(() => {
                                                    const fd = scenarioTab === 'recommended' ? result.recommended.feeDetails : result.limit.feeDetails;
                                                    return (
                                                        <>
                                                            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Avalúo / Tasación</span><span className="text-[var(--fg)]">{formatCurrency(fd.appraisal)}</span></div>
                                                            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Notaría + Conservador (1.2%)</span><span className="text-[var(--fg)]">{formatCurrency(fd.notary)}</span></div>
                                                            {fd.stamps > 0 && <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Timbres y estampillas (1.5%)</span><span className="text-[var(--fg)]">{formatCurrency(fd.stamps)}</span></div>}
                                                            {fd.mortgageTax > 0 && <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Impuesto al mutuo (0.5%)</span><span className="text-[var(--fg)]">{formatCurrency(fd.mortgageTax)}</span></div>}
                                                            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Gastos bancarios</span><span className="text-[var(--fg)]">{formatCurrency(fd.bankFees)}</span></div>
                                                            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Estudio de títulos</span><span className="text-[var(--fg)]">{formatCurrency(fd.titleStudy)}</span></div>
                                                            <div className="flex justify-between font-semibold pt-1 border-t mt-1 border-[var(--border)] text-[var(--fg)]">
                                                                <span>Total gastos</span>
                                                                <span>{formatCurrency(fd.total)}</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-[10px] mt-2 text-[var(--fg-muted)]">Gastos calculados sobre valor máx. alcanzable</p>
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
                                <IconCalculator size={32} className="mx-auto mb-2 text-[var(--fg-muted)]" />
                                <p className="text-sm font-medium text-[var(--fg-muted)]">Ingresa los datos y calcula</p>
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
