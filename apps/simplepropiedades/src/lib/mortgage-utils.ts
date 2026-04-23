export const SUBSIDY_REDUCTION_DEFAULT = 0.87;
export const MAX_LOAN_YEARS = 30;
export const TOTAL_INSURANCE_RATE = 0.45 + 0.08 + 0.065 + 0.002 + 0.003;
export const UF_FALLBACK = 39643;

export interface CalculationResult {
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

export interface SavedSimulation {
    id: string;
    date: string;
    monthlyIncome: number;
    loanTermYears: number;
    propertyValue25: number;
    propertyValue33: number;
    clientName?: string;
    notes?: string;
}

export interface MortgageRates {
    standardRate: number;
    subsidyRate: number;
    bestMarketRate: number;
    highestRate: number;
    sourceName: string;
    sourceUrl: string | null;
    updatedAt: string;
    notes?: string;
}

export function calculateMortgage(
    monthlyIncome: number,
    age: number,
    annualRate: number,
    bankPercentage: number,
    maxAge: number,
    monthlyDebts: number,
    customLoanYears?: number,
    hasSubsidy: boolean = false,
    propertyType: 'new' | 'used' = 'new',
    ufValue: number = UF_FALLBACK
): CalculationResult {
    const effectiveRate = hasSubsidy ? Math.max(0.1, annualRate - SUBSIDY_REDUCTION_DEFAULT) : annualRate;
    const monthlyRate = effectiveRate / 100 / 12;

    const maxBankPercentage = propertyType === 'used' ? 80 : 90;
    const finalBankPercentage = Math.min(bankPercentage, maxBankPercentage);

    const ageFactor = maxAge > 75 ? 1 : 0.85;

    let loanTermYears = customLoanYears || Math.min(MAX_LOAN_YEARS, Math.max(10, maxAge - age));
    loanTermYears = Math.min(loanTermYears, 30);
    const loanTermMonths = loanTermYears * 12;

    const dtiRatio = monthlyIncome > 0 ? (monthlyDebts / monthlyIncome) * 100 : 0;
    const maxDTI = dtiRatio > 40 ? 25 : dtiRatio > 25 ? 30 : 33;

    const quota25 = monthlyIncome * 0.25 * ageFactor;
    const quota30 = monthlyIncome * 0.30 * ageFactor;
    const quota33 = monthlyIncome * (maxDTI / 100) * ageFactor;

    const adjustedQuota25 = quota25 - monthlyDebts;
    const adjustedQuota30 = quota30 - monthlyDebts;
    const adjustedQuota33 = quota33 - monthlyDebts;

    const maxCredit25 = adjustedQuota25 > 0 && monthlyRate > 0
        ? adjustedQuota25 * (1 - Math.pow(1 + monthlyRate, -loanTermMonths)) / monthlyRate
        : 0;
    const maxCredit30 = adjustedQuota30 > 0 && monthlyRate > 0
        ? adjustedQuota30 * (1 - Math.pow(1 + monthlyRate, -loanTermMonths)) / monthlyRate
        : 0;
    const maxCredit33 = adjustedQuota33 > 0 && monthlyRate > 0
        ? adjustedQuota33 * (1 - Math.pow(1 + monthlyRate, -loanTermMonths)) / monthlyRate
        : 0;

    const insuranceMonthlyRate = (TOTAL_INSURANCE_RATE / 100) / 12;
    const insurance25 = maxCredit25 * insuranceMonthlyRate;
    const insurance30 = maxCredit30 * insuranceMonthlyRate;
    const insurance33 = maxCredit33 * insuranceMonthlyRate;

    const totalMonthlyPayment25 = adjustedQuota25 + insurance25;
    const totalMonthlyPayment30 = adjustedQuota30 + insurance30;
    const totalMonthlyPayment33 = adjustedQuota33 + insurance33;

    const propertyValue25 = maxCredit25 / (finalBankPercentage / 100);
    const propertyValue30 = maxCredit30 / (finalBankPercentage / 100);
    const propertyValue33 = maxCredit33 / (finalBankPercentage / 100);

    const totalInterest25 = (totalMonthlyPayment25 * loanTermMonths) - maxCredit25;
    const totalInterest30 = (totalMonthlyPayment30 * loanTermMonths) - maxCredit30;
    const totalInterest33 = (totalMonthlyPayment33 * loanTermMonths) - maxCredit33;

    const totalCost25 = (totalMonthlyPayment25 * loanTermMonths);
    const totalCost30 = (totalMonthlyPayment30 * loanTermMonths);
    const totalCost33 = (totalMonthlyPayment33 * loanTermMonths);

    const pie25 = propertyValue25 - maxCredit25;
    const pie30 = propertyValue30 - maxCredit30;
    const pie33 = propertyValue33 - maxCredit33;

    let approvalProbability: 'high' | 'medium' | 'low' = 'low';
    if (dtiRatio <= 20 && age <= 65) {
        approvalProbability = 'high';
    } else if (dtiRatio <= 35 && age <= 70) {
        approvalProbability = 'medium';
    }

    return {
        monthlyIncome,
        monthlyDebts,
        availableQuota25: adjustedQuota25,
        availableQuota30: adjustedQuota30,
        availableQuota33: adjustedQuota33,
        maxCredit25,
        maxCredit30,
        maxCredit33,
        propertyValue25,
        propertyValue30,
        propertyValue33,
        monthlyPayment25: totalMonthlyPayment25,
        monthlyPayment30: totalMonthlyPayment30,
        monthlyPayment33: totalMonthlyPayment33,
        loanTermYears,
        totalInsuranceMonthly: insurance25,
        totalInterest25,
        totalInterest30,
        totalInterest33,
        totalCost25,
        totalCost30,
        totalCost33,
        pie25,
        pie30,
        pie33,
        approvalProbability,
        dtiRatio,
    };
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatUF(amount: number, ufValue: number = UF_FALLBACK): string {
    return `${amount.toFixed(2)} UF`;
}
