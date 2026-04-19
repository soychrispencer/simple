'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    IconPlus,
    IconLoader2,
    IconTrash,
    IconEdit,
    IconX,
    IconCheck,
    IconCopy,
    IconAlertCircle,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelButton,
    PanelField,
    PanelSwitch,
    PanelNotice,
    PanelPageHeader,
    PanelEmptyState,
} from '@simple/ui';
import {
    fetchAgendaPromotions,
    createAgendaPromotion,
    patchAgendaPromotion,
    deleteAgendaPromotion,
    fetchAgendaServices,
    type AgendaPromotion,
    type AgendaService,
    type PromotionDiscountType,
    type PromotionAppliesTo,
} from '@/lib/agenda-api';

type PromoForm = {
    code: string;
    label: string;
    description: string;
    discountType: PromotionDiscountType;
    discountValue: string;
    appliesTo: PromotionAppliesTo;
    serviceIds: string[];
    minAmount: string;
    maxUses: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
};

const emptyForm = (): PromoForm => ({
    code: '',
    label: '',
    description: '',
    discountType: 'percent',
    discountValue: '',
    appliesTo: 'all',
    serviceIds: [],
    minAmount: '',
    maxUses: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
});

const formatCLP = (n: number) => n.toLocaleString('es-CL');

const fromIsoToLocalInput = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // "YYYY-MM-DDTHH:mm" para el <input type="datetime-local">
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toIsoFromLocalInput = (value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const promoToForm = (p: AgendaPromotion): PromoForm => ({
    code: p.code ?? '',
    label: p.label,
    description: p.description ?? '',
    discountType: p.discountType,
    discountValue: p.discountValue,
    appliesTo: p.appliesTo,
    serviceIds: p.serviceIds ?? [],
    minAmount: p.minAmount ?? '',
    maxUses: p.maxUses !== null ? String(p.maxUses) : '',
    startsAt: fromIsoToLocalInput(p.startsAt),
    endsAt: fromIsoToLocalInput(p.endsAt),
    isActive: p.isActive,
});

function isExpired(p: AgendaPromotion): boolean {
    if (!p.endsAt) return false;
    const d = new Date(p.endsAt);
    return !Number.isNaN(d.getTime()) && d < new Date();
}

function isNotYetActive(p: AgendaPromotion): boolean {
    if (!p.startsAt) return false;
    const d = new Date(p.startsAt);
    return !Number.isNaN(d.getTime()) && d > new Date();
}

function usesReached(p: AgendaPromotion): boolean {
    return p.maxUses !== null && p.usesCount >= p.maxUses;
}

function statusLabel(p: AgendaPromotion): { label: string; tone: 'active' | 'muted' | 'warn' } {
    if (!p.isActive) return { label: 'Pausada', tone: 'muted' };
    if (isExpired(p)) return { label: 'Expirada', tone: 'muted' };
    if (usesReached(p)) return { label: 'Agotada', tone: 'warn' };
    if (isNotYetActive(p)) return { label: 'Programada', tone: 'warn' };
    return { label: 'Activa', tone: 'active' };
}

export default function PromocionesPage() {
    const [promotions, setPromotions] = useState<AgendaPromotion[]>([]);
    const [services, setServices] = useState<AgendaService[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<PromoForm>(emptyForm());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const [proms, svcs] = await Promise.all([fetchAgendaPromotions(), fetchAgendaServices()]);
            setPromotions(proms);
            setServices(svcs);
            setLoading(false);
        };
        void load();
    }, []);

    const openNew = () => {
        setEditingId(null);
        setForm(emptyForm());
        setError(null);
        setFormOpen(true);
    };

    const openEdit = (p: AgendaPromotion) => {
        setEditingId(p.id);
        setForm(promoToForm(p));
        setError(null);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setError(null);
    };

    const handleSubmit = async () => {
        setError(null);
        const label = form.label.trim();
        if (!label) { setError('Falta el nombre de la promoción.'); return; }
        const value = Number(form.discountValue);
        if (!Number.isFinite(value) || value <= 0) { setError('El descuento debe ser mayor a 0.'); return; }
        if (form.discountType === 'percent' && value > 100) { setError('El porcentaje no puede superar 100.'); return; }
        if (form.appliesTo === 'services' && form.serviceIds.length === 0) { setError('Selecciona al menos un servicio.'); return; }

        const payload = {
            code: form.code.trim().toUpperCase() || null,
            label,
            description: form.description.trim() || null,
            discountType: form.discountType,
            discountValue: value,
            appliesTo: form.appliesTo,
            serviceIds: form.serviceIds,
            minAmount: form.minAmount ? Number(form.minAmount) : null,
            maxUses: form.maxUses ? Math.floor(Number(form.maxUses)) : null,
            startsAt: toIsoFromLocalInput(form.startsAt),
            endsAt: toIsoFromLocalInput(form.endsAt),
            isActive: form.isActive,
        };

        setSaving(true);
        const res = editingId
            ? await patchAgendaPromotion(editingId, payload)
            : await createAgendaPromotion(payload);
        setSaving(false);

        if (!res.ok) { setError(res.error ?? 'No se pudo guardar.'); return; }
        const updated = await fetchAgendaPromotions();
        setPromotions(updated);
        setFlash(editingId ? 'Promoción actualizada.' : 'Promoción creada.');
        closeForm();
    };

    const handleToggleActive = async (p: AgendaPromotion) => {
        const res = await patchAgendaPromotion(p.id, { isActive: !p.isActive });
        if (res.ok) {
            setPromotions((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: !p.isActive } : x));
            setFlash(p.isActive ? 'Promoción pausada.' : 'Promoción activada.');
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const res = await deleteAgendaPromotion(id);
        setDeletingId(null);
        if (res.ok) {
            setPromotions((prev) => prev.filter((x) => x.id !== id));
            setFlash('Promoción eliminada.');
        } else {
            setError(res.error ?? 'No se pudo eliminar.');
        }
    };

    const handleCopyCode = (code: string) => {
        if (typeof navigator === 'undefined' || !navigator.clipboard) return;
        void navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
    };

    const visibleServices = useMemo(() => services.filter((s) => s.isActive), [services]);

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion/servicios"
                title="Promociones"
                description="Crea descuentos por tiempo limitado o cupones para compartir con tus pacientes."
                actions={
                    <PanelButton variant="accent" size="sm" onClick={openNew}>
                        <IconPlus size={14} /> Nueva
                    </PanelButton>
                }
            />

            {flash && (
                <div className="mb-4">
                    <PanelNotice tone="success">
                        <span className="flex items-center gap-2">
                            <IconCheck size={14} /> {flash}
                        </span>
                    </PanelNotice>
                </div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={14} className="animate-spin" /> Cargando...
                </div>
            ) : promotions.length === 0 && !formOpen ? (
                <PanelEmptyState
                    title="Aún no tienes promociones"
                    description="Crea tu primer cupón y compártelo en redes o con tus pacientes."
                    action={<PanelButton variant="accent" size="sm" onClick={openNew}><IconPlus size={14} /> Crear promoción</PanelButton>}
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {promotions.map((p) => {
                        const status = statusLabel(p);
                        const toneBg = status.tone === 'active' ? 'rgba(13,148,136,0.1)' : status.tone === 'warn' ? 'rgba(234,179,8,0.1)' : 'var(--bg-muted)';
                        const toneFg = status.tone === 'active' ? 'var(--accent)' : status.tone === 'warn' ? '#b45309' : 'var(--fg-muted)';
                        const discountText = p.discountType === 'percent'
                            ? `${Number(p.discountValue)}% off`
                            : `-$${formatCLP(Number(p.discountValue))}`;
                        return (
                            <PanelCard key={p.id} size="md">
                                <div className="flex items-start gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{p.label}</h3>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: toneBg, color: toneFg }}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{discountText}</span>
                                            {p.code && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCode(p.code!)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[11px] font-semibold hover:opacity-80"
                                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                                                >
                                                    {copiedCode === p.code ? <><IconCheck size={11} /> Copiado</> : <><IconCopy size={11} /> {p.code}</>}
                                                </button>
                                            )}
                                            {p.maxUses !== null && (
                                                <span>{p.usesCount}/{p.maxUses} usos</span>
                                            )}
                                            {p.maxUses === null && p.usesCount > 0 && (
                                                <span>{p.usesCount} usos</span>
                                            )}
                                            {p.endsAt && (
                                                <span>hasta {new Date(p.endsAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                                            )}
                                        </div>
                                        {p.description && (
                                            <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>{p.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <PanelSwitch checked={p.isActive} onChange={() => handleToggleActive(p)} />
                                        <PanelButton variant="ghost" size="sm" onClick={() => openEdit(p)}>
                                            <IconEdit size={14} />
                                        </PanelButton>
                                        <PanelButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => void handleDelete(p.id)}
                                            disabled={deletingId === p.id}
                                        >
                                            {deletingId === p.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
                                        </PanelButton>
                                    </div>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}

            {formOpen && (
                <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={closeForm}>
                    <div
                        className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                {editingId ? 'Editar promoción' : 'Nueva promoción'}
                            </h2>
                            <button type="button" onClick={closeForm} className="p-1 rounded-lg hover:bg-(--bg-muted)">
                                <IconX size={16} style={{ color: 'var(--fg-muted)' }} />
                            </button>
                        </div>

                        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(220,38,38,0.08)', color: '#b91c1c' }}>
                                    <IconAlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    {error}
                                </div>
                            )}

                            <PanelField label="Nombre" required>
                                <input
                                    type="text"
                                    value={form.label}
                                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                                    placeholder="Primera sesión"
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <PanelField label="Código del cupón" hint="Opcional. Si lo dejas vacío, se aplicará como promoción interna.">
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 40) }))}
                                    placeholder="BIENVENIDO30"
                                    className="w-full h-9 px-3 rounded-xl text-sm font-mono uppercase"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <div className="grid grid-cols-2 gap-3">
                                <PanelField label="Tipo" required>
                                    <select
                                        value={form.discountType}
                                        onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as PromotionDiscountType }))}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    >
                                        <option value="percent">Porcentaje</option>
                                        <option value="fixed">Monto fijo</option>
                                    </select>
                                </PanelField>
                                <PanelField label={form.discountType === 'percent' ? 'Porcentaje (%)' : 'Monto ($)'} required>
                                    <input
                                        type="number"
                                        min={0}
                                        step={form.discountType === 'percent' ? 1 : 100}
                                        value={form.discountValue}
                                        onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                                        placeholder={form.discountType === 'percent' ? '30' : '5000'}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                            </div>

                            <PanelField label="Aplica a">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, appliesTo: 'all' }))}
                                        className="h-9 px-3 rounded-xl text-xs font-medium"
                                        style={{
                                            background: form.appliesTo === 'all' ? 'var(--accent-soft)' : 'var(--bg)',
                                            border: `1px solid ${form.appliesTo === 'all' ? 'var(--accent)' : 'var(--border)'}`,
                                            color: form.appliesTo === 'all' ? 'var(--accent)' : 'var(--fg-muted)',
                                        }}
                                    >Todos los servicios</button>
                                    <button
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, appliesTo: 'services' }))}
                                        className="h-9 px-3 rounded-xl text-xs font-medium"
                                        style={{
                                            background: form.appliesTo === 'services' ? 'var(--accent-soft)' : 'var(--bg)',
                                            border: `1px solid ${form.appliesTo === 'services' ? 'var(--accent)' : 'var(--border)'}`,
                                            color: form.appliesTo === 'services' ? 'var(--accent)' : 'var(--fg-muted)',
                                        }}
                                    >Servicios específicos</button>
                                </div>
                            </PanelField>

                            {form.appliesTo === 'services' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Servicios</label>
                                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto p-2 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                        {visibleServices.length === 0 ? (
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>No hay servicios activos.</p>
                                        ) : visibleServices.map((s) => {
                                            const checked = form.serviceIds.includes(s.id);
                                            return (
                                                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--fg)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            setForm((f) => ({
                                                                ...f,
                                                                serviceIds: e.target.checked
                                                                    ? [...f.serviceIds, s.id]
                                                                    : f.serviceIds.filter((id) => id !== s.id),
                                                            }));
                                                        }}
                                                    />
                                                    <span className="flex-1">{s.name}</span>
                                                    {s.price && <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>${formatCLP(Number(s.price))}</span>}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <PanelField label="Mínimo de compra" hint="Opcional">
                                    <input
                                        type="number"
                                        min={0}
                                        step={100}
                                        value={form.minAmount}
                                        onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
                                        placeholder="Sin mínimo"
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                                <PanelField label="Usos máximos" hint="Opcional">
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={form.maxUses}
                                        onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                                        placeholder="Ilimitado"
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <PanelField label="Válida desde">
                                    <input
                                        type="datetime-local"
                                        value={form.startsAt}
                                        onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                                <PanelField label="Válida hasta">
                                    <input
                                        type="datetime-local"
                                        value={form.endsAt}
                                        onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                            </div>

                            <PanelField label="Descripción interna" hint="Solo visible para ti.">
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Ej. Campaña black friday"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Activa</span>
                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Solo las promociones activas pueden aplicarse.
                                    </span>
                                </div>
                                <PanelSwitch checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                            <PanelButton variant="secondary" size="sm" onClick={closeForm}>Cancelar</PanelButton>
                            <PanelButton variant="accent" size="sm" onClick={() => void handleSubmit()} disabled={saving}>
                                {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                                {editingId ? 'Guardar cambios' : 'Crear'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
