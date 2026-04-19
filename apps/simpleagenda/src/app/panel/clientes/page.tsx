'use client';

import { useEffect, useState, useRef } from 'react';
import { IconPlus, IconSearch, IconLoader2, IconUsers, IconX, IconDownload, IconEdit, IconTrash, IconAlertCircle, IconCheck, IconPhone, IconMail, IconBrandWhatsapp, IconChevronDown, IconTag } from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaClients, createAgendaClient, updateAgendaClient, deleteAgendaClient, fetchClientTags, type AgendaClient, type AgendaClientTag } from '@/lib/agenda-api';
import { vocab } from '@/lib/vocabulary';
import { SkeletonCard } from '@/components/panel/skeleton';
import { useEscapeClose } from '@/lib/use-modal-a11y';

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

type EditForm = ClientForm & Record<string, string>;

export default function ClientesPage() {
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [filtered, setFiltered] = useState<AgendaClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [tags, setTags] = useState<AgendaClientTag[]>([]);
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

    // Create
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<ClientForm>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Edit
    const [editClient, setEditClient] = useState<AgendaClient | null>(null);
    const [editForm, setEditForm] = useState<EditForm>(emptyForm());
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Delete
    const [deleteClient, setDeleteClient] = useState<AgendaClient | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    useEscapeClose(showForm, () => setShowForm(false));
    useEscapeClose(editClient !== null, () => setEditClient(null));
    useEscapeClose(deleteClient !== null, () => setDeleteClient(null));

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        const q = query.toLowerCase().trim();
        let result = clients;
        if (selectedTagId) {
            result = result.filter((c) => c.tagIds?.includes(selectedTagId));
        }
        if (q) {
            result = result.filter((c) =>
                `${c.firstName} ${c.lastName ?? ''}`.toLowerCase().includes(q) ||
                (c.email ?? '').toLowerCase().includes(q) ||
                (c.phone ?? '').includes(q)
            );
        }
        setFiltered(result);
    }, [query, clients, selectedTagId]);

    const load = async () => {
        setLoading(true);
        const [data, tagData] = await Promise.all([fetchAgendaClients(), fetchClientTags()]);
        setClients(data);
        setTags(tagData);
        setLoading(false);
    };

    const set = (key: keyof ClientForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const openEdit = (c: AgendaClient, e: React.MouseEvent) => {
        e.preventDefault();
        setEditForm({
            firstName: c.firstName, lastName: c.lastName ?? '',
            email: c.email ?? '', phone: c.phone ?? '', whatsapp: c.whatsapp ?? '',
            rut: c.rut ?? '', dateOfBirth: c.dateOfBirth ?? '', gender: c.gender ?? '',
            occupation: c.occupation ?? '', city: c.city ?? '', referredBy: c.referredBy ?? '',
            internalNotes: c.internalNotes ?? '',
        });
        setEditError('');
        setEditClient(c);
    };

    const handleEditSave = async () => {
        if (!editClient || !editForm.firstName.trim()) { setEditError('El nombre es requerido.'); return; }
        setEditSaving(true); setEditError('');
        const result = await updateAgendaClient(editClient.id, {
            firstName: editForm.firstName.trim(), lastName: editForm.lastName || null,
            email: editForm.email || null, phone: editForm.phone || null,
            whatsapp: editForm.whatsapp || null, rut: editForm.rut || null,
            dateOfBirth: editForm.dateOfBirth || null, gender: editForm.gender || null,
            occupation: editForm.occupation || null, city: editForm.city || null,
            referredBy: editForm.referredBy || null, internalNotes: editForm.internalNotes || null,
        });
        setEditSaving(false);
        if (!result.ok) { setEditError(result.error ?? 'Error al guardar.'); return; }
        if (result.client) {
            setClients((prev) => prev.map((c) => c.id === result.client!.id ? result.client! : c));
        }
        setEditClient(null);
    };

    const handleDelete = async () => {
        if (!deleteClient) return;
        setDeleting(true); setDeleteError('');
        const result = await deleteAgendaClient(deleteClient.id);
        setDeleting(false);
        if (!result.ok) { setDeleteError(result.error ?? 'Error al eliminar.'); return; }
        setClients((prev) => prev.filter((c) => c.id !== deleteClient.id));
        setDeleteClient(null);
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

    const exportCSV = () => {
        const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'WhatsApp', 'RUT', 'Fecha nacimiento', 'Género', 'Ocupación', 'Ciudad', 'Referido por', 'Notas'];
        const rows = clients.map((c) => [
            c.firstName, c.lastName ?? '', c.email ?? '', c.phone ?? '', c.whatsapp ?? '',
            c.rut ?? '', c.dateOfBirth ?? '', c.gender ?? '', c.occupation ?? '',
            c.city ?? '', c.referredBy ?? '', (c.internalNotes ?? '').replace(/\n/g, ' '),
        ]);
        const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = vocab.exportFilename; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container-app panel-page py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{vocab.Clients}</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        {clients.length} {clients.length !== 1 ? vocab.clients : vocab.client}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {clients.length > 0 && (
                        <button
                            onClick={exportCSV}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            <IconDownload size={14} />
                            Exportar CSV
                        </button>
                    )}
                    <button
                        onClick={() => { setShowForm(true); setForm(emptyForm()); setError(''); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        <IconPlus size={15} />
                        {vocab.newClient}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, correo o teléfono..."
                    className="field-input pl-9"
                />
            </div>

            {/* Tag filter pills */}
            {tags.length > 0 && (
                <div className="flex items-center gap-1.5 mb-5 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por etiqueta">
                    <button
                        type="button"
                        onClick={() => setSelectedTagId(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                        style={{
                            background: selectedTagId === null ? 'var(--accent-soft)' : 'var(--bg-muted)',
                            color: selectedTagId === null ? 'var(--accent)' : 'var(--fg-muted)',
                            border: `1px solid ${selectedTagId === null ? 'var(--accent-border, var(--border))' : 'var(--border)'}`,
                        }}
                    >
                        Todos
                        <span className="text-[10px] opacity-70">{clients.length}</span>
                    </button>
                    {tags.map((t) => {
                        const count = clients.filter((c) => c.tagIds?.includes(t.id)).length;
                        const active = selectedTagId === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTagId(active ? null : t.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                                style={{
                                    background: active ? (t.color ? `${t.color}22` : 'var(--accent-soft)') : 'var(--bg-muted)',
                                    color: active ? (t.color ?? 'var(--accent)') : 'var(--fg-muted)',
                                    border: `1px solid ${active ? (t.color ?? 'var(--accent-border, var(--border))') : 'var(--border)'}`,
                                }}
                            >
                                <IconTag size={10} />
                                {t.name}
                                <span className="text-[10px] opacity-70">{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Create form modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="clientes-create-title">
                    <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-lg rounded-2xl border p-5 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 id="clientes-create-title" className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{vocab.newClient}</h2>
                            <button type="button" aria-label="Cerrar" onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
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
                                    {saving ? 'Guardando...' : `Crear ${vocab.client}`}
                                </button>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
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
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border flex flex-col items-center justify-center py-20 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconUsers size={20} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                        {query ? 'Sin resultados' : vocab.noClients}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {query ? `No encontramos ${vocab.clients} con "${query}"` : vocab.addFirstClient}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((client) => (
                        <div
                            key={client.id}
                            className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            {/* Avatar — click goes to detail */}
                            <Link href={`/panel/clientes/${client.id}`} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                {initials(client)}
                            </Link>

                            {/* Info — click goes to detail */}
                            <Link href={`/panel/clientes/${client.id}`} className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{fullName(client)}</p>
                                    {(client.tagIds ?? []).slice(0, 2).map((tid) => {
                                        const t = tags.find((x) => x.id === tid);
                                        if (!t) return null;
                                        return (
                                            <span
                                                key={tid}
                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                                style={{
                                                    background: t.color ? `${t.color}22` : 'var(--accent-soft)',
                                                    color: t.color ?? 'var(--accent)',
                                                }}
                                            >
                                                {t.name}
                                            </span>
                                        );
                                    })}
                                    {(client.tagIds?.length ?? 0) > 2 && (
                                        <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                                            +{(client.tagIds!.length) - 2}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    {[client.email, client.phone].filter(Boolean).join(' · ') || 'Sin contacto registrado'}
                                </p>
                            </Link>

                            {/* Action buttons — always visible */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <ContactMenu client={client} />
                                <button
                                    onClick={(e) => openEdit(client, e)}
                                    title="Editar"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                >
                                    <IconEdit size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); setDeleteError(''); setDeleteClient(client); }}
                                    title="Eliminar"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10"
                                    style={{ borderColor: 'var(--border)', color: '#dc2626' }}
                                >
                                    <IconTrash size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Edit modal ──────────────────────────────────────────── */}
            {editClient && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="clientes-edit-title">
                    <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setEditClient(null)} />
                    <div className="relative w-full max-w-lg rounded-2xl border p-5 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 id="clientes-edit-title" className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Editar {vocab.client}</h2>
                            <button type="button" aria-label="Cerrar" onClick={() => setEditClient(null)} className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                <IconX size={14} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Nombre *"><input type="text" value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} className="field-input" /></Field>
                                <Field label="Apellido"><input type="text" value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} className="field-input" /></Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Email"><input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="field-input" /></Field>
                                <Field label="Teléfono"><input type="tel" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="field-input" /></Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="WhatsApp"><input type="tel" value={editForm.whatsapp} onChange={(e) => setEditForm((p) => ({ ...p, whatsapp: e.target.value }))} className="field-input" /></Field>
                                <Field label="RUT"><input type="text" value={editForm.rut} onChange={(e) => setEditForm((p) => ({ ...p, rut: e.target.value }))} className="field-input" /></Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Fecha de nacimiento"><input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))} className="field-input" /></Field>
                                <Field label="Género">
                                    <select value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))} className="field-input">
                                        <option value="">—</option>
                                        <option value="femenino">Femenino</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="no_binario">No binario</option>
                                        <option value="prefiere_no_decir">Prefiere no decir</option>
                                    </select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Ocupación"><input type="text" value={editForm.occupation} onChange={(e) => setEditForm((p) => ({ ...p, occupation: e.target.value }))} className="field-input" /></Field>
                                <Field label="Ciudad"><input type="text" value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} className="field-input" /></Field>
                            </div>
                            <Field label="Derivado por / cómo llegó"><input type="text" value={editForm.referredBy} onChange={(e) => setEditForm((p) => ({ ...p, referredBy: e.target.value }))} className="field-input" /></Field>
                            <Field label="Notas internas">
                                <textarea value={editForm.internalNotes} onChange={(e) => setEditForm((p) => ({ ...p, internalNotes: e.target.value }))} rows={3} placeholder="Notas privadas sobre este paciente..." className="field-input resize-none" />
                            </Field>
                            {editError && <p className="flex items-center gap-1.5 text-sm" style={{ color: '#dc2626' }}><IconAlertCircle size={13} />{editError}</p>}
                            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <button onClick={() => void handleEditSave()} disabled={editSaving} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--accent)', color: '#fff' }}>
                                    {editSaving ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                                    {editSaving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                                <button onClick={() => setEditClient(null)} className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirmation ─────────────────────────────────── */}
            {deleteClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="clientes-delete-title">
                    <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setDeleteClient(null)} />
                    <div className="relative w-full max-w-sm rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                                <IconAlertCircle size={18} />
                            </div>
                            <div>
                                <p id="clientes-delete-title" className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>¿Eliminar {vocab.client}?</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Esta acción no se puede deshacer. Se eliminarán todos los datos de <strong>{fullName(deleteClient)}</strong>.</p>
                            </div>
                        </div>
                        {deleteError && <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{deleteError}</p>}
                        <div className="flex gap-2">
                            <button onClick={() => void handleDelete()} disabled={deleting} className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}>
                                {deleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                            <button onClick={() => setDeleteClient(null)} disabled={deleting} className="flex-1 py-2 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
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

function ContactMenu({ client }: { client: AgendaClient }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const waNumber = (client.whatsapp ?? client.phone ?? '').replace(/[^0-9]/g, '');

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (!client.phone && !client.email) return null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle)"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
            >
                Contactar <IconChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border py-1 shadow-lg"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    {client.phone && (
                        <a
                            href={`tel:${client.phone}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-(--bg-subtle) transition-colors"
                            style={{ color: 'var(--fg-secondary)' }}
                        >
                            <IconPhone size={13} style={{ color: 'var(--fg-muted)' }} />
                            Llamar
                        </a>
                    )}
                    {client.email && (
                        <a
                            href={`mailto:${client.email}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-(--bg-subtle) transition-colors"
                            style={{ color: 'var(--fg-secondary)' }}
                        >
                            <IconMail size={13} style={{ color: 'var(--fg-muted)' }} />
                            Correo
                        </a>
                    )}
                    {waNumber && (
                        <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-(--bg-subtle) transition-colors"
                            style={{ color: 'var(--fg-secondary)' }}
                        >
                            <IconBrandWhatsapp size={13} style={{ color: '#22c55e' }} />
                            WhatsApp
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
