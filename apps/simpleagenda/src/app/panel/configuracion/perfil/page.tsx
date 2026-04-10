'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { IconCheck, IconAlertCircle, IconLoader2, IconCamera, IconX, IconLink } from '@tabler/icons-react';
import { fetchAgendaProfile, saveAgendaProfile, checkSlugAvailable, uploadAvatar } from '@/lib/agenda-api';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { PanelCard, PanelField, PanelButton, PanelSwitch, PanelNotice, PanelBlockHeader, PanelPageHeader } from '@simple/ui';

function normalizeSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

const regionOptions = LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name }));

export default function PerfilConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Slug availability
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [slugError, setSlugError] = useState('');
    const slugTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const originalSlugRef = useRef('');

    const [form, setForm] = useState({
        slug: '',
        displayName: '',
        profession: '',
        headline: '',
        bio: '',
        avatarUrl: '',
        publicEmail: '',
        publicPhone: '',
        publicWhatsapp: '',
        city: '',
        region: '',
        confirmationMode: 'auto' as 'auto' | 'manual',
        bookingWindowDays: 30,
        cancellationHours: 24,
        isPublished: false,
        currency: 'CLP',
        encuadre: '',
        requiresAdvancePayment: false,
        advancePaymentInstructions: '',
    });

    useEffect(() => {
        const load = async () => {
            const profile = await fetchAgendaProfile();
            if (profile) {
                const data = {
                    slug: profile.slug ?? '',
                    displayName: profile.displayName ?? '',
                    profession: profile.profession ?? '',
                    headline: profile.headline ?? '',
                    bio: profile.bio ?? '',
                    avatarUrl: profile.avatarUrl ?? '',
                    publicEmail: profile.publicEmail ?? '',
                    publicPhone: profile.publicPhone ?? '',
                    publicWhatsapp: profile.publicWhatsapp ?? '',
                    city: profile.city ?? '',
                    region: profile.region ?? '',
                    confirmationMode: (profile.confirmationMode as 'auto' | 'manual') ?? 'auto',
                    bookingWindowDays: profile.bookingWindowDays ?? 30,
                    cancellationHours: profile.cancellationHours ?? 24,
                    isPublished: profile.isPublished ?? false,
                    currency: profile.currency ?? 'CLP',
                    encuadre: profile.encuadre ?? '',
                    requiresAdvancePayment: profile.requiresAdvancePayment ?? false,
                    advancePaymentInstructions: profile.advancePaymentInstructions ?? '',
                };
                setForm(data);
                originalSlugRef.current = data.slug;
            }
            setLoading(false);
        };
        void load();
    }, []);

    const communeOptions = form.region
        ? getCommunesForRegion(form.region).map((c) => ({ value: c.name, label: c.name }))
        : [];

    const set = (key: keyof typeof form, value: string | boolean | number) => {
        setSaved(false);
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSlugChange = useCallback((raw: string) => {
        const slug = normalizeSlug(raw);
        set('slug', slug);
        setSlugError('');

        if (!slug || slug.length < 3) {
            setSlugStatus('idle');
            return;
        }
        if (slug === originalSlugRef.current) {
            setSlugStatus('idle');
            return;
        }

        setSlugStatus('checking');
        if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
        slugTimerRef.current = setTimeout(async () => {
            const result = await checkSlugAvailable(slug);
            if (result.available) {
                setSlugStatus('available');
                setSlugError('');
            } else {
                setSlugStatus(result.error?.includes('disponible') || result.error?.includes('uso') ? 'taken' : 'invalid');
                setSlugError(result.error ?? 'No disponible');
            }
        }, 500);
    }, []);

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

    const handleSave = async () => {
        if (!form.slug) { setError('El link de tu agenda es requerido.'); return; }
        if (form.slug.length < 3) { setError('El link debe tener al menos 3 caracteres.'); return; }
        if (!form.displayName.trim()) { setError('El nombre visible es requerido.'); return; }
        if (slugStatus === 'taken' || slugStatus === 'invalid') { setError(slugError || 'El link no está disponible.'); return; }
        setSaving(true);
        setError('');
        const result = await saveAgendaProfile(form);
        setSaving(false);
        if (!result.ok) { setError(result.error ?? 'Error al guardar.'); return; }
        originalSlugRef.current = form.slug;
        setSlugStatus('idle');
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

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3004';

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
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

                {/* Link publico */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Tu link de reservas" className="mb-3" />
                    <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: slugStatus === 'taken' || slugStatus === 'invalid' ? 'var(--color-error)' : slugStatus === 'available' ? 'var(--color-success)' : 'var(--border)' }}>
                        <span className="px-3 py-2.5 text-sm shrink-0 border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                            <IconLink size={14} className="inline mr-1 opacity-60" />
                            {APP_URL.replace(/^https?:\/\//, '')}/
                        </span>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            placeholder="tu-nombre"
                            className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
                            style={{ color: 'var(--fg)' }}
                        />
                        <div className="pr-3 shrink-0">
                            {slugStatus === 'checking' && <IconLoader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />}
                            {slugStatus === 'available' && <IconCheck size={14} style={{ color: 'var(--color-success)' }} />}
                            {(slugStatus === 'taken' || slugStatus === 'invalid') && <IconX size={14} style={{ color: 'var(--color-error)' }} />}
                        </div>
                    </div>
                    {slugError && <p className="text-xs mt-1.5" style={{ color: 'var(--color-error)' }}>{slugError}</p>}
                    {!slugError && (
                        <p className="text-xs mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                            Tu link publico:{' '}
                            <a href={`${APP_URL}/${form.slug}`} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
                                {APP_URL.replace(/^https?:\/\//, '')}/{form.slug}
                            </a>
                        </p>
                    )}
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

                {/* Contacto y ubicacion */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Contacto y ubicacion" className="mb-3" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <PanelField label="WhatsApp">
                            <input type="tel" value={form.publicWhatsapp} onChange={(e) => set('publicWhatsapp', e.target.value)} placeholder="+56 9 1234 5678" className="form-input" />
                        </PanelField>
                        <PanelField label="Telefono">
                            <input type="tel" value={form.publicPhone} onChange={(e) => set('publicPhone', e.target.value)} placeholder="+56 2 1234 5678" className="form-input" />
                        </PanelField>
                        <PanelField label="Email publico">
                            <input type="email" value={form.publicEmail} onChange={(e) => set('publicEmail', e.target.value)} placeholder="contacto@ejemplo.cl" className="form-input" />
                        </PanelField>
                        <PanelField label="Region">
                            <select
                                value={form.region}
                                onChange={(e) => {
                                    set('region', e.target.value);
                                    set('city', '');
                                }}
                                className="form-select"
                            >
                                <option value="">Selecciona una region</option>
                                {regionOptions.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </PanelField>
                        <PanelField label="Comuna">
                            <select
                                value={form.city}
                                onChange={(e) => set('city', e.target.value)}
                                disabled={!form.region}
                                className="form-select"
                            >
                                <option value="">{form.region ? 'Selecciona una comuna' : 'Selecciona region primero'}</option>
                                {communeOptions.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </PanelField>
                    </div>
                </PanelCard>

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

                {/* Encuadre */}
                <PanelCard size="md">
                    <PanelBlockHeader
                        title="Encuadre terapeutico"
                        description="Si lo configuras, el paciente debera leerlo y aceptarlo antes de reservar."
                        className="mb-3"
                    />
                    <PanelField label="Texto del encuadre">
                        <textarea
                            value={form.encuadre}
                            onChange={(e) => set('encuadre', e.target.value)}
                            placeholder="Escribe aqui tus politicas y condiciones para los pacientes..."
                            rows={4}
                            className="form-textarea"
                        />
                    </PanelField>
                </PanelCard>

                {/* Pago anticipado */}
                <PanelCard size="md">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Pago anticipado</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                El paciente vera instrucciones de pago antes de confirmar su cita.
                            </p>
                        </div>
                        <PanelSwitch
                            checked={form.requiresAdvancePayment}
                            onChange={(v) => set('requiresAdvancePayment', v)}
                        />
                    </div>
                    {form.requiresAdvancePayment && (
                        <PanelField label="Instrucciones de pago">
                            <textarea
                                value={form.advancePaymentInstructions}
                                onChange={(e) => set('advancePaymentInstructions', e.target.value)}
                                placeholder="Ej: Transferir a Banco Estado RUT 12.345.678-9. Enviar comprobante por WhatsApp antes de la sesion."
                                rows={3}
                                className="form-textarea"
                            />
                        </PanelField>
                    )}
                </PanelCard>

                {/* Visibilidad */}
                <PanelCard size="md">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Pagina publica</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {form.isPublished ? 'Tu agenda es visible para pacientes.' : 'Tu agenda esta oculta al publico.'}
                            </p>
                        </div>
                        <PanelSwitch
                            checked={form.isPublished}
                            onChange={(v) => set('isPublished', v)}
                        />
                    </div>
                </PanelCard>

                {error && (
                    <PanelNotice tone="error">
                        <span className="flex items-center gap-2"><IconAlertCircle size={15} /> {error}</span>
                    </PanelNotice>
                )}

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
    );
}
