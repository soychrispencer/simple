'use client';

import { Suspense, useEffect, useState } from 'react';
import {
    IconLink,
    IconBuildingBank,
    IconCheck,
    IconLoader2,
    IconCreditCard,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelField,
    PanelButton,
    PanelSwitch,
    PanelPageHeader,
} from '@simple/ui';
import {
    fetchAgendaProfile,
    saveAgendaProfile,
    type AgendaProfile,
    type BankTransferData,
} from '@/lib/agenda-api';

const CL_BANKS = [
    'BancoEstado', 'Banco Santander', 'Banco de Chile', 'BCI', 'Scotiabank',
    'Banco Itaú', 'Banco Falabella', 'Banco Ripley', 'BICE', 'Coopeuch', 'Otro',
];

const ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta RUT', 'Cuenta de Ahorro'];

function CobrosConfigPageInner() {
    const [requiresAdvancePayment, setRequiresAdvancePayment] = useState(false);
    const [advancePaymentInstructions, setAdvancePaymentInstructions] = useState('');
    const [paymentLinkUrl, setPaymentLinkUrl] = useState('');

    const [bankData, setBankData] = useState<BankTransferData>({
        bank: '', accountType: '', accountNumber: '',
        holderName: '', holderRut: '', holderEmail: '', alias: '',
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const prof = await fetchAgendaProfile();
            if (prof) {
                setRequiresAdvancePayment(prof.requiresAdvancePayment ?? false);
                setAdvancePaymentInstructions(prof.advancePaymentInstructions ?? '');
                setPaymentLinkUrl(prof.paymentLinkUrl ?? '');
                if (prof.bankTransferData) {
                    setBankData({ alias: '', ...prof.bankTransferData });
                }
            }
        };
        void load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        const bankPayload: BankTransferData | null = bankData.bank && bankData.accountNumber && bankData.holderName
            ? { ...bankData, alias: bankData.alias || undefined }
            : null;
        await saveAgendaProfile({
            requiresAdvancePayment,
            advancePaymentInstructions: advancePaymentInstructions || null,
            paymentLinkUrl: paymentLinkUrl || null,
            bankTransferData: bankPayload,
        } as Partial<AgendaProfile>);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const hasBankData = !!(bankData.bank && bankData.accountNumber && bankData.holderName);
    const hasPaymentLink = !!paymentLinkUrl;

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Métodos de cobro"
                description="Configura cómo quieres recibir los pagos de tus pacientes."
            />

            <div className="flex flex-col gap-5">

                {/* Exigir pago anticipado */}
                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <IconCreditCard size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Exigir pago anticipado</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    El paciente verá instrucciones de pago antes de confirmar su reserva.
                                </p>
                            </div>
                        </div>
                        <PanelSwitch
                            checked={requiresAdvancePayment}
                            onChange={setRequiresAdvancePayment}
                            ariaLabel="Exigir pago anticipado"
                        />
                    </div>
                    {requiresAdvancePayment && (
                        <div className="mt-4">
                            <PanelField
                                label="Instrucciones de pago"
                                hint="Aparecerán en la pantalla de confirmación de reserva."
                            >
                                <textarea
                                    value={advancePaymentInstructions}
                                    onChange={(e) => setAdvancePaymentInstructions(e.target.value)}
                                    placeholder="Ej: Transferir a Banco Estado RUT 12.345.678-9. Enviar comprobante por WhatsApp antes de la sesión."
                                    rows={3}
                                    className="form-textarea"
                                />
                            </PanelField>
                        </div>
                    )}
                </PanelCard>

                {/* Link de pago */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <IconLink size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Link de pago</p>
                                {hasPaymentLink && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                        <IconCheck size={10} /> Configurado
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                Cualquier link de pago: tu perfil de MercadoPago, Webpay, Flow, etc.
                            </p>
                            <input
                                type="url"
                                value={paymentLinkUrl}
                                onChange={(e) => setPaymentLinkUrl(e.target.value)}
                                placeholder="https://mpago.la/tu-link-de-pago"
                                className="form-input"
                            />
                        </div>
                    </div>
                </PanelCard>

                {/* Transferencia bancaria */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: hasBankData ? 'rgba(13,148,136,0.1)' : 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <IconBuildingBank size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Transferencia bancaria</p>
                                {hasBankData && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                        <IconCheck size={10} /> Configurado
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                                Tus datos de cuenta para que el paciente pueda transferirte directamente.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <PanelField label="Banco">
                                    <select
                                        value={bankData.bank}
                                        onChange={(e) => setBankData((p) => ({ ...p, bank: e.target.value }))}
                                        className="form-select"
                                    >
                                        <option value="">— Seleccionar —</option>
                                        {CL_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </PanelField>
                                <PanelField label="Tipo de cuenta">
                                    <select
                                        value={bankData.accountType}
                                        onChange={(e) => setBankData((p) => ({ ...p, accountType: e.target.value }))}
                                        className="form-select"
                                    >
                                        <option value="">— Seleccionar —</option>
                                        {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </PanelField>
                                <PanelField label="Número de cuenta">
                                    <input type="text" value={bankData.accountNumber} onChange={(e) => setBankData((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="123456789" className="form-input" />
                                </PanelField>
                                <PanelField label="Nombre del titular">
                                    <input type="text" value={bankData.holderName} onChange={(e) => setBankData((p) => ({ ...p, holderName: e.target.value }))} placeholder="María González" className="form-input" />
                                </PanelField>
                                <PanelField label="RUT del titular">
                                    <input type="text" value={bankData.holderRut} onChange={(e) => setBankData((p) => ({ ...p, holderRut: e.target.value }))} placeholder="12.345.678-9" className="form-input" />
                                </PanelField>
                                <PanelField label="Email del titular">
                                    <input type="email" value={bankData.holderEmail} onChange={(e) => setBankData((p) => ({ ...p, holderEmail: e.target.value }))} placeholder="tu@email.com" className="form-input" />
                                </PanelField>
                                <PanelField label="Alias / mensaje para el paciente (opcional)" className="sm:col-span-2">
                                    <input type="text" value={bankData.alias ?? ''} onChange={(e) => setBankData((p) => ({ ...p, alias: e.target.value }))} placeholder="Ej: Pago sesión psicología" className="form-input" />
                                </PanelField>
                            </div>
                        </div>
                    </div>
                </PanelCard>

                {/* Save button */}
                <div>
                    <PanelButton
                        variant="accent"
                        onClick={() => void handleSave()}
                        disabled={saving}
                    >
                        {saving ? <IconLoader2 size={14} className="animate-spin" /> : saved ? <IconCheck size={14} /> : null}
                        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                    </PanelButton>
                </div>
            </div>
        </div>
    );
}

export default function CobrosConfigPage() {
    return (
        <Suspense fallback={
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando...
            </div>
        }>
            <CobrosConfigPageInner />
        </Suspense>
    );
}
