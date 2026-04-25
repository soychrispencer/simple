'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    IconPlus,
    IconLoader2,
    IconTrash,
    IconEdit,
    IconX,
    IconCheck,
    IconAlertCircle,
    IconPackage,
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
    fetchAgendaPacks,
    createAgendaPack,
    patchAgendaPack,
    deleteAgendaPack,
    fetchAgendaServices,
    type AgendaPack,
    type AgendaService,
    type PackAppliesTo,
} from '@/lib/agenda-api';

type PackForm = {
    name: string;
    description: string;
    sessionsCount: string;
    price: string;
    appliesTo: PackAppliesTo;
    serviceIds: string[];
    validityDays: string;
    isActive: boolean;
};

const emptyForm = (): PackForm => ({
    name: '',
    description: '',
    sessionsCount: '',
    price: '',
    appliesTo: 'all',
    serviceIds: [],
    validityDays: '',
    isActive: true,
});

const formatCLP = (n: number) => n.toLocaleString('es-CL');

const packToForm = (p: AgendaPack): PackForm => ({
    name: p.name,
    description: p.description ?? '',
    sessionsCount: String(p.sessionsCount),
    price: p.price,
    appliesTo: p.appliesTo,
    serviceIds: p.serviceIds ?? [],
    validityDays: p.validityDays !== null ? String(p.validityDays) : '',
    isActive: p.isActive,
});

export default function PacksPage() {
    const [packs, setPacks] = useState<AgendaPack[]>([]);
    const [services, setServices] = useState<AgendaService[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<PackForm>(emptyForm());
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const [pks, svcs] = await Promise.all([fetchAgendaPacks(), fetchAgendaServices()]);
            setPacks(pks);
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

    const openEdit = (p: AgendaPack) => {
        setEditingId(p.id);
        setForm(packToForm(p));
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
        const name = form.name.trim();
        if (!name) { setError('Falta el nombre del pack.'); return; }
        const sessionsCount = Number(form.sessionsCount);
        if (!Number.isFinite(sessionsCount) || sessionsCount <= 0) {
            setError('Indica cuántas sesiones incluye el pack.'); return;
        }
        const price = Number(form.price);
        if (!Number.isFinite(price) || price < 0) { setError('Precio inválido.'); return; }
        if (form.appliesTo === 'services' && form.serviceIds.length === 0) {
            setError('Selecciona al menos un servicio.'); return;
        }

        const payload = {
            name,
            description: form.description.trim() || null,
            sessionsCount: Math.floor(sessionsCount),
            price,
            appliesTo: form.appliesTo,
            serviceIds: form.serviceIds,
            validityDays: form.validityDays ? Math.floor(Number(form.validityDays)) : null,
            isActive: form.isActive,
        };

        setSaving(true);
        const res = editingId
            ? await patchAgendaPack(editingId, payload)
            : await createAgendaPack(payload);
        setSaving(false);

        if (!res.ok) { setError(res.error ?? 'No se pudo guardar.'); return; }
        const updated = await fetchAgendaPacks();
        setPacks(updated);
        setFlash(editingId ? 'Pack actualizado.' : 'Pack creado.');
        closeForm();
    };

    const handleToggleActive = async (p: AgendaPack) => {
        const res = await patchAgendaPack(p.id, { isActive: !p.isActive });
        if (res.ok) {
            setPacks((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: !p.isActive } : x));
            setFlash(p.isActive ? 'Pack pausado.' : 'Pack activado.');
        }
    };

    const handleDelete = async (id: string) => {
        if (typeof window !== 'undefined' && !window.confirm('¿Eliminar este pack? Los bonos ya vendidos no se borrarán.')) return;
        setDeletingId(id);
        const res = await deleteAgendaPack(id);
        setDeletingId(null);
        if (res.ok) {
            setPacks((prev) => prev.filter((x) => x.id !== id));
            setFlash('Pack eliminado.');
        } else {
            setError(res.error ?? 'No se pudo eliminar.');
        }
    };

    const visibleServices = useMemo(() => services.filter((s) => s.isActive), [services]);

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion/servicios"
                title="Packs y bonos"
                description="Vende varias sesiones juntas con un precio especial. Los pacientes agendan cuando quieran usarlas."
                actions={
                    <PanelButton variant="accent" size="sm" onClick={openNew}>
                        <IconPlus size={14} /> Nuevo
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
            ) : packs.length === 0 && !formOpen ? (
                <PanelEmptyState
                    title="Aún no tienes packs"
                    description="Crea tu primer pack de sesiones (por ejemplo, 5 sesiones con un 10% de descuento)."
                    action={<PanelButton variant="accent" size="sm" onClick={openNew}><IconPlus size={14} /> Crear pack</PanelButton>}
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {packs.map((p) => {
                        const price = Number(p.price);
                        const pricePerSession = p.sessionsCount > 0 ? Math.round(price / p.sessionsCount) : 0;
                        return (
                            <PanelCard key={p.id} size="md">
                                <div className="flex items-start gap-3 flex-wrap">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                        <IconPackage size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{p.name}</h3>
                                            {!p.isActive && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                                    Pausado
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>${formatCLP(price)}</span>
                                            <span>{p.sessionsCount} sesiones</span>
                                            {pricePerSession > 0 && <span>${formatCLP(pricePerSession)} c/u</span>}
                                            {p.validityDays && <span>Vence a {p.validityDays} días</span>}
                                            {p.appliesTo === 'services' && (
                                                <span>{p.serviceIds.length} servicio(s)</span>
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
                                {editingId ? 'Editar pack' : 'Nuevo pack'}
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
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Pack 5 sesiones"
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <div className="grid grid-cols-2 gap-3">
                                <PanelField label="Sesiones" required>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={form.sessionsCount}
                                        onChange={(e) => setForm((f) => ({ ...f, sessionsCount: e.target.value }))}
                                        placeholder="5"
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                                <PanelField label="Precio total" required>
                                    <input
                                        type="number"
                                        min={0}
                                        step={100}
                                        value={form.price}
                                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                        placeholder="135000"
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

                            <PanelField label="Validez (días)" hint="Opcional. El bono vence tras esta cantidad de días desde la compra.">
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={form.validityDays}
                                    onChange={(e) => setForm((f) => ({ ...f, validityDays: e.target.value }))}
                                    placeholder="Sin vencimiento"
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <PanelField label="Descripción" hint="Texto corto para comunicar al paciente.">
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Ej. 5 sesiones con 10% de descuento."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Activo</span>
                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Solo los packs activos pueden venderse.
                                    </span>
                                </div>
                                <PanelSwitch checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                            <PanelButton variant="secondary" size="sm" onClick={closeForm}>Cancelar</PanelButton>
                            <PanelButton variant="accent" size="sm" onClick={() => void handleSubmit()} disabled={saving}>
                                {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                                Guardar
                            </PanelButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
