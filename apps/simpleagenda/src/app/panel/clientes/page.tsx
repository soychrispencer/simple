'use client';

import { useEffect, useState } from 'react';
import { IconPlus, IconSearch, IconLoader2, IconUsers, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaClients, createAgendaClient, type AgendaClient } from '@/lib/agenda-api';

type ClientForm = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp: string;
    rut: string;
    dateOfBirth: string;
    gender: string;
    occupation: string;
    city: string;
    referredBy: string;
    internalNotes: string;
};

const emptyForm = (): ClientForm => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    rut: '',
    dateOfBirth: '',
    gender: '',
    occupation: '',
    city: '',
    referredBy: '',
    internalNotes: '',
});

export default function ClientesPage() {
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [filtered, setFiltered] = useState<AgendaClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<ClientForm>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        const q = query.toLowerCase().trim();
        if (!q) { setFiltered(clients); return; }
        setFiltered(clients.filter((c) =>
            `${c.firstName} ${c.lastName ?? ''}`.toLowerCase().includes(q) ||
            (c.email ?? '').toLowerCase().includes(q) ||
            (c.phone ?? '').includes(q)
        ));
    }, [query, clients]);

    const load = async () => {
        setLoading(true);
        const data = await fetchAgendaClients();
        setClients(data);
        setFiltered(data);
        setLoading(false);
    };

    const set = (key: keyof ClientForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!form.firstName.trim()) { setError('El nombre es requerido.'); return; }
        setSaving(true);
        setError('');
        const result = await createAgendaClient({
            firstName: form.firstName.trim(),
            lastName: form.lastName || null,
            email: form.email || null,
            phone: form.phone || null,
            whatsapp: form.whatsapp || null,
            rut: form.rut || null,
            dateOfBirth: form.dateOfBirth || null,
            gender: form.gender || null,
            occupation: form.occupation || null,
            city: form.city || null,
            referredBy: form.referredBy || null,
            internalNotes: form.internalNotes || null,
        });
        setSaving(false);
        if (!result.ok) { setError(result.error ?? 'Error al guardar.'); return; }
        setShowForm(false);
        setForm(emptyForm());
        await load();
    };

    const fullName = (c: AgendaClient) => `${c.firstName} ${c.lastName ?? ''}`.trim();
    const initials = (c: AgendaClient) => `${c.firstName.charAt(0)}${(c.lastName ?? '').charAt(0)}`.toUpperCase();

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Pacientes</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        {clients.length} paciente{clients.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setForm(emptyForm()); setError(''); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                >
                    <IconPlus size={15} />
                    Nuevo paciente
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, correo o teléfono..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                />
            </div>

            {/* Create form modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-lg rounded-2xl border p-5 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Nuevo paciente</h2>
                            <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                <IconX size={14} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Nombre *">
                                    <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="María" className="field-input" />
                                </Field>
                                <Field label="Apellido">
                                    <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="González" className="field-input" />
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Email">
                                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="maria@ejemplo.cl" className="field-input" />
                                </Field>
                                <Field label="Teléfono">
                                    <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+56 9 1234 5678" className="field-input" />
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="RUT">
                                    <input type="text" value={form.rut} onChange={(e) => set('rut', e.target.value)} placeholder="12.345.678-9" className="field-input" />
                                </Field>
                                <Field label="Fecha de nacimiento">
                                    <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="field-input" />
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Género">
                                    <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="field-input">
                                        <option value="">—</option>
                                        <option value="femenino">Femenino</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="no_binario">No binario</option>
                                        <option value="prefiere_no_decir">Prefiere no decir</option>
                                    </select>
                                </Field>
                                <Field label="Ciudad">
                                    <input type="text" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Santiago" className="field-input" />
                                </Field>
                            </div>

                            <Field label="Derivado por / cómo llegó">
                                <input type="text" value={form.referredBy} onChange={(e) => set('referredBy', e.target.value)} placeholder="Ej: Recomendación de amigo" className="field-input" />
                            </Field>

                            <Field label="Notas internas">
                                <textarea
                                    value={form.internalNotes}
                                    onChange={(e) => set('internalNotes', e.target.value)}
                                    placeholder="Notas privadas sobre este paciente..."
                                    rows={3}
                                    className="field-input resize-none"
                                />
                            </Field>

                            {error && <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>}

                            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <button
                                    onClick={() => void handleSave()}
                                    disabled={saving}
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                    style={{ background: 'var(--accent)', color: '#fff' }}
                                >
                                    {saving && <IconLoader2 size={14} className="animate-spin" />}
                                    {saving ? 'Guardando...' : 'Crear paciente'}
                                </button>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-[var(--bg-subtle)]"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={15} className="animate-spin" /> Cargando pacientes...
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border flex flex-col items-center justify-center py-20 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconUsers size={20} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                        {query ? 'Sin resultados' : 'Aún no tienes pacientes'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {query ? `No encontramos pacientes con "${query}"` : 'Agrega tu primer paciente para comenzar.'}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((client) => (
                        <Link
                            key={client.id}
                            href={`/panel/clientes/${client.id}`}
                            className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                            >
                                {initials(client)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{fullName(client)}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    {[client.email, client.phone].filter(Boolean).join(' · ') || 'Sin contacto registrado'}
                                </p>
                            </div>
                            {client.city && <p className="text-xs shrink-0" style={{ color: 'var(--fg-muted)' }}>{client.city}</p>}
                        </Link>
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
