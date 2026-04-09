'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { IconCheck, IconAlertCircle, IconLoader2, IconCamera, IconX, IconLink } from '@tabler/icons-react';
import { fetchAgendaProfile, saveAgendaProfile, checkSlugAvailable, uploadAvatar } from '@/lib/agenda-api';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Slug availability
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [slugError, setSlugError] = useState('');
    const slugTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Perfil profesional</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
                Esta información aparecerá en tu página pública de reservas.
            </p>

            <div className="flex flex-col gap-6">
                {/* Avatar */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>Foto de perfil</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0"
                                style={{ background: 'var(--accent-subtle, rgba(13,148,136,0.1))', color: 'var(--accent)' }}
                            >
                                {form.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
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
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>JPG o PNG, máximo 5 MB</p>
                            {form.avatarUrl && (
                                <button
                                    onClick={() => set('avatarUrl', '')}
                                    className="text-xs mt-1 flex items-center gap-1"
                                    style={{ color: '#dc2626' }}
                                >
                                    <IconX size={12} /> Eliminar foto
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Link público */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Tu link de reservas</h2>
                    <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: slugStatus === 'taken' || slugStatus === 'invalid' ? '#dc2626' : slugStatus === 'available' ? '#22c55e' : 'var(--border)' }}>
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
                            {slugStatus === 'available' && <IconCheck size={14} style={{ color: '#22c55e' }} />}
                            {(slugStatus === 'taken' || slugStatus === 'invalid') && <IconX size={14} style={{ color: '#dc2626' }} />}
                        </div>
                    </div>
                    {slugError && <p className="text-xs mt-1.5" style={{ color: '#dc2626' }}>{slugError}</p>}
                    {!slugError && (
                        <p className="text-xs mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                            Tu link público:{' '}
                            <a href={`${APP_URL}/${form.slug}`} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
                                {APP_URL.replace(/^https?:\/\//, '')}/{form.slug}
                            </a>
                        </p>
                    )}
                </section>

                {/* Info básica */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>Información pública</h2>
                    <div className="flex flex-col gap-4">
                        <Field label="Nombre visible" required>
                            <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Ej: Dra. María González" className="field-input" />
                        </Field>
                        <Field label="Profesión">
                            <input type="text" value={form.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Ej: Psicóloga Clínica" className="field-input" />
                        </Field>
                        <Field label="Titular" hint="Aparece bajo tu nombre">
                            <input type="text" value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Ej: Especialista en ansiedad y relaciones" className="field-input" />
                        </Field>
                        <Field label="Biografía">
                            <textarea
                                value={form.bio}
                                onChange={(e) => set('bio', e.target.value)}
                                placeholder="Cuéntale a tus pacientes sobre ti, tu enfoque y experiencia..."
                                rows={4}
                                className="field-input resize-none"
                            />
                        </Field>
                    </div>
                </section>

                {/* Contacto y ubicación */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>Contacto y ubicación</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="WhatsApp">
                            <input type="tel" value={form.publicWhatsapp} onChange={(e) => set('publicWhatsapp', e.target.value)} placeholder="+56 9 1234 5678" className="field-input" />
                        </Field>
                        <Field label="Teléfono">
                            <input type="tel" value={form.publicPhone} onChange={(e) => set('publicPhone', e.target.value)} placeholder="+56 2 1234 5678" className="field-input" />
                        </Field>
                        <Field label="Email público">
                            <input type="email" value={form.publicEmail} onChange={(e) => set('publicEmail', e.target.value)} placeholder="contacto@ejemplo.cl" className="field-input" />
                        </Field>
                        <div /> {/* spacer */}
                        <Field label="Región">
                            <select
                                value={form.region}
                                onChange={(e) => {
                                    set('region', e.target.value);
                                    set('city', '');
                                }}
                                className="field-input"
                            >
                                <option value="">Selecciona una región</option>
                                {regionOptions.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Comuna">
                            <select
                                value={form.city}
                                onChange={(e) => set('city', e.target.value)}
                                disabled={!form.region}
                                className="field-input disabled:opacity-50"
                            >
                                <option value="">{form.region ? 'Selecciona una comuna' : 'Selecciona región primero'}</option>
                                {communeOptions.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                </section>

                {/* Configuración de reservas */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>Configuración de reservas</h2>
                    <div className="flex flex-col gap-4">
                        <Field label="Confirmación de citas">
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
                                        {mode === 'auto' ? 'Automática' : 'Manual'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                                {form.confirmationMode === 'auto'
                                    ? 'Las reservas se confirman inmediatamente.'
                                    : 'Debes aprobar cada reserva manualmente.'}
                            </p>
                        </Field>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Ventana de reserva (días)" hint="Cuántos días antes pueden reservar">
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={form.bookingWindowDays}
                                    onChange={(e) => set('bookingWindowDays', Number(e.target.value))}
                                    className="field-input"
                                />
                            </Field>
                            <Field label="Aviso de cancelación (horas)" hint="Mínimo para cancelar">
                                <input
                                    type="number"
                                    min={0}
                                    max={168}
                                    value={form.cancellationHours}
                                    onChange={(e) => set('cancellationHours', Number(e.target.value))}
                                    className="field-input"
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                {/* Encuadre */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>Encuadre terapéutico</h2>
                    <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                        Si lo configuras, el paciente deberá leerlo y aceptarlo antes de reservar.
                        Ejemplo: «En caso de inasistencia sin aviso, la sesión no se repone ni se reembolsa».
                    </p>
                    <Field label="Texto del encuadre">
                        <textarea
                            value={form.encuadre}
                            onChange={(e) => set('encuadre', e.target.value)}
                            placeholder="Escribe aquí tus políticas y condiciones para los pacientes..."
                            rows={4}
                            className="field-input resize-none"
                        />
                    </Field>
                </section>

                {/* Pago anticipado */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Pago anticipado</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                El paciente verá instrucciones de pago antes de confirmar su cita.
                            </p>
                        </div>
                        <button
                            onClick={() => set('requiresAdvancePayment', !form.requiresAdvancePayment)}
                            className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                            style={{ background: form.requiresAdvancePayment ? 'var(--accent)' : 'var(--border)' }}
                        >
                            <span
                                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                                style={{ transform: form.requiresAdvancePayment ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                        </button>
                    </div>
                    {form.requiresAdvancePayment && (
                        <Field label="Instrucciones de pago">
                            <textarea
                                value={form.advancePaymentInstructions}
                                onChange={(e) => set('advancePaymentInstructions', e.target.value)}
                                placeholder="Ej: Transferir a Banco Estado RUT 12.345.678-9. Enviar comprobante por WhatsApp antes de la sesión."
                                rows={3}
                                className="field-input resize-none"
                            />
                        </Field>
                    )}
                </section>

                {/* Visibilidad */}
                <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Página pública</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {form.isPublished ? 'Tu agenda es visible para pacientes.' : 'Tu agenda está oculta al público.'}
                            </p>
                        </div>
                        <button
                            onClick={() => set('isPublished', !form.isPublished)}
                            className="relative w-11 h-6 rounded-full transition-colors"
                            style={{ background: form.isPublished ? 'var(--accent)' : 'var(--border)' }}
                        >
                            <span
                                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                                style={{ transform: form.isPublished ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                        </button>
                    </div>
                </section>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                        <IconAlertCircle size={15} /> {error}
                    </div>
                )}

                <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="self-start inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
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
                    transition: border-color 0.15s;
                }
                .field-input:focus {
                    border-color: var(--accent);
                }
            `}</style>
        </div>
    );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{hint}</p>}
        </div>
    );
}
