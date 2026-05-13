'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@simple/auth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IconCalculator, IconDownload, IconHistory, IconDeviceFloppy, IconSparkles, IconInfoCircle, IconTrendingUp, IconShieldCheck, IconTrash, IconFileText } from '@tabler/icons-react';

// UF referencial
const UF_VALUE = 39643;
const MAX_LOAN_YEARS = 30; // Máximo plazo permitido por bancos en Chile

// Seguros hipotecarios (UF por cada 1000 UF de deuda)
const INSURANCE_RATES = {
    fireEarthquake: 0.0218,
    life: 0.0020,
    disability: 0.0042,
};

const TOTAL_INSURANCE_RATE = INSURANCE_RATES.fireEarthquake + INSURANCE_RATES.life + INSURANCE_RATES.disability;

interface CalculationResult {
    monthlyIncome: number;
    monthlyDebts: number;
    availableQuota25: number;
    availableQuota30: number;
    availableQuota33: number;
    maxCredit25: number;
    maxCredit30: number;
    maxCredit33: number;
    propertyValue25: number;
    propertyValue30: number;
    propertyValue33: number;
    monthlyPayment25: number;
    monthlyPayment30: number;
    monthlyPayment33: number;
    loanTermYears: number;
    totalInsuranceMonthly: number;
    totalInterest25: number;
    totalInterest30: number;
    totalInterest33: number;
    totalCost25: number;
    totalCost30: number;
    totalCost33: number;
    pie25: number;
    pie30: number;
    pie33: number;
    approvalProbability: 'high' | 'medium' | 'low';
    dtiRatio: number;
}

interface SavedSimulation {
    id: string;
    name: string;
    date: string;
    monthlyIncome: number;
    loanTermYears: number;
    propertyValue25: number;
    propertyValue33: number;
    clientName?: string;
    notes?: string;
}

interface MortgageRates {
    standardRate: number;
    subsidyRate: number;
    bestMarketRate: number;
    sourceName: string;
    sourceUrl: string | null;
    updatedAt: string;
    notes?: string;
}

