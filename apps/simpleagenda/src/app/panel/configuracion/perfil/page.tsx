'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconAlertCircle, IconLoader2, IconCamera, IconX, IconSparkles } from '@tabler/icons-react';
import { fetchAgendaProfile, saveAgendaProfile, uploadAvatar } from '@/lib/agenda-api';
import { generatePolicies } from '@/actions/generate-policies';
import Link from 'next/link';
import { IconChevronRight, IconMapPin } from '@tabler/icons-react';
import { PanelCard, PanelField, PanelButton, PanelNotice, PanelBlockHeader, PanelPageHeader } from '@simple/ui';

export default function PerfilConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [generatingPolicies, setGeneratingPolicies] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        displayName: '',
        profession: '',
        headline: '',
        bio: '',
        avatarUrl: '',
        publicEmail: '',
        publicPhone: '',
        publicWhatsapp: '',
        confirmationMode: 'auto' as 'auto' | 'manual',
        bookingWindowDays: 30,
        cancellationHours: 24,
        currency: 'CLP',
        encuadre: '',
    });

    useEffect(() => {
        const load = async () => {
            const profile = await fetchAgendaProfile();
            if (profile) {
                setForm({
                    displayName: profile.displayName ?? '',
                    profession: profile.profession ?? '',
                    headline: profile.headline ?? '',
                    bio: profile.bio ?? '',
                    avatarUrl: profile.avatarUrl ?? '',
                    publicEmail: profile.publicEmail ?? '',
                    publicPhone: profile.publicPhone ?? '',
                    publicWhatsapp: profile.publicWhatsapp ?? '',
                    confirmationMode: (profile.confirmationMode as 'auto' | 'manual') ?? 'auto',
                    bookingWindowDays: profile.bookingWindowDays ?? 30,
                    cancellationHours: profile.cancellationHours ?? 24,
                    currency: profile.currency ?? 'CLP',
                    encuadre: profile.encuadre ?? '',
                });
            }
            setLoading(false);
        };
        void load();
    }, []);

    const set = (key: keyof typeof form, value: string | boolean | number) => {
        setSaved(false);
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('La imagen no puede pesar más de 5 MB.');
            return;
        }
        setAvatarUploading(true);
        setError('');
        const result = await uploadAvatar(file);
        setAvatarUploading(false);
        if (!result.ok) {
            setError(result.error ?? 'Error al subir la imagen.');
            return;
        }
        if (result.url) {
            setAvatarError(false);
            set('avatarUrl', result.url);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGeneratePolicies = async () => {
        setGeneratingPolicies(true);
        setError('');
        const result = await generatePolicies({
            profession: form.profession,
            displayName: form.displayName,
            cancellationHours: form.cancellationHours,
            bookingWindowDays: form.bookingWindowDays,
            existingText: form.encuadre,
        });
        setGeneratingPolicies(false);
        if (result.text) {
            set('encuadre', result.text);
        } else if (result.error) {
            setError(result.error);
        }
    };

    const handleSave = async () => {
        if (!form.displayName.trim()) { setError('El nombre visible es requerido.'); return; }
        setSaving(true);
        setError('');
        const result = await saveAgendaProfile(form);
        setSaving(false);
        if (!result.ok) { setError(result.error ?? 'Error al guardar.'); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return (
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando perfil...
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Perfil profesional"
                description="Esta información aparecerá en tu página pública de reservas."
            />

            <div className="flex flex-col gap-6">
                {/* Avatar */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Foto de perfil" className="mb-3" />
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                            >
                                {form.avatarUrl && !avatarError ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={encodeURI(form.avatarUrl)} alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                                ) : (
                                    form.displayName?.charAt(0)?.toUpperCase() ?? '?'
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors"
                                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                                {avatarUploading ? <IconLoader2 size={14} className="animate-spin" /> : <IconCamera size={14} />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: 'var(--fg)' }}>
                                {form.avatarUrl ? 'Foto de perfil configurada' : 'Sin foto de perfil'}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>JPG o PNG, maximo 5 MB</p>
                            {form.avatarUrl && (
                                <button
                                    onClick={() => set('avatarUrl', '')}
                                    className="text-xs mt-1 flex items-center gap-1"
                                    style={{ color: 'var(--color-error)' }}
                                >
                                    <IconX size={12} /> Eliminar foto
                                </button>
                            )}
                        </div>
                    </div>
                </PanelCard>

                {/* Info basica */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Informacion publica" className="mb-3" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <PanelField label="Nombre visible" required>
                            <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Ej: Dra. Maria Gonzalez" className="form-input" />
                        </PanelField>
                        <PanelField label="Profesion">
                            <input type="text" value={form.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Ej: Psicologa Clinica" className="form-input" />
                        </PanelField>
                        <PanelField label="Titular" hint="Aparece bajo tu nombre" className="sm:col-span-2">
                            <input type="text" value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Ej: Especialista en ansiedad y relaciones" className="form-input" />
                        </PanelField>
                        <PanelField label="Biografia" className="sm:col-span-2">
                            <textarea
                                value={form.bio}
                                onChange={(e) => set('bio', e.target.value)}
                                placeholder="Cuentale a tus pacientes sobre ti, tu enfoque y experiencia..."
                                rows={4}
                                className="form-textarea"
                            />
                        </PanelField>
                    </div>
                </PanelCard>

                {/* Contacto */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Contacto" className="mb-3" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <PanelField label="WhatsApp">
                            <input type="tel" value={form.publicWhatsapp} onChange={(e) => set('publicWhatsapp', e.target.value)} placeholder="+56 9 1234 5678" className="form-input" />
                        </PanelField>
                        <PanelField label="Telefono">
                            <input type="tel" value={form.publicPhone} onChange={(e) => set('publicPhone', e.target.value)} placeholder="+56 2 1234 5678" className="form-input" />
                        </PanelField>
                        <PanelField label="Email publico" className="sm:col-span-2">
                            <input type="email" value={form.publicEmail} onChange={(e) => set('publicEmail', e.target.value)} placeholder="contacto@ejemplo.cl" className="form-input" />
                        </PanelField>
                    </div>
                </PanelCard>

                {/* Ubicacion — gestionada desde Direcciones */}
                <Link
                    href="/panel/configuracion/direcciones"
                    className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                        <IconMapPin size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Consultorios y direcciones</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            Agrega una o más direcciones donde atiendes presencialmente.
                        </p>
                    </div>
                    <IconChevronRight size={16} style={{ color: 'var(--accent)' }} />
                </Link>

                {/* Configuracion de reservas */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Configuracion de reservas" className="mb-3" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <PanelField label="Confirmacion de citas" className="sm:col-span-2">
                            <div className="flex gap-3">
                                {(['auto', 'manual'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => set('confirmationMode', mode)}
                                        className="flex-1 py-2.5 rounded-xl border text-sm transition-colors"
                                        style={{
                                            borderColor: form.confirmationMode === mode ? 'var(--accent)' : 'var(--border)',
                                            background: form.confirmationMode === mode ? 'var(--accent-soft)' : 'transparent',
                                            color: form.confirmationMode === mode ? 'var(--accent)' : 'var(--fg-secondary)',
                                            fontWeight: form.confirmationMode === mode ? 600 : 400,
                                        }}
                                    >
                                        {mode === 'auto' ? 'Automatica' : 'Manual'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                                {form.confirmationMode === 'auto'
                                    ? 'Las reservas se confirman inmediatamente.'
                                    : 'Debes aprobar cada reserva manualmente.'}
                            </p>
                        </PanelField>

                        <PanelField label="Ventana de reserva (dias)" hint="Cuantos dias antes pueden reservar">
                            <input
                                type="number"
                                min={1}
                                max={365}
                                value={form.bookingWindowDays}
                                onChange={(e) => set('bookingWindowDays', Number(e.target.value))}
                                className="form-input"
                            />
                        </PanelField>
                        <PanelField label="Aviso de cancelacion (horas)" hint="Minimo para cancelar">
                            <input
                                type="number"
                                min={0}
                                max={168}
                                value={form.cancellationHours}
                                onChange={(e) => set('cancellationHours', Number(e.target.value))}
                                className="form-input"
                            />
                        </PanelField>
                    </div>
                </PanelCard>

                {/* Políticas y condiciones */}
                <PanelCard size="md">
                    <PanelBlockHeader
                        title="Políticas y condiciones"
                        description="El paciente deberá leerlas y aceptarlas antes de reservar."
                        className="mb-3"
                        actions={
                            <PanelButton
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleGeneratePolicies()}
                                disabled={generatingPolicies}
                            >
                                {generatingPolicies
                                    ? <IconLoader2 size={14} className="animate-spin" />
                                    : <IconSparkles size={14} />}
                                {generatingPolicies ? 'Generando...' : 'Generar con IA'}
                            </PanelButton>
                        }
                    />
                    <PanelField
                        label="Texto de políticas"
                        hint="Puedes generarlas con IA y luego editarlas a tu gusto."
                    >
                        <textarea
                            value={form.encuadre}
                            onChange={(e) => set('encuadre', e.target.value)}
                            placeholder="Escribe aquí tus políticas y condiciones para los pacientes..."
                            rows={8}
                            className="form-textarea"
                        />
                    </PanelField>
                </PanelCard>

                {error && (
                    <PanelNotice tone="error">
                        <span className="flex items-center gap-2"><IconAlertCircle size={15} /> {error}</span>
                    </PanelNotice>
                )}

                <div className="flex">
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

            {/* Siguiente paso */}
            <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                <Link
                    href="/panel/configuracion/servicios"
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div>
                        <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--fg-muted)' }}>Siguiente paso</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Servicios y sesiones</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Define los tipos de consulta, duración y precio.</p>
                    </div>
                    <IconChevronRight size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </Link>
            </div>
        </div>
    );
}
