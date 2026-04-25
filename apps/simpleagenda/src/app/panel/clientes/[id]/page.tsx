'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    IconArrowLeft,
    IconCalendar,
    IconLoader2,
    IconCheck,
    IconNotes,
    IconChevronDown,
    IconVideo,
    IconMapPin,
    IconPaperclip,
    IconUpload,
    IconDownload,
    IconTrash,
    IconFileText,
    IconPhoto,
    IconPill,
    IconFile,
    IconUserCircle,
    IconClipboardList,
    IconPlus,
    IconX,
    IconTag,
    IconPackage,
    IconEdit,
    IconAlertTriangle,
} from '@tabler/icons-react';
import {
    fetchAgendaClient,
    updateAgendaClient,
    deleteAgendaClient,
    fetchClientAttachments,
    createClientAttachment,
    deleteClientAttachment,
    uploadClientFile,
    fetchClientTags,
    createClientTag,
    assignTagToClient,
    unassignTagFromClient,
    fetchClientPacks,
    fetchAgendaPacks,
    createClientPack,
    deleteClientPack,
    type AgendaClient,
    type AgendaAppointment,
    type ClientAttachment,
    type AttachmentKind,
    type AgendaClientTag,
    type ClientTag,
    type AgendaClientPack,
    type AgendaPack,
} from '@/lib/agenda-api';
import { fmtDateLong as formatDate, fmtTime as formatTime } from '@/lib/format';

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No asistió',
};

const STATUS_COLORS: Record<string, string> = {
    pending: '#F59E0B',
    confirmed: '#0D9488',
    completed: '#6366F1',
    cancelled: '#EF4444',
    no_show: '#9CA3AF',
};

