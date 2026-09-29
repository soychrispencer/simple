/** Cálculo legacy para conservar importes de operaciones históricas. */
export function computeSerenataAppDeduction(grossClp: number, commissionAppBps: number, commissionVatBps: number) {
    const commissionClp = Math.round((grossClp * commissionAppBps) / 10_000);
    const vatOnCommissionClp = Math.round((commissionClp * commissionVatBps) / 10_000);
    const totalDeductionClp = commissionClp + vatOnCommissionClp;
    return { commissionClp: totalDeductionClp, netClp: grossClp - totalDeductionClp };
}
