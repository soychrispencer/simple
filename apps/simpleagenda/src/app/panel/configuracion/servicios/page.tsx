'use client';

import { useEffect, useState } from 'react';
import { IconPlus, IconTrash, IconLoader2, IconEdit, IconAlertCircle } from '@tabler/icons-react';
import {
    PanelCard,
    PanelField,
    PanelButton,
    PanelSwitch,
    PanelNotice,
    PanelPageHeader,
    PanelEmptyState,
} from '@simple/ui';
import {
    fetchAgendaServices,
    createAgendaService,
    updateAgendaService,
    deleteAgendaService,
    type AgendaService,
} from '@/lib/agenda-api';

const COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1'];

const DURATIONS = [30, 45, 50, 60, 90, 120];

type ServiceForm = {
    name: string;
    description: string;
    durationMinutes: number;
    price: string;
    isOnline: boolean;
    isPresential: boolean;
    color: string;
};

const emptyForm = (): ServiceForm => ({
    name: '',
    description: '',
    durationMinutes: 50,
    price: '',
    isOnline: true,
    isPresential: false,
    color: '#0D9488',
});

export default function ServiciosConfigPage() {
    const [services, setServices] = useState<AgendaService[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ServiceForm>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchAgendaServices();
        setServices(data);
        setLoading(false);
    };

    const set = (key: keyof ServiceForm, value: string | boolean | number) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleEdit = (service: AgendaService) => {
        setEditingId(service.id);
        setForm({
            name: service.name,
            description: service.description ?? '',
            durationMinutes: service.durationMinutes,
            price: service.price ?? '',
            isOnline: service.isOnline,
            isPresential: service.isPresential,
            color: service.color ?? '#0D9488',
        });
        setShowForm(true);
        setError('');
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm());
        setError('');
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError('El nombre del servicio es requerido.'); return; }
        if (!form.isOnline && !form.isPresential) { setError('Selecciona al menos una modalidad.'); return; }
        setSaving(true);
        setError('');
        const body = {
            name: form.name.trim(),
            description: form.description || null,
            durationMinutes: form.durationMinutes,
            price: form.price || null,
            isOnline: form.isOnline,
            isPresential: form.isPresential,
            color: form.color,
        };
        const result = editingId
            ? await updateAgendaService(editingId, body)
            : await createAgendaService(body);
        setSaving(false);
        if (!result.ok) { setError(result.error ?? 'Error al guardar.'); return; }
        await load();
        handleCancel();
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await deleteAgendaService(id);
        setDeletingId(null);
        setServices((prev) => prev.filter((s) => s.id !== id));
    };

    const handleToggleActive = async (service: AgendaService) => {
        setTogglingId(service.id);
        const next = !service.isActive;
        const result = await updateAgendaService(service.id, { isActive: next });
        if (result.ok) {
            setServices((prev) => prev.map((s) => s.id === service.id ? { ...s, isActive: next } : s));
        }
        setTogglingId(null);
    };

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Servicios y sesiones"
                description="Define los tipos de consulta que ofreces."
                actions={
                    !showForm ? (
                        <PanelButton
                            variant="accent"
                            size="sm"
                            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); setError(''); }}
                        >
                            <IconPlus size={15} />
                            Nuevo servicio
                        </PanelButton>
                    ) : null
                }
            />

            {/* Form */}
            {showForm && (
                <div className="mb-6">
                    <PanelCard size="md" className="border-[--accent]">
                        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                            {editingId ? 'Editar servicio' : 'Nuevo servicio'}
                        </h2>
                        <div className="flex flex-col gap-4">
                            <PanelField label="Nombre" required>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    placeholder="Ej: Consulta individual"
                                    className="form-input"
                                />
                            </PanelField>
                            <PanelField label="Descripción">
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => set('description', e.target.value)}
                                    placeholder="Breve descripción (opcional)"
                                    className="form-input"
                                />
                            </PanelField>

                            <div className="grid grid-cols-2 gap-4">
                                <PanelField label="Duración">
                                    <select
                                        value={form.durationMinutes}
                                        onChange={(e) => set('durationMinutes', Number(e.target.value))}
                                        className="form-select"
                                    >
                                        {DURATIONS.map((d) => (
                                            <option key={d} value={d}>{d} minutos</option>
                                        ))}
                                    </select>
                                </PanelField>
                                <PanelField label="Precio (CLP)">
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.price}
                                        onChange={(e) => set('price', e.target.value)}
                                        placeholder="Ej: 50000"
                                        className="form-input"
                                    />
                                </PanelField>
                            </div>

                            <PanelField label="Modalidad">
                                <div className="flex gap-3">
                                    {([['isOnline', 'Online'], ['isPresential', 'Presencial']] as [keyof ServiceForm, string][]).map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => set(key, !form[key])}
                                            className="flex-1 py-2.5 rounded-xl border text-sm transition-colors"
                                            style={{
                                                borderColor: form[key] ? 'var(--accent)' : 'var(--border)',
                                                background: form[key] ? 'var(--accent-soft)' : 'transparent',
                                                color: form[key] ? 'var(--accent)' : 'var(--fg-secondary)',
                                                fontWeight: form[key] ? 600 : 400,
                                            }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </PanelField>

                            <PanelField label="Color en el calendario">
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => set('color', c)}
                                            aria-label={`Color ${c}`}
                                            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                                            style={{
                                                background: c,
                                                outline: form.color === c ? `2px solid ${c}` : 'none',
                                                outlineOffset: '2px',
                                            }}
                                        />
                                    ))}
                                </div>
                            </PanelField>

                            {error && (
                                <PanelNotice tone="error">
                                    <span className="flex items-center gap-2"><IconAlertCircle size={14} /> {error}</span>
                                </PanelNotice>
                            )}

                            <div className="flex gap-3">
                                <PanelButton
                                    variant="accent"
                                    onClick={() => void handleSave()}
                                    disabled={saving}
                                >
                                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </PanelButton>
                                <PanelButton
                                    variant="secondary"
                                    onClick={handleCancel}
                                >
                                    Cancelar
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            )}

            {/* Services list */}
            {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={15} className="animate-spin" /> Cargando servicios...
                </div>
            ) : services.length === 0 && !showForm ? (
                <PanelEmptyState
                    title="Sin servicios aún"
                    description="Agrega tu primer tipo de sesión para empezar a recibir reservas."
                    action={
                        <PanelButton
                            variant="accent"
                            size="sm"
                            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); setError(''); }}
                        >
                            <IconPlus size={15} /> Agregar servicio
                        </PanelButton>
                    }
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {services.map((service) => {
                        const isToggling = togglingId === service.id;
                        const isDeleting = deletingId === service.id;
                        return (
                            <PanelCard
                                key={service.id}
                                size="sm"
                                className={service.isActive ? '' : 'opacity-60'}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-3 h-10 rounded-full shrink-0"
                                        style={{ background: service.color ?? 'var(--accent)' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{service.name}</p>
                                            {!service.isActive && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                                    Inactivo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                            {service.durationMinutes} min
                                            {service.price ? ` · ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: service.currency, minimumFractionDigits: 0 }).format(parseFloat(service.price))}` : ''}
                                            {service.isOnline ? ' · Online' : ''}
                                            {service.isPresential ? ' · Presencial' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {isToggling ? (
                                            <IconLoader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                        ) : (
                                            <PanelSwitch
                                                checked={service.isActive}
                                                onChange={() => void handleToggleActive(service)}
                                                size="sm"
                                                ariaLabel={service.isActive ? 'Desactivar servicio' : 'Activar servicio'}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(service)}
                                            aria-label="Editar"
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                        >
                                            <IconEdit size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleDelete(service.id)}
                                            disabled={isDeleting}
                                            aria-label="Eliminar"
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        >
                                            {isDeleting
                                                ? <IconLoader2 size={13} className="animate-spin" />
                                                : <IconTrash size={13} />}
                                        </button>
                                    </div>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
