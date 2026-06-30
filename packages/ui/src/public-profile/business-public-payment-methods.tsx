'use client';

import Link from 'next/link';
import { IconBuildingBank, IconCash, IconExternalLink, IconLink } from '@tabler/icons-react';
import type { PublicBusinessPaymentMethods } from '@simple/utils';

export function BusinessPublicPaymentMethodsSection({
    paymentMethods,
}: {
    paymentMethods: PublicBusinessPaymentMethods;
}) {
    const hasAnyMethod = paymentMethods.acceptsTransfer
        || paymentMethods.acceptsMp
        || paymentMethods.acceptsPaymentLink;

    if (!hasAnyMethod && !paymentMethods.requiresAdvancePayment) {
        return null;
    }

    const bankRows = paymentMethods.bankTransferData
        ? [
            ['Banco', paymentMethods.bankTransferData.bank],
            ['Tipo', paymentMethods.bankTransferData.accountType],
            ['N° cuenta', paymentMethods.bankTransferData.accountNumber],
            ['Titular', paymentMethods.bankTransferData.holderName],
            ...(paymentMethods.bankTransferData.holderRut
                ? [['RUT', paymentMethods.bankTransferData.holderRut] as const]
                : []),
            ...(paymentMethods.bankTransferData.holderEmail
                ? [['Email', paymentMethods.bankTransferData.holderEmail] as const]
                : []),
            ...(paymentMethods.bankTransferData.alias
                ? [['Asunto', paymentMethods.bankTransferData.alias] as const]
                : []),
        ]
        : [];

    return (
        <div className="grid gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <div>
                <p className="text-xs uppercase tracking-[0.18em] pp-secondary">Medios de pago</p>
                {paymentMethods.requiresAdvancePayment ? (
                    <p className="mt-1 text-xs font-medium pp-fg">Puede requerir pago anticipado</p>
                ) : null}
            </div>

            {paymentMethods.advancePaymentInstructions ? (
                <p className="text-xs leading-5 pp-secondary">{paymentMethods.advancePaymentInstructions}</p>
            ) : null}

            {hasAnyMethod ? (
                <div className="flex flex-wrap gap-2">
                    {paymentMethods.acceptsTransfer ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium pp-surface-row pp-fg">
                            <IconBuildingBank size={12} />
                            Transferencia
                        </span>
                    ) : null}
                    {paymentMethods.acceptsMp ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium pp-surface-row pp-fg">
                            <IconCash size={12} />
                            {paymentMethods.mpConnected ? 'MercadoPago' : 'MercadoPago (directo)'}
                        </span>
                    ) : null}
                    {paymentMethods.acceptsPaymentLink ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium pp-surface-row pp-fg">
                            <IconLink size={12} />
                            Link de pago
                        </span>
                    ) : null}
                </div>
            ) : null}

            {bankRows.length > 0 ? (
                <dl className="grid gap-2 rounded-[18px] border px-4 py-3 text-xs pp-surface-row">
                    {bankRows.map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                            <dt className="pp-secondary">{label}</dt>
                            <dd className="font-medium pp-fg">{value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}

            {paymentMethods.paymentLinkUrl ? (
                <Link
                    href={paymentMethods.paymentLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-[18px] border px-4 py-3 text-sm font-medium transition-colors pp-surface-row pp-fg"
                >
                    <IconExternalLink size={15} />
                    Ir al link de pago
                </Link>
            ) : null}
        </div>
    );
}
