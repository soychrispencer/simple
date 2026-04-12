'use client';

import { Suspense, useEffect, useState } from 'react';
import {
    IconLink,
    IconBuildingBank,
    IconCheck,
    IconLoader2,
    IconCreditCard,
    IconCash,
    IconExternalLink,
    IconAlertCircle,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelField,
    PanelButton,
    PanelSwitch,
    PanelPageHeader,
} from '@simple/ui';
import Link from 'next/link';
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
    const [loading, setLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);
    const [mpConnected, setMpConnected] = useState(false);

    // Per-method toggles
    const [acceptsTransfer, setAcceptsTransfer] = useState(false);
    const [acceptsMp, setAcceptsMp] = useState(false);
    const [acceptsPaymentLink, setAcceptsPaymentLink] = useState(false);

    // Advance payment (applies to all active methods)
    const [requiresAdvancePayment, setRequiresAdvancePayment] = useState(false);
    const [advancePaymentInstructions, setAdvancePaymentInstructions] = useState('');

    // Transfer data
    const [bankData, setBankData] = useState<BankTransferData>({
        bank: '', accountType: '', accountNumber: '',
        holderName: '', holderRut: '', holderEmail: '', alias: '',
    });

    // Payment link
    const [paymentLinkUrl, setPaymentLinkUrl] = useState('');

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const prof = await fetchAgendaProfile();
            if (prof) {
                const planActive = prof.plan === 'pro' && (!prof.planExpiresAt || new Date(prof.planExpiresAt) >= new Date());
                setIsPro(planActive);
                setMpConnected(!!prof.mpAccessToken);
                setAcceptsTransfer(prof.acceptsTransfer ?? false);
                setAcceptsMp(prof.acceptsMp ?? false);
                setAcceptsPaymentLink(prof.acceptsPaymentLink ?? false);
                setRequiresAdvancePayment(prof.requiresAdvancePayment ?? false);
                setAdvancePaymentInstructions(prof.advancePaymentInstructions ?? '');
                setPaymentLinkUrl(prof.paymentLinkUrl ?? '');
                if (prof.bankTransferData) {
                    setBankData({ alias: '', ...prof.bankTransferData });
                }
            }
            setLoading(false);
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
            acceptsTransfer,
            acceptsMp,
            acceptsPaymentLink,
            requiresAdvancePayment,
            advancePaymentInstructions: advancePaymentInstructions || null,
            paymentLinkUrl: paymentLinkUrl || null,
            bankTransferData: bankPayload,
        } as Partial<AgendaProfile>);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const anyMethodActive = acceptsTransfer || acceptsMp || acceptsPaymentLink;
    const hasBankData = !!(bankData.bank && bankData.accountNumber && bankData.holderName);

    if (loading) {
        return (
            <div className="container-app panel-page py-8 max-w-2xl">
                <PanelPageHeader backHref="/panel/configuracion" title="Métodos de cobro" description="Configura cómo quieres recibir los pagos de tus pacientes." />
                <div className="flex items-center gap-2 mt-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={16} className="animate-spin" /> Cargando...
                </div>
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Métodos de cobro"
                description="Activa los métodos que quieres ofrecer a tus pacientes."
            />

            <div className="flex flex-col gap-4">

                {/* ── Pago anticipado ─────────────────────────────── */}
                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <IconCreditCard size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Exigir pago anticipado</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    Aplica a cualquier método activo. El paciente verá las instrucciones antes de confirmar.
                                </p>
                            </div>
                        </div>
                        <PanelSwitch checked={requiresAdvancePayment} onChange={setRequiresAdvancePayment} ariaLabel="Exigir pago anticipado" />
                    </div>

                    {requiresAdvancePayment && (
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                            {!anyMethodActive && (
                                <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.08)', color: '#92400e', border: '1px solid rgba(234,179,8,0.2)' }}>
                                    <IconAlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                    Activa al menos un método de cobro abajo para que esto tenga efecto.
                                </div>
                            )}
                            <PanelField label="Instrucciones de pago" hint="Se muestran al paciente en la pantalla de confirmación.">
                                <textarea
                                    value={advancePaymentInstructions}
                                    onChange={(e) => setAdvancePaymentInstructions(e.target.value)}
                                    placeholder="Ej: Transferir antes de la sesión y enviar comprobante por WhatsApp."
                                    rows={3}
                                    className="form-textarea"
                                />
                            </PanelField>
                        </div>
                    )}
                </PanelCard>

                {/* ── Transferencia bancaria ───────────────────────── */}
                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: acceptsTransfer ? 'rgba(13,148,136,0.1)' : 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <IconBuildingBank size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Transferencia bancaria</p>
                                    {acceptsTransfer && hasBankData && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                            <IconCheck size={10} /> Activo
                                        </span>
                                    )}
                                    {acceptsTransfer && !hasBankData && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234,179,8,0.1)', color: '#92400e' }}>
                                            <IconAlertCircle size={10} /> Incompleto
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>El paciente recibirá tus datos para transferirte.</p>
                            </div>
                        </div>
                        <PanelSwitch checked={acceptsTransfer} onChange={setAcceptsTransfer} ariaLabel="Activar transferencia bancaria" />
                    </div>

                    {acceptsTransfer && (
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--fg)' }}>Datos de tu cuenta</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <PanelField label="Banco">
                                    <select value={bankData.bank} onChange={(e) => setBankData((p) => ({ ...p, bank: e.target.value }))} className="form-select">
                                        <option value="">— Seleccionar —</option>
                                        {CL_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </PanelField>
                                <PanelField label="Tipo de cuenta">
                                    <select value={bankData.accountType} onChange={(e) => setBankData((p) => ({ ...p, accountType: e.target.value }))} className="form-select">
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
                                <PanelField label="Alias / mensaje (opcional)" className="sm:col-span-2">
                                    <input type="text" value={bankData.alias ?? ''} onChange={(e) => setBankData((p) => ({ ...p, alias: e.target.value }))} placeholder="Ej: Pago sesión psicología" className="form-input" />
                                </PanelField>
                            </div>
                        </div>
                    )}
                </PanelCard>

                {/* ── MercadoPago ─────────────────────────────────── */}
                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: acceptsMp ? 'rgba(0,158,227,0.12)' : 'var(--accent-soft)', color: '#009EE3' }}>
                                <IconCash size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>MercadoPago</p>
                                    {!isPro && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234,179,8,0.1)', color: '#b45309' }}>Pro</span>
                                    )}
                                    {acceptsMp && mpConnected && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                            <IconCheck size={10} /> Activo
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Cobros online con tarjeta o débito. Requiere integración.</p>
                            </div>
                        </div>
                        <PanelSwitch
                            checked={acceptsMp}
                            onChange={(v) => { if (isPro) setAcceptsMp(v); }}
                            ariaLabel="Activar MercadoPago"
                            disabled={!isPro}
                        />
                    </div>

                    {acceptsMp && isPro && !mpConnected && (
                        <div className="mt-4 pt-4 flex items-start gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                            <IconAlertCircle size={15} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--fg)' }}>Cuenta no conectada</p>
                                <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                    Para recibir pagos con MercadoPago necesitas conectar tu cuenta primero.
                                </p>
                                <Link
                                    href="/panel/configuracion/integraciones"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                                    style={{ background: '#009EE3', color: '#fff' }}
                                >
                                    <IconExternalLink size={12} />
                                    Conectar en Integraciones
                                </Link>
                            </div>
                        </div>
                    )}

                    {!isPro && (
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                MercadoPago está disponible en el{' '}
                                <Link href="/panel/suscripciones" className="underline" style={{ color: 'var(--accent)' }}>plan Profesional</Link>.
                            </p>
                        </div>
                    )}
                </PanelCard>

                {/* ── Link de pago ────────────────────────────────── */}
                <PanelCard size="md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: acceptsPaymentLink ? 'rgba(13,148,136,0.1)' : 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <IconLink size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Link de pago</p>
                                    {acceptsPaymentLink && paymentLinkUrl && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                            <IconCheck size={10} /> Activo
                                        </span>
                                    )}
                                    {acceptsPaymentLink && !paymentLinkUrl && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234,179,8,0.1)', color: '#92400e' }}>
                                            <IconAlertCircle size={10} /> Falta URL
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Comparte cualquier link: MercadoPago, Webpay, Flow, etc.</p>
                            </div>
                        </div>
                        <PanelSwitch checked={acceptsPaymentLink} onChange={setAcceptsPaymentLink} ariaLabel="Activar link de pago" />
                    </div>

                    {acceptsPaymentLink && (
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                            <PanelField label="URL del link de pago">
                                <input
                                    type="url"
                                    value={paymentLinkUrl}
                                    onChange={(e) => setPaymentLinkUrl(e.target.value)}
                                    placeholder="https://mpago.la/tu-link-de-pago"
                                    className="form-input"
                                />
                            </PanelField>
                        </div>
                    )}
                </PanelCard>

                {/* ── Guardar ─────────────────────────────────────── */}
                <div>
                    <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving}>
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