function calculateMortgage(
    monthlyIncome: number,
    age: number,
    annualRate: number,
    bankPercentage: number,
    maxAge: number,
    monthlyDebts: number,
    customLoanYears?: number,
    hasSubsidy: boolean = false,
    propertyType: 'new' | 'used' = 'new'
): CalculationResult {
    // Calcular plazo en años - limitado a máximo 30 años (regla bancaria chilena)
    const ageBasedTerm = Math.max(5, Math.min(maxAge - age, MAX_LOAN_YEARS));
    const loanTermYears = customLoanYears ? Math.min(customLoanYears, MAX_LOAN_YEARS) : ageBasedTerm;
    const loanTermMonths = loanTermYears * 12;

    // Ajustar tasa si tiene subsidio (tasa reducida ~4.19% vs 5.5% normal)
    const effectiveRate = hasSubsidy ? 4.19 : annualRate;

    const availableQuota25 = monthlyIncome * 0.25 - monthlyDebts;
    const availableQuota30 = monthlyIncome * 0.30 - monthlyDebts;
    const availableQuota33 = monthlyIncome * 0.33 - monthlyDebts;

    const monthlyRate = effectiveRate / 12 / 100;

    const annuityFactor = monthlyRate === 0
        ? loanTermMonths
        : (1 - Math.pow(1 + monthlyRate, -loanTermMonths)) / monthlyRate;

    const maxCredit25 = Math.max(0, availableQuota25 * annuityFactor);
    const maxCredit30 = Math.max(0, availableQuota30 * annuityFactor);
    const maxCredit33 = Math.max(0, availableQuota33 * annuityFactor);

    // Ajustar financiamiento para propiedades usadas
    const effectiveBankPercentage = propertyType === 'used' 
        ? Math.min(bankPercentage, 75) 
        : bankPercentage;

    const propertyValue25 = maxCredit25 / (effectiveBankPercentage / 100);
    const propertyValue30 = maxCredit30 / (effectiveBankPercentage / 100);
    const propertyValue33 = maxCredit33 / (bankPercentage / 100);

    // Cuota mensual disponible
    const monthlyPayment25 = availableQuota25;
    const monthlyPayment30 = availableQuota30;
    const monthlyPayment33 = availableQuota33;

    const avgCredit25 = maxCredit25 / 2;
    const avgCredit30 = maxCredit30 / 2;
    const avgCredit33 = maxCredit33 / 2;
    const insuranceMonthly25 = (avgCredit25 / UF_VALUE / 1000) * TOTAL_INSURANCE_RATE * UF_VALUE;
    const insuranceMonthly30 = (avgCredit30 / UF_VALUE / 1000) * TOTAL_INSURANCE_RATE * UF_VALUE;
    const insuranceMonthly33 = (avgCredit33 / UF_VALUE / 1000) * TOTAL_INSURANCE_RATE * UF_VALUE;

    // Cálculo de intereses totales pagados
    const totalPaid25 = monthlyPayment25 * loanTermMonths;
    const totalPaid30 = monthlyPayment30 * loanTermMonths;
    const totalPaid33 = monthlyPayment33 * loanTermMonths;
    const totalInterest25 = totalPaid25 - maxCredit25;
    const totalInterest30 = totalPaid30 - maxCredit30;
    const totalInterest33 = totalPaid33 - maxCredit33;

    // Costo total incluyendo seguros estimados
    const avgInsuranceMonthly = (insuranceMonthly25 + insuranceMonthly30 + insuranceMonthly33) / 3;
    const totalInsuranceCost = avgInsuranceMonthly * loanTermMonths;
    const totalCost25 = totalPaid25 + totalInsuranceCost;
    const totalCost30 = totalPaid30 + totalInsuranceCost;
    const totalCost33 = totalPaid33 + totalInsuranceCost;

    // Calcular DTI actual y probabilidad de aprobación
    const monthlyDebtWithMortgage = monthlyDebts + availableQuota30;
    const dtiRatio = monthlyIncome > 0 ? (monthlyDebtWithMortgage / monthlyIncome) * 100 : 0;
    
    let approvalProbability: 'high' | 'medium' | 'low' = 'medium';
    if (dtiRatio <= 30) {
        approvalProbability = 'high';
    } else if (dtiRatio <= 33) {
        approvalProbability = 'medium';
    } else {
        approvalProbability = 'low';
    }

    if (hasSubsidy && approvalProbability === 'medium') {
        approvalProbability = 'high';
    }

    return {
        monthlyIncome,
        monthlyDebts,
        availableQuota25,
        availableQuota30,
        availableQuota33,
        maxCredit25,
        maxCredit30,
        maxCredit33,
        propertyValue25,
        propertyValue30,
        propertyValue33,
        monthlyPayment25: availableQuota25,
        monthlyPayment30: availableQuota30,
        monthlyPayment33: availableQuota33,
        loanTermYears,
        totalInsuranceMonthly: avgInsuranceMonthly,
        totalInterest25: Math.max(0, totalInterest25),
        totalInterest30: Math.max(0, totalInterest30),
        totalInterest33: Math.max(0, totalInterest33),
        totalCost25,
        totalCost30,
        totalCost33,
        pie25: propertyValue25 - maxCredit25,
        pie30: propertyValue30 - maxCredit30,
        pie33: propertyValue33 - maxCredit33,
        approvalProbability,
        dtiRatio,
    };
}

