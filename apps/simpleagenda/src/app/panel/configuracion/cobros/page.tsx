'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconCash,
    IconLink,
    IconBuildingBank,
    IconCheck,
    IconX,
    IconLoader2,
    IconAlertCircle,
    IconCreditCard,
} from '@tabler/icons-react';
import {
    fetchAgendaProfile,
    saveAgendaProfile,
    fetchMercadoPagoStatus,
    getMercadoPagoAuthUrl,
    disconnectMercadoPago,
    type AgendaProfile,
    type BankTransferData,
} from '@/lib/agenda-api';

const CL_BANKS = [
    'BancoEstado', 'Banco Santander', 'Banco de Chile', 'BCI', 'Scotiabank',
    'Banco Itaú', 'Banco Falabella', 'Banco Ripley', 'BICE', 'Coopeuch', 'Otro',
];

const ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta RUT', 'Cuenta de Ahorro'];

export default function CobrosConfigPage() {
    const searchParams = useSearchParams();
    const mpParam = searchParams.get('mp');

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [mpConnected, setMpConnected] = useState(false);
    const [mpUserId, setMpUserId] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState(false);

    // Require advance payment toggle
    const [requiresAdvancePayment, setRequiresAdvancePayment] = useState(false);

    // Payment link
    const [paymentLinkUrl, setPaymentLinkUrl] = useState('');

    // Bank transfer
    const [bankData, setBankData] = useState<BankTransferData>({
        bank: '', accountType: '', accountNumber: '',
        holderName: '', holderRut: '', holderEmail: '', alias: '',
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (mpParam === 'connected') setFlash({ type: 'success', message: 'MercadoPago conectado correctamente.' });
        else if (mpParam === 'error') setFlash({ type: 'error', message: 'Error al conectar con MercadoPago.' });

        const load = async () => {
            const [prof, mpStatus] = await Promise.all([fetchAgendaProfile(), fetchMercadoPagoStatus()]);
            if (prof) {
                setProfile(prof);
                setRequiresAdvancePayment(prof.requiresAdvancePayment ?? false);
                setPaymentLinkUrl(prof.paymentLinkUrl ?? '');
                if (prof.bankTransferData) {
                    setBankData({ alias: '', ...prof.bankTransferData });
                }
            }
            setMpConnected(mpStatus.connected);
            setMpUserId(mpStatus.userId);
            setLoading(false);
        };
        void load();
    }, [mpParam]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        const bankPayload: BankTransferData | null = bankData.bank && bankData.accountNumber && bankData.holderName
            ? { ...bankData, alias: bankData.alias || undefined }
            : null;
        await saveAgendaProfile({
            requiresAdvancePayment,
            paymentLinkUrl: paymentLinkUrl || null,
            bankTransferData: bankPayload,
        } as Partial<AgendaProfile>);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleDisconnectMp = async () => {
        setDisconnecting(true);
        await disconnectMercadoPago();
        setMpConnected(false);
        setMpUserId(null);
        setDisconnecting(false);
        setFlash({ type: 'success', message: 'MercadoPago desconectado.' });
    };

    const hasBankData = !!(bankData.bank && bankData.accountNumber && bankData.holderName);
    const hasPaymentLink = !!paymentLinkUrl;

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Métodos de cobro</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
                Configura cómo quieres recibir los pagos de tus clientes.
            </p>

            {flash && (
                <div
                    className="flex items-center gap-2 p-3 rounded-xl text-sm mb-6"
                    style={{
                        background: flash.type === 'success' ? 'rgba(13,148,136,0.1)' : 'rgba(220,38,38,0.1)',
                        color: flash.type === 'success' ? 'var(--accent)' : '#dc2626',
                    }}
                >
                    {flash.type === 'success' ? <IconCheck size={15} /> : <IconAlertCircle size={15} />}
                    {flash.message}
                </div>
            )}

            <div className="flex flex-col gap-5">

                {/* Require advance payment toggle */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <IconCreditCard size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Exigir pago anticipado</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    El cliente verá las opciones de pago antes de confirmar su reserva.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setRequiresAdvancePayment(!requiresAdvancePayment)}
                            className="relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4"
                            style={{ background: requiresAdvancePayment ? 'var(--accent)' : 'var(--border)' }}
                        >
                            <span
                                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                                style={{ transform: requiresAdvancePayment ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                        </button>
                    </div>
                </div>

                {/* MercadoPago */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,158,227,0.1)', color: '#009EE3' }}>
                            <IconCash size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>MercadoPago</p>
                                {!loading && mpConnected && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                        <IconCheck size={10} /> Conectado
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                                Conecta tu cuenta de MercadoPago. Los pagos llegan directamente a ti.
                            </p>
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={14} className="animate-spin" /> Verificando...
                                </div>
                            ) : mpConnected ? (
                                <div className="flex flex-col gap-2">
                                    {mpUserId && (
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>ID de usuario: <span style={{ color: 'var(--fg)' }}>{mpUserId}</span></p>
                                    )}
                                    <button
                                        onClick={() => void handleDisconnectMp()}
                                        disabled={disconnecting}
                                        className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    >
                                        {disconnecting ? <IconLoader2 size={14} className="animate-spin" /> : <IconX size={14} />}
                                        Desconectar
                                    </button>
                                </div>
                            ) : (
                                <a
                                    href={getMercadoPagoAuthUrl()}
                                    className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                                    style={{ background: '#009EE3', color: '#fff' }}
                                >
                                    <IconCash size={15} />
                                    Conectar con MercadoPago
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment link */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: hasPaymentLink ? 'rgba(13,148,136,0.1)' : 'var(--accent-soft)', color: hasPaymentLink ? 'var(--accent)' : 'var(--accent)' }}>
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
                                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Bank transfer */}
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
                                Tus datos de cuenta para que el cliente pueda transferirte directamente.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>Banco</label>
                                    <select
                                        value={bankData.bank}
                                        onChange={(e) => setBankData((p) => ({ ...p, bank: e.target.value }))}
                                        className="field-input"
                                    >
                                        <option value="">— Seleccionar —</option>
                                        {CL_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>Tipo de cuenta</label>
                                    <select
                                        value={bankData.accountType}
                                        onChange={(e) => setBankData((p) => ({ ...p, accountType: e.target.value }))}
                                        className="field-input"
                                    >
                                        <option value="">— Seleccionar —</option>
                                        {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>Número de cuenta</label>
                                    <input type="text" value={bankData.accountNumber} onChange={(e) => setBankData((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="123456789" className="field-input" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>Nombre del titular</label>
                                    <input type="text" value={bankData.holderName} onChange={(e) => setBankData((p) => ({ ...p, holderName: e.target.value }))} placeholder="María González" className="field-input" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>RUT del titular</label>
                                    <input type="text" value={bankData.holderRut} onChange={(e) => setBankData((p) => ({ ...p, holderRut: e.target.value }))} placeholder="12.345.678-9" className="field-input" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>Email del titular</label>
                                    <input type="email" value={bankData.holderEmail} onChange={(e) => setBankData((p) => ({ ...p, holderEmail: e.target.value }))} placeholder="tu@email.com" className="field-input" />
                                </div>
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>Alias / mensaje para el cliente (opcional)</label>
                                    <input type="text" value={bankData.alias ?? ''} onChange={(e) => setBankData((p) => ({ ...p, alias: e.target.value }))} placeholder="Ej: Pago sesión psicología" className="field-input" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save button */}
                <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                >
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : saved ? <IconCheck size={14} /> : null}
                    {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                </button>
            </div>

            <style>{`
                .field-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.75rem;
                    border: 1px solid var(--border);
                    background: var(--bg);
                    color: var(--fg);
                    font-size: 0.875rem;
                    outline: none;
                }
                .field-input:focus { border-color: var(--accent); }
            `}</style>

        </div>
    );
}
