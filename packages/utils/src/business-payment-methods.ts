export type BankTransferData = {
    bank: string;
    accountType: string;
    accountNumber: string;
    holderName: string;
    holderRut: string;
    holderEmail: string;
    alias?: string;
};

export type BusinessPaymentMethodsValue = {
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string;
    acceptsTransfer: boolean;
    acceptsMp: boolean;
    acceptsPaymentLink: boolean;
    paymentLinkUrl: string;
    bankTransferData: BankTransferData & { alias: string };
};

export const CL_BANKS = [
    'BancoEstado',
    'Banco Santander',
    'Banco de Chile',
    'BCI',
    'Scotiabank',
    'Banco Itaú',
    'Banco Falabella',
    'Banco Ripley',
    'BICE',
    'Coopeuch',
    'Otro',
] as const;

export const BANK_ACCOUNT_TYPES = [
    'Cuenta Corriente',
    'Cuenta Vista',
    'Cuenta RUT',
    'Cuenta de Ahorro',
] as const;

export function emptyBusinessPaymentMethodsValue(): BusinessPaymentMethodsValue {
    return {
        requiresAdvancePayment: false,
        advancePaymentInstructions: '',
        acceptsTransfer: false,
        acceptsMp: false,
        acceptsPaymentLink: false,
        paymentLinkUrl: '',
        bankTransferData: {
            bank: '',
            accountType: '',
            accountNumber: '',
            holderName: '',
            holderRut: '',
            holderEmail: '',
            alias: '',
        },
    };
}

export function hasCompleteBankTransferData(
    data: Pick<BankTransferData, 'bank' | 'accountType' | 'accountNumber' | 'holderName'>,
): boolean {
    return Boolean(
        data.bank?.trim()
        && data.accountType?.trim()
        && data.accountNumber?.trim()
        && data.holderName?.trim(),
    );
}

export function getBusinessPaymentMethodsSaveError(value: BusinessPaymentMethodsValue): string | null {
    if (value.acceptsPaymentLink && !value.paymentLinkUrl.trim()) {
        return 'Ingresa la URL del link de pago antes de guardar.';
    }
    if (value.acceptsTransfer && !hasCompleteBankTransferData(value.bankTransferData)) {
        return 'Completa los datos bancarios para activar la transferencia.';
    }
    return null;
}

export type PublicBusinessPaymentMethods = {
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string | null;
    acceptsTransfer: boolean;
    acceptsMp: boolean;
    acceptsPaymentLink: boolean;
    paymentLinkUrl: string | null;
    bankTransferData: BankTransferData | null;
    mpConnected: boolean;
};

export function buildPublicBusinessPaymentMethods(input: {
    requiresAdvancePayment?: boolean | null;
    advancePaymentInstructions?: string | null;
    acceptsTransfer?: boolean | null;
    acceptsMp?: boolean | null;
    acceptsPaymentLink?: boolean | null;
    paymentLinkUrl?: string | null;
    bankTransferData?: BankTransferData | null;
    mpConnected?: boolean | null;
}): PublicBusinessPaymentMethods | null {
    const acceptsTransfer = Boolean(input.acceptsTransfer);
    const acceptsMp = Boolean(input.acceptsMp);
    const acceptsPaymentLink = Boolean(input.acceptsPaymentLink);
    const requiresAdvancePayment = Boolean(input.requiresAdvancePayment);

    if (!acceptsTransfer && !acceptsMp && !acceptsPaymentLink && !requiresAdvancePayment) {
        return null;
    }

    const bank = input.bankTransferData;
    const bankTransferData = acceptsTransfer && bank && hasCompleteBankTransferData(bank)
        ? {
            bank: bank.bank,
            accountType: bank.accountType,
            accountNumber: bank.accountNumber,
            holderName: bank.holderName,
            holderRut: bank.holderRut ?? '',
            holderEmail: bank.holderEmail ?? '',
            alias: bank.alias,
        }
        : null;

    return {
        requiresAdvancePayment,
        advancePaymentInstructions: requiresAdvancePayment
            ? (input.advancePaymentInstructions?.trim() || null)
            : null,
        acceptsTransfer,
        acceptsMp,
        acceptsPaymentLink,
        paymentLinkUrl: acceptsPaymentLink ? (input.paymentLinkUrl?.trim() || null) : null,
        bankTransferData,
        mpConnected: Boolean(input.mpConnected),
    };
}

export function normalizeBankTransferPayload(
    data: BusinessPaymentMethodsValue['bankTransferData'],
): BankTransferData | null {
    if (!hasCompleteBankTransferData(data)) return null;
    return {
        bank: data.bank.trim(),
        accountType: data.accountType.trim(),
        accountNumber: data.accountNumber.trim(),
        holderName: data.holderName.trim(),
        holderRut: data.holderRut.trim(),
        holderEmail: data.holderEmail.trim(),
        alias: data.alias?.trim() || undefined,
    };
}

export function businessPaymentMethodsFromRecord(input: {
    requiresAdvancePayment?: boolean | null;
    advancePaymentInstructions?: string | null;
    acceptsTransfer?: boolean | null;
    acceptsMp?: boolean | null;
    acceptsPaymentLink?: boolean | null;
    paymentLinkUrl?: string | null;
    bankTransferData?: BankTransferData | null;
}): BusinessPaymentMethodsValue {
    const bank = input.bankTransferData;
    return {
        requiresAdvancePayment: Boolean(input.requiresAdvancePayment),
        advancePaymentInstructions: input.advancePaymentInstructions ?? '',
        acceptsTransfer: Boolean(input.acceptsTransfer),
        acceptsMp: Boolean(input.acceptsMp),
        acceptsPaymentLink: Boolean(input.acceptsPaymentLink),
        paymentLinkUrl: input.paymentLinkUrl ?? '',
        bankTransferData: {
            bank: bank?.bank ?? '',
            accountType: bank?.accountType ?? '',
            accountNumber: bank?.accountNumber ?? '',
            holderName: bank?.holderName ?? '',
            holderRut: bank?.holderRut ?? '',
            holderEmail: bank?.holderEmail ?? '',
            alias: bank?.alias ?? '',
        },
    };
}

export function serializeBusinessPaymentMethodsWrite(value: BusinessPaymentMethodsValue) {
    return {
        requiresAdvancePayment: value.requiresAdvancePayment,
        advancePaymentInstructions: value.advancePaymentInstructions.trim() || null,
        acceptsTransfer: value.acceptsTransfer,
        acceptsMp: value.acceptsMp,
        acceptsPaymentLink: value.acceptsPaymentLink,
        paymentLinkUrl: value.paymentLinkUrl.trim() || null,
        bankTransferData: value.acceptsTransfer ? normalizeBankTransferPayload(value.bankTransferData) : null,
    };
}