function formatCurrency(value: number): string {
    if (value < 0) return '$0';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatUF(value: number): string {
    if (value < 0) return '0 UF';
    return `${(value / UF_VALUE).toFixed(1)} UF`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function SimuladorPanelPage() {
    const { user } = useAuth();
    const isPro = user?.role === 'admin' || user?.role === 'superadmin';

    // Form state
    const [monthlyIncome, setMonthlyIncome] = useState<string>('2500000');
    const [age, setAge] = useState<string>('35');
    const [annualRate, setAnnualRate] = useState<string>('5.5');
    const [bankPercentage, setBankPercentage] = useState<string>('80');
    const [maxAge, setMaxAge] = useState<string>('75');
    const [monthlyDebts, setMonthlyDebts] = useState<string>('0');
    const [customLoanYears, setCustomLoanYears] = useState<string>('20');
    const [hasSubsidy, setHasSubsidy] = useState<boolean>(false);
    const [propertyType, setPropertyType] = useState<'new' | 'used'>('new');

    // PRO features state
    const [clientName, setClientName] = useState('');
    const [notes, setNotes] = useState('');
    const [mortgageRates, setMortgageRates] = useState<MortgageRates | null>(null);
    const [ratesLoading, setRatesLoading] = useState(true);

    // Load mortgage rates from API on mount
    useEffect(() => {
        async function loadRates() {
            try {
                const response = await fetch('/api/public/mortgage-rates');
                const data = await response.json();
                if (data.ok && data.rates) {
                    setMortgageRates(data.rates);
                    // Update default rate if not manually set
                    setAnnualRate(data.rates.standardRate.toString());
                }
            } catch (error) {
                console.error('Failed to load mortgage rates:', error);
            } finally {
                setRatesLoading(false);
            }
        }
        loadRates();
    }, []);

    // Load saved simulations from localStorage on mount
    useEffect(() => {
        const savedSimulations = localStorage.getItem('savedSimulations');
        if (savedSimulations) {
            setSavedSimulations(JSON.parse(savedSimulations));
        }
    }, []);

    const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([
        // Demo data
        {
            id: '1',
            name: 'Juan Pérez',
            date: new Date(Date.now() - 86400000 * 2).toISOString(),
            monthlyIncome: 1800000,
            loanTermYears: 25,
            propertyValue25: 55000000,
            propertyValue33: 72000000,
            notes: 'Interesado en departamento en Ñuñoa',
        },
        {
            id: '2',
            name: 'María González',
            date: new Date(Date.now() - 86400000 * 5).toISOString(),
            monthlyIncome: 3200000,
            loanTermYears: 20,
            propertyValue25: 98000000,
            propertyValue33: 128000000,
            notes: 'Busca casa en La Reina',
        },
    ]);

    // Save simulations to localStorage on change
    useEffect(() => {
        if (savedSimulations) {
            localStorage.setItem('savedSimulations', JSON.stringify(savedSimulations));
        }
    }, [savedSimulations]);

    // Calculate results
    const result = useMemo(() => {
        return calculateMortgage(
            parseFloat(monthlyIncome) || 0,
            parseInt(age) || 35,
            parseFloat(annualRate) || 5.5,
            parseFloat(bankPercentage) || 80,
            parseInt(maxAge) || 75,
            parseFloat(monthlyDebts) || 0,
            customLoanYears ? parseInt(customLoanYears) : undefined,
            hasSubsidy,
            propertyType
        );
    }, [monthlyIncome, age, annualRate, bankPercentage, maxAge, monthlyDebts, customLoanYears, hasSubsidy, propertyType]);

    const hasValidIncome = result.monthlyIncome > 0;

    const handleSaveSimulation = () => {
        if (!clientName.trim()) return;

        const newSimulation: SavedSimulation = {
            id: Date.now().toString(),
            name: clientName.trim(),
            date: new Date().toISOString(),
            monthlyIncome: result.monthlyIncome,
            loanTermYears: result.loanTermYears,
            propertyValue25: result.propertyValue25,
            propertyValue33: result.propertyValue33,
            notes: notes.trim() || undefined,
        };

        setSavedSimulations(prev => [newSimulation, ...prev]);
        setClientName('');
        setNotes('');
    };

    const handleExportPDF = useCallback(() => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        
        // SimplePropiedades Brand Colors
        const rBrand = 50, gBrand = 50, bBrand = 255;      // #3232FF - Accent color
        const rDark = 9, gDark = 9, bDark = 11;          // #09090b - Primary text
        const rSec = 82, gSec = 82, bSec = 91;           // #52525b - Secondary text
        const rMute = 161, gMute = 161, bMute = 170;      // #a1a1aa - Muted text
        const rLight = 250, gLight = 250, bLight = 250;   // #fafafa - Background
        const rSub = 235, gSub = 235, bSub = 232;         // #ebebe8 - Subtle background
        const rWhite = 255, gWhite = 255, bWhite = 255;    // White
        
        // === HEADER ===
        doc.setFillColor(rLight, gLight, bLight);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        // Blue accent bar at top
        doc.setFillColor(rBrand, gBrand, bBrand);
        doc.roundedRect(margin, 15, 6, 20, 2, 2, 'F');
        
        // Logo text "Simple" in dark, "Propiedades" in blue
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(rDark, gDark, bDark);
        doc.text('Simple', margin + 14, 28);
        doc.setTextColor(rBrand, gBrand, bBrand);
        doc.text('Propiedades', margin + 14 + doc.getTextWidth('Simple '), 28);
        
        // Subtitle
        doc.setFontSize(11);
        doc.setTextColor(rSec, gSec, bSec);
        doc.setFont('helvetica', 'normal');
        doc.text('Simulación Hipotecaria', margin + 14, 38);
        
        // Date in top right
        doc.setFontSize(9);
        doc.setTextColor(rMute, gMute, bMute);
        doc.text(new Date().toLocaleDateString('es-CL', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        }), pageWidth - margin, 28, { align: 'right' });
        
        // === CLIENT INFO ===
        let yPos = 65;
        if (clientName || notes) {
            doc.setFontSize(11);
            doc.setTextColor(rDark, gDark, bDark);
            doc.setFont('helvetica', 'bold');
            doc.text('Información del Cliente', margin, yPos);
            doc.setFont('helvetica', 'normal');
            
            yPos += 8;
            if (clientName) {
                doc.setFontSize(9);
                doc.setTextColor(rSec, gSec, bSec);
                doc.text(`Cliente: ${clientName}`, margin, yPos);
                yPos += 5;
            }
            if (notes) {
                doc.setTextColor(rMute, gMute, bMute);
                doc.text(`Notas: ${notes}`, margin, yPos);
                yPos += 5;
            }
            yPos += 8;
        }
        
        // === DATOS DEL SOLICITANTE TABLE ===
        autoTable(doc, {
            startY: yPos,
            head: [['PARÁMETROS DEL CRÉDITO', '']],
            body: [
                ['Ingreso líquido mensual', formatCurrency(result.monthlyIncome)],
                ['Edad del solicitante', `${age} años`],
                ['Plazo del crédito', `${result.loanTermYears} años`],
                ['Tasa de interés anual', `${annualRate}%`],
                ['Porcentaje de financiamiento', `${bankPercentage}%`],
                ['Cargas crediticias actuales', formatCurrency(result.monthlyDebts)],
            ],
            theme: 'plain',
            headStyles: { 
                fillColor: [rBrand, gBrand, bBrand], 
                textColor: [rWhite, gWhite, bWhite],
                fontStyle: 'bold',
                fontSize: 10,
                halign: 'left',
                cellPadding: { top: 6, bottom: 6, left: 8, right: 8 }
            },
            bodyStyles: { 
                fontSize: 10,
                textColor: [rDark, gDark, bDark],
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
            },
            columnStyles: {
                0: { fillColor: [rSub, gSub, bSub], textColor: [rSec, gSec, bSec], fontStyle: 'bold' },
                1: { halign: 'right', fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [rLight, gLight, bLight] },
            margin: { left: margin, right: margin },
            styles: { lineColor: [212, 212, 216], lineWidth: 0.5 }
        });
        
        // === CAPACIDAD HIPOTECARIA ===
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
        doc.setFontSize(11);
        doc.setTextColor(rDark, gDark, bDark);
        doc.setFont('helvetica', 'bold');
        doc.text('Capacidad Hipotecaria', margin, yPos);
        doc.setFont('helvetica', 'normal');
        
        yPos += 8;
        autoTable(doc, {
            startY: yPos,
            head: [['ESCENARIO', 'CUOTA MENSUAL']],
            body: [
                ['Conservador (25% de ingresos)', formatCurrency(result.availableQuota25)],
                ['Realista (30% de ingresos) - Estándar 2026', formatCurrency(result.availableQuota30)],
                ['Favorable (33% de ingresos)', formatCurrency(result.availableQuota33)],
            ],
            theme: 'plain',
            headStyles: { 
                fillColor: [rBrand, gBrand, bBrand], 
                textColor: [rWhite, gWhite, bWhite],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
            },
            bodyStyles: { 
                fontSize: 10,
                textColor: [rDark, gDark, bDark],
                cellPadding: { top: 6, bottom: 6, left: 8, right: 8 }
            },
            columnStyles: {
                0: { fillColor: [rSub, gSub, bSub], textColor: [rSec, gSec, bSec] },
                1: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: margin, right: margin },
            styles: { lineColor: [212, 212, 216], lineWidth: 0.5 }
        });
        
        // === VALOR DE PROPIEDAD ===
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
        doc.setFontSize(11);
        doc.setTextColor(rDark, gDark, bDark);
        doc.setFont('helvetica', 'bold');
        doc.text('Valor de Propiedad Asequible', margin, yPos);
        doc.setFont('helvetica', 'normal');
        
        yPos += 8;
        autoTable(doc, {
            startY: yPos,
            head: [['CONCEPTO', 'ESCENARIO 25%', 'ESCENARIO 30%', 'ESCENARIO 33%']],
            body: [
                ['Valor máximo de propiedad', formatCurrency(result.propertyValue25), formatCurrency(result.propertyValue30), formatCurrency(result.propertyValue33)],
                ['Monto del crédito', formatCurrency(result.maxCredit25), formatCurrency(result.maxCredit30), formatCurrency(result.maxCredit33)],
                ['Pie necesario', formatCurrency(result.pie25), formatCurrency(result.pie30), formatCurrency(result.pie33)],
                ['Valor en UF', formatUF(result.propertyValue25), formatUF(result.propertyValue30), formatUF(result.propertyValue33)],
            ],
            theme: 'plain',
            headStyles: { 
                fillColor: [rBrand, gBrand, bBrand], 
                textColor: [rWhite, gWhite, bWhite],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
            },
            bodyStyles: { 
                fontSize: 10,
                textColor: [rDark, gDark, bDark],
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
            },
            columnStyles: {
                0: { fillColor: [rSub, gSub, bSub], textColor: [rSec, gSec, bSec] },
                1: { halign: 'right' },
                2: { halign: 'right', fontStyle: 'bold' },
                3: { halign: 'right', fontStyle: 'bold', textColor: [rBrand, gBrand, bBrand] }
            },
            margin: { left: margin, right: margin },
            styles: { lineColor: [212, 212, 216], lineWidth: 0.5 }
        });
        
        // === COSTO TOTAL ===
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
        doc.setFontSize(11);
        doc.setTextColor(rDark, gDark, bDark);
        doc.setFont('helvetica', 'bold');
        doc.text('Costo Total del Crédito', margin, yPos);
        doc.setFont('helvetica', 'normal');
        
        yPos += 8;
        autoTable(doc, {
            startY: yPos,
            head: [['CONCEPTO', 'ESCENARIO 25%', 'ESCENARIO 30%', 'ESCENARIO 33%']],
            body: [
                ['Intereses totales pagados', formatCurrency(result.totalInterest25), formatCurrency(result.totalInterest30), formatCurrency(result.totalInterest33)],
                ['Seguros mensuales estimados', formatCurrency(result.totalInsuranceMonthly), formatCurrency(result.totalInsuranceMonthly), formatCurrency(result.totalInsuranceMonthly)],
                ['COSTO TOTAL', formatCurrency(result.totalCost25), formatCurrency(result.totalCost30), formatCurrency(result.totalCost33)],
            ],
            theme: 'plain',
            headStyles: { 
                fillColor: [rBrand, gBrand, bBrand], 
                textColor: [rWhite, gWhite, bWhite],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
            },
            bodyStyles: { 
                fontSize: 10,
                textColor: [rDark, gDark, bDark],
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
            },
            columnStyles: {
                0: { fillColor: [rSub, gSub, bSub], textColor: [rSec, gSec, bSec] },
                1: { halign: 'right' },
                2: { halign: 'right', fontStyle: 'bold' },
                3: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: margin, right: margin },
            styles: { lineColor: [212, 212, 216], lineWidth: 0.5 }
        });
        
        // === FOOTER ===
        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
        if (yPos > 260) {
            doc.addPage();
            yPos = 30;
        }
        
        doc.setDrawColor(rBrand, gBrand, bBrand);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        
        yPos += 8;
        doc.setFontSize(8);
        doc.setTextColor(rMute, gMute, bMute);
        doc.text(
            'Este documento tiene fines informativos y orientativos. Los resultados son aproximados y no constituyen',
            pageWidth / 2, yPos, { align: 'center' }
        );
        yPos += 4;
        doc.text(
            'una oferta de financiamiento. Cada banco evalúa según sus propios criterios de riesgo.',
            pageWidth / 2, yPos, { align: 'center' }
        );
        yPos += 4;
        doc.text(
            `UF referencial: ${formatCurrency(UF_VALUE)} • Valor actualizado: ${new Date().toLocaleDateString('es-CL')}`,
            pageWidth / 2, yPos, { align: 'center' }
        );
        
        // Page footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFillColor(rLight, gLight, bLight);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        doc.setFontSize(8);
        doc.setTextColor(rMute, gMute, bMute);
        doc.setFont('helvetica', 'bold');
        doc.text('Simple', margin, pageHeight - 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(rBrand, gBrand, bBrand);
        doc.text('Propiedades', margin + doc.getTextWidth('Simple '), pageHeight - 8);
        doc.setTextColor(rMute, gMute, bMute);
        doc.text('• simplepropiedades.app', margin + doc.getTextWidth('SimplePropiedades ') + 2, pageHeight - 8);
        
        doc.save(`simulacion-hipotecaria-${clientName || 'cliente'}-${new Date().toISOString().split('T')[0]}.pdf`);
    }, [result, clientName, notes, age, annualRate, bankPercentage]);

    const loadSimulation = (sim: SavedSimulation) => {
        setMonthlyIncome(sim.monthlyIncome.toString());
        setClientName(sim.clientName || '');
        setNotes(sim.notes || '');
        // Estimate loan years from the saved property values
        setCustomLoanYears(sim.loanTermYears?.toString() || '20');
    };

    return (
        <div className="panel-content-frame">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                    Simulador Hipotecario
                </h1>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Calcula capacidad de endeudamiento y valor de propiedades asequibles para tus clientes.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                {/* Calculator Form */}
                <div className="space-y-6">
                    <div 
                        className="rounded-[20px] border p-6"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                                <IconCalculator size={20} />
                                Datos del solicitante
                            </h2>
                            {isPro && (
                                <span 
                                    className="text-xs font-medium px-2 py-1 rounded-full border"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                >
                                    Guardado automático activado
                                </span>
                            )}
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Ingreso líquido mensual
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--fg-muted)' }}>$</span>
                                    <input
                                        type="number"
                                        value={monthlyIncome}
                                        onChange={(e) => setMonthlyIncome(e.target.value)}
                                        className="w-full rounded-xl border bg-transparent px-8 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Edad del solicitante
                                </label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Tasa de interés anual
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={annualRate}
                                        onChange={(e) => setAnnualRate(e.target.value)}
                                        className="w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--fg-muted)' }}>%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Tasa típica: {mortgageRates?.standardRate ?? '5.5'}%
                                    </span>
                                    {mortgageRates && !ratesLoading && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                                            Actualizado: {new Date(mortgageRates.updatedAt).toLocaleDateString('es-CL')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    % Financiamiento banco
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={bankPercentage}
                                        onChange={(e) => setBankPercentage(e.target.value)}
                                        className="w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--fg-muted)' }}>%</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Plazo del crédito (años)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={customLoanYears}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || '';
                                        if (val === '' || (val >= 5 && val <= MAX_LOAN_YEARS)) {
                                            setCustomLoanYears(e.target.value);
                                        }
                                    }}
                                    className="w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                />
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    Mínimo 5, máximo {MAX_LOAN_YEARS} años
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Cargas crediticias mensuales
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--fg-muted)' }}>$</span>
                                    <input
                                        type="number"
                                        value={monthlyDebts}
                                        onChange={(e) => setMonthlyDebts(e.target.value)}
                                        className="w-full rounded-xl border bg-transparent px-8 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                    />
                                </div>
                            </div>

                            {/* Property type selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Tipo de propiedad
                                </label>
                                <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                                    <button
                                        onClick={() => setPropertyType('new')}
                                        className="flex-1 py-2.5 text-sm font-medium transition-colors"
                                        style={{
                                            background: propertyType === 'new' ? 'var(--accent)' : 'transparent',
                                            color: propertyType === 'new' ? 'var(--accent-contrast)' : 'var(--fg)',
                                        }}
                                    >
                                        Nueva
                                    </button>
                                    <button
                                        onClick={() => setPropertyType('used')}
                                        className="flex-1 py-2.5 text-sm font-medium transition-colors"
                                        style={{
                                            background: propertyType === 'used' ? 'var(--accent)' : 'transparent',
                                            color: propertyType === 'used' ? 'var(--accent-contrast)' : 'var(--fg)',
                                        }}
                                    >
                                        Usada
                                    </button>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {propertyType === 'used' ? 'Máx. 75% financiamiento' : 'Hasta 80-90% financiamiento'}
                                </p>
                            </div>

                            {/* Subsidy checkbox */}
                            <div className="space-y-2 sm:col-span-2">
                                <label 
                                    className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-(--bg-subtle)"
                                    style={{ borderColor: 'var(--border)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={hasSubsidy}
                                        onChange={(e) => setHasSubsidy(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded"
                                    />
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            Subsidio al Crédito Hipotecario 2026
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                            Reduce tasa a ~{mortgageRates?.subsidyRate ?? '4.19'}% para viviendas nuevas
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* PRO: Client Info */}
                        {isPro && (
                            <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-2 mb-4">
                                    <IconSparkles size={18} style={{ color: 'var(--color-accent)' }} />
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        Información del cliente
                                    </span>
                                    <span 
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                        style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                                    >
                                        PRO
                                    </span>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            Nombre del cliente
                                        </label>
                                        <input
                                            type="text"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            placeholder="Ej: Juan Pérez"
                                            className="w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            Notas / Preferencias
                                        </label>
                                        <input
                                            type="text"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Ej: Busca departamento en Ñuñoa"
                                            className="w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-(--border-strong) transition-colors"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleSaveSimulation}
                                        disabled={!clientName.trim()}
                                        className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <IconDeviceFloppy size={16} />
                                        Guardar simulación
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="btn btn-outline inline-flex items-center gap-2"
                                    >
                                        <IconDownload size={16} />
                                        Exportar PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info Card */}
                    <div 
                        className="rounded-[20px] border p-5"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                    >
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                            <IconInfoCircle size={16} />
                            Sobre el cálculo
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                            <p>Los bancos permiten destinar entre 25% y 33% de tus ingresos al pago de deudas hipotecarias.</p>
                            <p>Seguros incluidos: Incendio+Sismo (0.0218 UF), Desgravamen (0.0020 UF), Invalidez (0.0042 UF) por cada 1.000 UF.</p>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="space-y-4">
                    {/* Approval Probability */}
                    {hasValidIncome && (
                        <div 
                            className="rounded-[20px] border p-4"
                            style={{ 
                                borderColor: result.approvalProbability === 'high' ? 'var(--color-success)' : 
                                            result.approvalProbability === 'medium' ? 'var(--color-warning)' : 'var(--color-error)',
                                background: result.approvalProbability === 'high' ? 'var(--color-success-subtle)' : 
                                           result.approvalProbability === 'medium' ? 'var(--color-warning-subtle)' : 'var(--color-error-subtle)'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                    style={{
                                        background: result.approvalProbability === 'high' ? 'var(--color-success)' : 
                                                  result.approvalProbability === 'medium' ? 'var(--color-warning)' : 'var(--color-error)',
                                    }}
                                >
                                    {result.approvalProbability === 'high' ? '✓' : result.approvalProbability === 'medium' ? '◐' : '✕'}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                        Aprobación: {result.approvalProbability === 'high' ? 'Alta' : result.approvalProbability === 'medium' ? 'Media' : 'Baja'}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                        DTI: {result.dtiRatio.toFixed(1)}% {hasSubsidy && '• Con subsidio'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Capacity */}
                    <div 
                        className="rounded-[20px] border p-5"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                            <IconTrendingUp size={18} />
                            Capacidad hipotecaria
                        </h3>

                        <div className="space-y-3">
                            <div 
                                className="rounded-xl p-4 border"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        Conservador (25%)
                                    </span>
                                    <span 
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                        style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)' }}
                                    >
                                        Muy seguro
                                    </span>
                                </div>
                                <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                                    {hasValidIncome ? formatCurrency(result.availableQuota25) : '$0'}
                                </p>
                            </div>

                            <div 
                                className="rounded-xl p-4 border-2"
                                style={{ borderColor: 'var(--accent)', background: 'var(--accent-subtle)' }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        Realista (30%)
                                    </span>
                                    <span 
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                    >
                                        Estándar 2026
                                    </span>
                                </div>
                                <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                                    {hasValidIncome ? formatCurrency(result.availableQuota30) : '$0'}
                                </p>
                            </div>

                            <div 
                                className="rounded-xl p-4 border"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        Máximo (33%)
                                    </span>
                                    <span 
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                        style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}
                                    >
                                        Límite
                                    </span>
                                </div>
                                <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                                    {hasValidIncome ? formatCurrency(result.availableQuota33) : '$0'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Property Value */}
                    <div 
                        className="rounded-[20px] border p-5"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--fg)' }}>
                            Valor de propiedad asequible
                        </h3>

                        <div className="space-y-3">
                            <div 
                                className="rounded-xl p-4 border-l-4"
                                style={{ 
                                    borderColor: 'var(--border)', 
                                    borderLeftColor: 'var(--color-success)',
                                    background: 'var(--bg-subtle)' 
                                }}
                            >
                                <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
                                    Conservador (25%)
                                </p>
                                <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                                    {hasValidIncome ? formatCurrency(result.propertyValue25) : '$0'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                    {hasValidIncome ? formatUF(result.propertyValue25) : '0 UF'}
                                </p>
                                <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                    Pie: {hasValidIncome ? formatCurrency(result.pie25) : '$0'}
                                </div>
                            </div>

                            <div 
                                className="rounded-xl p-4 border-l-4"
                                style={{ 
                                    borderColor: 'var(--border)', 
                                    borderLeftColor: 'var(--accent)',
                                    background: 'var(--accent-subtle)' 
                                }}
                            >
                                <p className="text-xs mb-1" style={{ color: 'var(--fg-secondary)' }}>
                                    Realista (30%)
                                </p>
                                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                                    {hasValidIncome ? formatCurrency(result.propertyValue30) : '$0'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                    {hasValidIncome ? formatUF(result.propertyValue30) : '0 UF'}
                                </p>
                                <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                    Pie: {hasValidIncome ? formatCurrency(result.pie30) : '$0'}
                                </div>
                            </div>

                            <div 
                                className="rounded-xl p-4 border-l-4"
                                style={{ 
                                    borderColor: 'var(--border)', 
                                    borderLeftColor: 'var(--color-warning)',
                                    background: 'var(--bg-subtle)' 
                                }}
                            >
                                <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
                                    Máximo (33%)
                                </p>
                                <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                                    {hasValidIncome ? formatCurrency(result.propertyValue33) : '$0'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                    {hasValidIncome ? formatUF(result.propertyValue33) : '0 UF'}
                                </p>
                                <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                    Pie: {hasValidIncome ? formatCurrency(result.pie33) : '$0'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Loan Details */}
                    <div 
                        className="rounded-[20px] border p-5"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                            <IconShieldCheck size={16} />
                            Detalles del crédito
                        </h3>
                        
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--fg-muted)' }}>Plazo</span>
                                <span style={{ color: 'var(--fg)' }}>{result.loanTermYears} años</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--fg-muted)' }}>Tasa anual</span>
                                <span style={{ color: hasSubsidy ? 'var(--color-success)' : 'var(--fg)' }}>
                                    {hasSubsidy ? `${mortgageRates?.subsidyRate ?? '4.19'}% (con subsidio)` : `${annualRate}%`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--fg-muted)' }}>Seguros/mes</span>
                                <span style={{ color: 'var(--fg)' }}>{hasValidIncome ? formatCurrency(result.totalInsuranceMonthly) : '$0'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--fg-muted)' }}>% financiamiento</span>
                                <span style={{ color: 'var(--fg)' }}>
                                    {propertyType === 'used' ? Math.min(parseFloat(bankPercentage) || 80, 75) : bankPercentage}%
                                    {propertyType === 'used' && parseFloat(bankPercentage) > 75 && ' (limitado)'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs font-medium" style={{ color: 'var(--fg)' }}>Costo total del crédito</p>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--fg-muted)' }}>Intereses (25%)</span>
                                <span style={{ color: 'var(--fg)' }}>{hasValidIncome ? formatCurrency(result.totalInterest25) : '$0'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--fg-muted)' }}>Intereses (30%)</span>
                                <span style={{ color: 'var(--accent)' }}>{hasValidIncome ? formatCurrency(result.totalInterest30) : '$0'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--fg-muted)' }}>Intereses (33%)</span>
                                <span style={{ color: 'var(--fg)' }}>{hasValidIncome ? formatCurrency(result.totalInterest33) : '$0'}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <span style={{ color: 'var(--accent)' }}>Total pagado (30% recomendado)</span>
                                <span style={{ color: 'var(--accent)' }}>{hasValidIncome ? formatCurrency(result.totalCost30) : '$0'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Saved Simulations */}
                    {isPro && (
                        <div 
                            className="rounded-[20px] border p-5"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                                    <IconHistory size={16} />
                                    Simulaciones guardadas
                                </h3>
                                <span 
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                                >
                                    PRO
                                </span>
                            </div>

                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {savedSimulations.length === 0 ? (
                                    <p className="text-sm text-center py-4" style={{ color: 'var(--fg-muted)' }}>
                                        No hay simulaciones guardadas
                                    </p>
                                ) : (
                                    savedSimulations.map((sim) => (
                                        <div
                                            key={sim.id}
                                            className="flex items-center gap-2 rounded-xl border p-3"
                                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                                        >
                                            <button
                                                onClick={() => loadSimulation(sim)}
                                                className="flex-1 text-left"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                                        {sim.clientName}
                                                    </span>
                                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                        {formatDate(sim.date)}
                                                    </span>
                                                </div>
                                                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                                    {sim.loanTermYears} años • {formatCurrency(sim.monthlyIncome)}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                    {formatCurrency(sim.propertyValue25)} - {formatCurrency(sim.propertyValue33)}
                                                </p>
                                                {sim.notes && (
                                                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--fg-muted)' }}>
                                                        {sim.notes}
                                                    </p>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setSavedSimulations(prev => prev.filter(s => s.id !== sim.id))}
                                                className="p-2 rounded-lg hover:bg-(--surface) transition-colors shrink-0"
                                                style={{ color: 'var(--fg-muted)' }}
                                                title="Eliminar"
                                            >
                                                <IconTrash size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