export default function ClienteFichaPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [client, setClient] = useState<AgendaClient | null>(null);
    const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [notes, setNotes] = useState('');
    const [notesSaved, setNotesSaved] = useState(false);
    const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

    const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
    const [uploadKind, setUploadKind] = useState<AttachmentKind>('document');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [deletingAttId, setDeletingAttId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'notes' | 'files'>('overview');

    const [allTags, setAllTags] = useState<AgendaClientTag[]>([]);
    const [assignedTags, setAssignedTags] = useState<ClientTag[]>([]);
    const [tagPickerOpen, setTagPickerOpen] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [tagBusy, setTagBusy] = useState(false);

    const [clientPacks, setClientPacks] = useState<AgendaClientPack[]>([]);
    const [availablePacks, setAvailablePacks] = useState<AgendaPack[]>([]);
    const [packModalOpen, setPackModalOpen] = useState(false);
    const [packSelection, setPackSelection] = useState<string>('');
    const [packBusy, setPackBusy] = useState(false);
    const [packError, setPackError] = useState<string | null>(null);

    const toggleApptNotes = (apptId: string) => {
        setExpandedNotes((prev) => {
            const next = new Set(prev);
            if (next.has(apptId)) next.delete(apptId); else next.add(apptId);
            return next;
        });
    };

    useEffect(() => {
        const load = async () => {
            const [data, atts, tags, packs, catalog] = await Promise.all([
                fetchAgendaClient(id),
                fetchClientAttachments(id),
                fetchClientTags(),
                fetchClientPacks({ clientId: id }),
                fetchAgendaPacks(),
            ]);
            if (!data) { router.push('/panel/clientes'); return; }
            setClient(data.client);
            setAppointments(data.appointments);
            setNotes(data.client.internalNotes ?? '');
            setAttachments(atts);
            setAllTags(tags);
            setAssignedTags(data.client.tags ?? []);
            setClientPacks(packs);
            setAvailablePacks(catalog.filter((p) => p.isActive));
            setLoading(false);
        };
        void load();
    }, [id, router]);

    const assignedTagIds = new Set(assignedTags.map((t) => t.id));
    const availableTags = allTags.filter((t) => !assignedTagIds.has(t.id));

    const handleAssignTag = async (tag: AgendaClientTag) => {
        if (!client) return;
        setTagBusy(true);
        // Optimistic
        setAssignedTags((prev) => [...prev, { id: tag.id, name: tag.name, color: tag.color }]);
        const res = await assignTagToClient(client.id, tag.id);
        if (!res.ok) {
            setAssignedTags((prev) => prev.filter((t) => t.id !== tag.id));
        }
        setTagBusy(false);
    };

    const handleUnassignTag = async (tagId: string) => {
        if (!client) return;
        const previous = assignedTags;
        setAssignedTags((prev) => prev.filter((t) => t.id !== tagId));
        const res = await unassignTagFromClient(client.id, tagId);
        if (!res.ok) setAssignedTags(previous);
    };

    const handleCreateAndAssign = async () => {
        if (!client) return;
        const name = tagInput.trim();
        if (!name) return;
        setTagBusy(true);
        const res = await createClientTag({ name });
        if (res.ok && res.tag) {
            setAllTags((prev) => [...prev, res.tag!]);
            setAssignedTags((prev) => [...prev, { id: res.tag!.id, name: res.tag!.name, color: res.tag!.color }]);
            await assignTagToClient(client.id, res.tag.id);
            setTagInput('');
        }
        setTagBusy(false);
    };

    const openPackModal = () => {
        setPackSelection(availablePacks[0]?.id ?? '');
        setPackError(null);
        setPackModalOpen(true);
    };

    const closePackModal = () => {
        setPackModalOpen(false);
        setPackError(null);
    };

    const handleAssignPack = async () => {
        if (!client) return;
        if (!packSelection) { setPackError('Selecciona un pack.'); return; }
        setPackBusy(true);
        const res = await createClientPack({ clientId: client.id, packId: packSelection });
        setPackBusy(false);
        if (!res.ok) { setPackError(res.error ?? 'No se pudo asignar.'); return; }
        const updated = await fetchClientPacks({ clientId: client.id });
        setClientPacks(updated);
        closePackModal();
    };

    const handleDeleteClientPack = async (packId: string) => {
        if (typeof window !== 'undefined' && !window.confirm('¿Eliminar este bono del cliente?')) return;
        const res = await deleteClientPack(packId);
        if (res.ok) {
            setClientPacks((prev) => prev.filter((x) => x.id !== packId));
        }
    };

    const handleSaveNotes = async () => {
        if (!client) return;
        setSaving(true);
        await updateAgendaClient(client.id, { internalNotes: notes });
        setSaving(false);
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
    };

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !client) return;
        setUploadError('');

        const isImageKind = uploadKind === 'image';
        const maxBytes = isImageKind ? 8 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxBytes) {
            setUploadError(isImageKind ? 'La imagen no puede pesar más de 8 MB.' : 'El archivo no puede pesar más de 20 MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setUploading(true);
        const fileType: 'image' | 'document' = isImageKind ? 'image' : 'document';
        const upload = await uploadClientFile(file, fileType);
        if (!upload.ok || !upload.url) {
            setUploading(false);
            setUploadError(upload.error ?? 'Error al subir el archivo.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        const result = await createClientAttachment(client.id, {
            name: file.name,
            url: upload.url,
            mimeType: file.type || null,
            sizeBytes: file.size,
            kind: uploadKind,
        });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!result.ok || !result.attachment) {
            setUploadError(result.error ?? 'No se pudo guardar el archivo.');
            return;
        }
        setAttachments((prev) => [result.attachment!, ...prev]);
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (!client) return;
        setDeletingAttId(attachmentId);
        const result = await deleteClientAttachment(client.id, attachmentId);
        setDeletingAttId(null);
        if (result.ok) {
            setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        }
    };

    const handleDeleteClient = async () => {
        if (!client) return;
        setDeleting(true);
        setDeleteError('');
        const result = await deleteAgendaClient(client.id);
        setDeleting(false);
        if (result.ok) {
            router.push('/panel/clientes');
        } else {
            setDeleteError(result.error ?? 'No se pudo eliminar el paciente.');
        }
    };

    const handleEditClient = () => {
        if (!client) return;
        router.push(`/panel/clientes?edit=${client.id}`);
    };

    if (loading) {
        return (
            <div className="container-app panel-page py-4 lg:py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando ficha...
            </div>
        );
    }

    if (!client) return null;

    const fullName = `${client.firstName} ${client.lastName ?? ''}`.trim();
    const initials = `${client.firstName.charAt(0)}${(client.lastName ?? '').charAt(0)}`.toUpperCase();
    const sortedAppts = [...appointments].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    const age = client.dateOfBirth ? (() => {
        const dob = new Date(client.dateOfBirth + 'T12:00:00');
        const today = new Date();
        let a = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
        return a;
    })() : null;
    const completedAppts = appointments.filter((a) => a.status === 'completed');
    const totalPaid = completedAppts.reduce((sum, a) => sum + (a.price ? parseFloat(a.price) : 0), 0);

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-3xl">
            {/* Back */}
            <button
                onClick={() => router.push('/panel/clientes')}
                className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline"
                style={{ color: 'var(--fg-muted)' }}
            >
                <IconArrowLeft size={14} />
                Volver a pacientes
            </button>

            {/* Header card */}
            <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-start gap-4">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                    >
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{fullName}</h1>
                                {client.city && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{client.city}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleEditClient}
                                    aria-label="Editar paciente"
                                    title="Editar paciente"
                                    className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                >
                                    <IconEdit size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setDeleteError(''); setConfirmDelete(true); }}
                                    aria-label="Eliminar paciente"
                                    title="Eliminar paciente"
                                    className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40"
                                    style={{ borderColor: 'var(--border)', color: '#dc2626' }}
                                >
                                    <IconTrash size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                            {assignedTags.map((t) => (
                                <span
                                    key={t.id}
                                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                        background: t.color ? `${t.color}22` : 'var(--accent-soft)',
                                        color: t.color ?? 'var(--accent)',
                                        border: `1px solid ${t.color ?? 'var(--accent-border, var(--border))'}`,
                                    }}
                                >
                                    {t.name}
                                    <button
                                        type="button"
                                        onClick={() => void handleUnassignTag(t.id)}
                                        className="rounded-full p-0.5 hover:bg-black/10 transition-colors"
                                        aria-label={`Quitar etiqueta ${t.name}`}
                                    >
                                        <IconX size={10} />
                                    </button>
                                </span>
                            ))}
                            <button
                                type="button"
                                onClick={() => setTagPickerOpen((v) => !v)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                                style={{
                                    background: tagPickerOpen ? 'var(--accent-soft)' : 'var(--bg-muted)',
                                    color: tagPickerOpen ? 'var(--accent)' : 'var(--fg-muted)',
                                    border: '1px dashed var(--border)',
                                }}
                                aria-expanded={tagPickerOpen}
                            >
                                <IconPlus size={11} />
                                {assignedTags.length === 0 ? 'Añadir etiqueta' : 'Etiqueta'}
                            </button>
                        </div>

                        {tagPickerOpen && (
                            <div
                                className="mt-3 rounded-xl border p-3"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                            >
                                {availableTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {availableTags.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => void handleAssignTag(t)}
                                                disabled={tagBusy}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                                                style={{
                                                    background: t.color ? `${t.color}22` : 'var(--accent-soft)',
                                                    color: t.color ?? 'var(--accent)',
                                                    border: `1px solid ${t.color ?? 'var(--accent-border, var(--border))'}`,
                                                }}
                                            >
                                                <IconTag size={10} />
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); void handleCreateAndAssign(); }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        placeholder="Crear nueva etiqueta…"
                                        maxLength={60}
                                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-xs border outline-none focus:ring-2"
                                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!tagInput.trim() || tagBusy}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                                        style={{ background: 'var(--accent)', color: '#fff' }}
                                    >
                                        {tagBusy ? <IconLoader2 size={11} className="animate-spin" /> : <IconPlus size={11} />}
                                        Crear
                                    </button>
                                </form>
                                {availableTags.length === 0 && allTags.length > 0 && (
                                    <p className="text-[11px] mt-2" style={{ color: 'var(--fg-muted)' }}>
                                        Todas tus etiquetas ya están asignadas.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`grid gap-4 mb-6 ${age !== null ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                <StatCard label="Sesiones" value={String(completedAppts.length)} />
                <StatCard label="Total cobrado" value={totalPaid > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalPaid) : '$0'} />
                <StatCard label="Primera cita" value={sortedAppts.length > 0 ? formatDate(sortedAppts[0].startsAt) : '—'} />
                {age !== null && <StatCard label="Edad" value={`${age} años`} />}
            </div>

            {/* Tabs */}
            <div
                className="flex items-center gap-1 mb-5 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0"
                role="tablist"
                aria-label="Secciones del paciente"
            >
                {[
                    { key: 'overview' as const, label: 'Resumen', icon: IconUserCircle },
                    { key: 'sessions' as const, label: `Sesiones${appointments.length > 0 ? ` (${appointments.length})` : ''}`, icon: IconClipboardList },
                    { key: 'notes' as const, label: 'Notas', icon: IconNotes },
                    { key: 'files' as const, label: `Archivos${attachments.length > 0 ? ` (${attachments.length})` : ''}`, icon: IconPaperclip },
                ].map(({ key, label, icon: Icon }) => {
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveTab(key)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors"
                            style={{
                                background: isActive ? 'var(--accent-soft)' : 'transparent',
                                color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
                                fontWeight: isActive ? 600 : 500,
                            }}
                        >
                            <Icon size={13} />
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Tab: Resumen */}
            {activeTab === 'overview' && (
                <>
                    {[client.rut, client.dateOfBirth, client.gender, client.occupation, client.phone, client.email, client.whatsapp, client.referredBy].some(Boolean) ? (
                        <div className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                            {[
                                { label: 'Teléfono', value: client.phone },
                                { label: 'Email', value: client.email },
                                { label: 'WhatsApp', value: client.whatsapp },
                                { label: 'RUT', value: client.rut },
                                { label: 'Fecha de nacimiento', value: client.dateOfBirth ? new Date(client.dateOfBirth + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                                { label: 'Género', value: client.gender },
                                { label: 'Ocupación', value: client.occupation },
                                { label: 'Derivado por', value: client.referredBy },
                            ].filter((f) => f.value).map((f) => (
                                <div key={f.label} className="flex flex-col gap-0.5">
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{f.label}</p>
                                    <p className="text-sm" style={{ color: 'var(--fg)' }}>{f.value}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)' }}>
                            Sin información de contacto registrada todavía.
                        </div>
                    )}

                    {/* Bonos / packs del cliente */}
                    <div className="mt-4 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                            <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
                                <IconPackage size={14} /> Bonos y packs
                            </h2>
                            <button
                                type="button"
                                onClick={openPackModal}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                <IconPlus size={11} /> Asignar pack
                            </button>
                        </div>
                        {clientPacks.length === 0 ? (
                            <p className="text-xs py-2" style={{ color: 'var(--fg-muted)' }}>
                                Este cliente aún no tiene bonos. Asigna uno al cobrarle un pack de sesiones.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {clientPacks.map((cp) => {
                                    const remaining = cp.sessionsTotal - cp.sessionsUsed;
                                    const expired = cp.expiresAt && new Date(cp.expiresAt) < new Date();
                                    const statusTone =
                                        cp.status === 'completed' ? { bg: 'var(--bg-muted)', fg: 'var(--fg-muted)', label: 'Completado' } :
                                        cp.status === 'refunded' ? { bg: 'var(--bg-muted)', fg: 'var(--fg-muted)', label: 'Reembolsado' } :
                                        expired || cp.status === 'expired' ? { bg: 'var(--bg-muted)', fg: 'var(--fg-muted)', label: 'Expirado' } :
                                        { bg: 'rgba(13,148,136,0.1)', fg: 'var(--accent)', label: 'Activo' };
                                    return (
                                        <div key={cp.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                                <IconPackage size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{cp.name}</p>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: statusTone.bg, color: statusTone.fg }}>
                                                        {statusTone.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                                    {remaining} de {cp.sessionsTotal} sesiones disponibles
                                                    {cp.expiresAt && ` · vence ${new Date(cp.expiresAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteClientPack(cp.id)}
                                                className="p-1.5 rounded-lg hover:bg-(--bg-muted)"
                                                aria-label="Eliminar bono"
                                            >
                                                <IconTrash size={14} style={{ color: 'var(--fg-muted)' }} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {packModalOpen && (
                        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={closePackModal}>
                            <div
                                className="w-full max-w-md rounded-3xl overflow-hidden"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Asignar pack a {`${client.firstName} ${client.lastName ?? ''}`.trim()}</h2>
                                    <button type="button" onClick={closePackModal} className="p-1 rounded-lg hover:bg-(--bg-muted)">
                                        <IconX size={16} style={{ color: 'var(--fg-muted)' }} />
                                    </button>
                                </div>
                                <div className="px-5 py-4 flex flex-col gap-3">
                                    {availablePacks.length === 0 ? (
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            No hay packs activos. Crea uno en Configuración → Packs y bonos.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Pack</label>
                                                <select
                                                    value={packSelection}
                                                    onChange={(e) => setPackSelection(e.target.value)}
                                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                                >
                                                    {availablePacks.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} · {p.sessionsCount} sesiones · ${Number(p.price).toLocaleString('es-CL')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {packError && (
                                                <p className="text-xs" style={{ color: '#dc2626' }}>{packError}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <button type="button" onClick={closePackModal} className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>Cancelar</button>
                                    <button
                                        type="button"
                                        onClick={() => void handleAssignPack()}
                                        disabled={packBusy || availablePacks.length === 0}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60"
                                        style={{ background: 'var(--accent)', color: '#fff' }}
                                    >
                                        {packBusy ? <IconLoader2 size={11} className="animate-spin inline mr-1" /> : null}
                                        Asignar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Tab: Notas */}
            {activeTab === 'notes' && (
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Notas internas</h2>
                        <button
                            onClick={() => void handleSaveNotes()}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                            style={{ borderColor: 'var(--border)', color: notesSaved ? 'var(--accent)' : 'var(--fg-secondary)' }}
                        >
                            {saving ? <IconLoader2 size={11} className="animate-spin" /> : notesSaved ? <IconCheck size={11} /> : null}
                            {notesSaved ? 'Guardado' : 'Guardar'}
                        </button>
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={10}
                        placeholder="Notas clínicas, observaciones, contexto relevante..."
                        className="w-full text-sm resize-none outline-none bg-transparent"
                        style={{ color: 'var(--fg)' }}
                    />
                </div>
            )}

            {/* Tab: Archivos */}
            {activeTab === 'files' && (
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
                        <IconPaperclip size={14} /> Documentos y archivos
                    </h2>
                    <div className="flex items-center gap-2">
                        <select
                            value={uploadKind}
                            onChange={(e) => setUploadKind(e.target.value as AttachmentKind)}
                            disabled={uploading}
                            className="px-2.5 py-1.5 rounded-lg text-xs border bg-transparent outline-none"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            <option value="document">Documento</option>
                            <option value="image">Imagen</option>
                            <option value="prescription">Receta</option>
                            <option value="other">Otro</option>
                        </select>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            {uploading ? <IconLoader2 size={11} className="animate-spin" /> : <IconUpload size={11} />}
                            {uploading ? 'Subiendo...' : 'Subir archivo'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={uploadKind === 'image' ? 'image/*' : undefined}
                            onChange={handleUploadFile}
                        />
                    </div>
                </div>

                {uploadError && (
                    <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{uploadError}</p>
                )}

                {attachments.length === 0 ? (
                    <p className="text-xs py-3" style={{ color: 'var(--fg-muted)' }}>
                        Sube recetas, exámenes, consentimientos, imágenes u otros archivos relacionados con este paciente.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {attachments.map((att) => {
                            const KindIcon = att.kind === 'image' ? IconPhoto
                                : att.kind === 'prescription' ? IconPill
                                : att.kind === 'document' ? IconFileText
                                : IconFile;
                            const kindLabel = att.kind === 'image' ? 'Imagen'
                                : att.kind === 'prescription' ? 'Receta'
                                : att.kind === 'document' ? 'Documento'
                                : 'Archivo';
                            const sizeLabel = att.sizeBytes
                                ? att.sizeBytes >= 1024 * 1024
                                    ? `${(att.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                                    : `${Math.max(1, Math.round(att.sizeBytes / 1024))} KB`
                                : '';
                            const dateLabel = new Date(att.uploadedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
                            const isDeleting = deletingAttId === att.id;
                            const isImagePreview = att.kind === 'image' || (att.mimeType?.startsWith('image/'));

                            return (
                                <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    {isImagePreview ? (
                                        <a
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                        </a>
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                            <KindIcon size={17} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{att.name}</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                            {kindLabel}{sizeLabel ? ` · ${sizeLabel}` : ''} · {dateLabel}
                                        </p>
                                    </div>
                                    <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={att.name}
                                        aria-label="Descargar"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle) shrink-0"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        <IconDownload size={13} />
                                    </a>
                                    <button
                                        onClick={() => void handleDeleteAttachment(att.id)}
                                        disabled={isDeleting}
                                        aria-label="Eliminar"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 shrink-0 disabled:opacity-50"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        {isDeleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            )}

            {/* Tab: Sesiones */}
            {activeTab === 'sessions' && (
            <>
            {appointments.length === 0 ? (
                <div className="rounded-2xl border py-10 text-center" style={{ borderColor: 'var(--border)' }}>
                    <IconCalendar size={20} className="mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sin sesiones registradas.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {sortedAppts.map((appt) => {
                        const hasNotes = !!(appt.sessionNote ?? appt.internalNotes ?? appt.clientNotes);
                        const expanded = expandedNotes.has(appt.id);
                        return (
                            <div
                                key={appt.id}
                                className="rounded-2xl border overflow-hidden"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="flex items-center gap-4 p-4">
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                                        style={{ background: STATUS_COLORS[appt.status] ?? 'var(--fg-muted)' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            {formatDate(appt.startsAt)} — {formatTime(appt.startsAt)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {STATUS_LABELS[appt.status] ?? appt.status}
                                                {appt.price ? ` · ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: appt.currency, minimumFractionDigits: 0 }).format(parseFloat(appt.price))}` : ''}
                                            </p>
                                            <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {appt.modality === 'online'
                                                    ? <><IconVideo size={11} /> Online</>
                                                    : <><IconMapPin size={11} /> Presencial{appt.location ? ` · ${appt.location}` : ''}</>}
                                            </span>
                                        </div>
                                    </div>
                                    {hasNotes && (
                                        <button
                                            onClick={() => toggleApptNotes(appt.id)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle) shrink-0"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        >
                                            <IconNotes size={12} />
                                            Notas
                                            <IconChevronDown size={11} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}
                                </div>
                                {expanded && (
                                    <div className="px-4 pb-4 flex flex-col gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                                        {appt.sessionNote && (
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--fg-muted)' }}>Nota de sesión</p>
                                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>{appt.sessionNote}</p>
                                            </div>
                                        )}
                                        {appt.internalNotes && (
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--fg-muted)' }}>Notas internas</p>
                                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>{appt.internalNotes}</p>
                                            </div>
                                        )}
                                        {appt.clientNotes && (
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--fg-muted)' }}>Notas del paciente</p>
                                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>{appt.clientNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            </>
            )}

            {/* Delete confirmation modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cliente-delete-title">
                    <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !deleting && setConfirmDelete(false)} />
                    <div className="relative w-full max-w-sm rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                                <IconAlertTriangle size={18} />
                            </div>
                            <div className="min-w-0">
                                <h2 id="cliente-delete-title" className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Eliminar paciente</h2>
                                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    Se eliminará a <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{fullName}</span> y su historial. Esta acción no se puede deshacer.
                                </p>
                            </div>
                        </div>
                        {deleteError && (
                            <p className="text-sm mb-3" style={{ color: '#dc2626' }}>{deleteError}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => void handleDeleteClient()}
                                disabled={deleting}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
                                style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
                            >
                                {deleting ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</p>
        </div>
    );
}
