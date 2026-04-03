'use client';

import { useEffect, useState } from 'react';
import { IconPlus, IconTrash, IconLoader2, IconBriefcase } from '@tabler/icons-react';
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

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Servicios y sesiones</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Define los tipos de consulta que ofreces.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); setError(''); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        <IconPlus size={15} />
                        Nuevo servicio
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
                    <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                        {editingId ? 'Editar servicio' : 'Nuevo servicio'}
                    </h2>
                    <div className="flex flex-col gap-4">
                        <Field label="Nombre *">
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                placeholder="Ej: Consulta individual"
                                className="field-input"
                            />
                        </Field>
                        <Field label="Descripción">
                            <input
                                type="text"
                                value={form.description}
                                onChange={(e) => set('description', e.target.value)}
                                placeholder="Breve descripción (opcional)"
                                className="field-input"
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Duración">
                                <select
                                    value={form.durationMinutes}
                                    onChange={(e) => set('durationMinutes', Number(e.target.value))}
                                    className="field-input"
                                >
                                    {DURATIONS.map((d) => (
                                        <option key={d} value={d}>{d} minutos</option>
                                    ))}
                                    <option value={form.durationMinutes}>{form.durationMinutes} min</option>
                                </select>
                            </Field>
                            <Field label="Precio (CLP)">
                                <input
                                    type="number"
                                    min={0}
                                    value={form.price}
                                    onChange={(e) => set('price', e.target.value)}
                                    placeholder="Ej: 50000"
                                    className="field-input"
                                />
                            </Field>
                        </div>

                        <Field label="Modalidad">
                            <div className="flex gap-3">
                                {([['isOnline', 'Online'], ['isPresential', 'Presencial']] as [keyof ServiceForm, string][]).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => set(key, !form[key])}
                                        className="flex-1 py-2.5 rounded-xl border text-sm transition-colors"
                                        style={{
                                            borderColor: form[key] ? 'var(--accent)' : 'var(--border)',
                                            background: form[key] ? 'var(--accent-subtle)' : 'transparent',
                                            color: form[key] ? 'var(--accent)' : 'var(--fg-secondary)',
                                            fontWeight: form[key] ? 600 : 400,
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <Field label="Color en el calendario">
                            <div className="flex gap-2 flex-wrap">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => set('color', c)}
                                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                                        style={{
                                            background: c,
                                            outline: form.color === c ? `2px solid ${c}` : 'none',
                                            outlineOffset: '2px',
                                        }}
                                    />
                                ))}
                            </div>
                        </Field>

                        {error && (
                            <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => void handleSave()}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                                {saving && <IconLoader2 size={14} className="animate-spin" />}
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Services list */}
            {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={15} className="animate-spin" /> Cargando servicios...
                </div>
            ) : services.length === 0 && !showForm ? (
                <div className="rounded-2xl border flex flex-col items-center justify-center py-16 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconBriefcase size={20} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>Sin servicios aún</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Agrega tu primer tipo de sesión.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {services.map((service) => (
                        <div
                            key={service.id}
                            className="flex items-center gap-4 p-4 rounded-2xl border"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <div
                                className="w-3 h-10 rounded-full shrink-0"
                                style={{ background: service.color ?? 'var(--accent)' }}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{service.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    {service.durationMinutes} min
                                    {service.price ? ` · ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: service.currency, minimumFractionDigits: 0 }).format(parseFloat(service.price))}` : ''}
                                    {service.isOnline ? ' · Online' : ''}
                                    {service.isPresential ? ' · Presencial' : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(service)}
                                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-(--bg-subtle)"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => void handleDelete(service.id)}
                                    disabled={deletingId === service.id}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                >
                                    {deletingId === service.id
                                        ? <IconLoader2 size={13} className="animate-spin" />
                                        : <IconTrash size={13} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</label>
            {children}
        </div>
    );
}
