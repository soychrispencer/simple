'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconUser,
    IconBriefcase,
    IconClock,
    IconRocket,
    IconCamera,
    IconCheck,
    IconChevronRight,
    IconChevronLeft,
    IconLoader2,
    IconArrowRight,
} from '@tabler/icons-react';
import {
    fetchAgendaProfile,
    saveAgendaProfile,
    uploadAvatar,
    createAgendaService,
    createAvailabilityRule,
    saveAgendaProfile as publishProfile,
} from '@/lib/agenda-api';
import { vocab } from '@/lib/vocabulary';

const DURATIONS = [15, 20, 25, 30, 45, 50, 60, 90, 120];
const DAYS = [
    { value: 1, label: 'Lu' },
    { value: 2, label: 'Ma' },
    { value: 3, label: 'Mi' },
    { value: 4, label: 'Ju' },
    { value: 5, label: 'Vi' },
    { value: 6, label: 'Sá' },
    { value: 0, label: 'Do' },
];
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 23) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

const STEPS = [
    { id: 'perfil', icon: IconUser, label: 'Tu perfil' },
    { id: 'servicio', icon: IconBriefcase, label: 'Primer servicio' },
    { id: 'horario', icon: IconClock, label: 'Tu horario' },
    { id: 'listo', icon: IconRocket, label: '¡Listo!' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [error, setError] = useState('');
    const [profileLink, setProfileLink] = useState('');

    const [perfil, setPerfil] = useState({
        displayName: '',
        profession: '',
        headline: '',
        avatarUrl: '',
    });

    const [servicio, setServicio] = useState({
        name: '',
        durationMinutes: 50,
        price: '',
        isOnline: true,
        isPresential: false,
    });

    const [horario, setHorario] = useState({
        days: [1, 2, 3, 4, 5] as number[],
        startTime: '09:00',
        endTime: '18:00',
    });

    useEffect(() => {
        void (async () => {
            const profile = await fetchAgendaProfile();
            if (profile?.displayName && profile?.profession) {
                router.replace('/panel');
                return;
            }
            if (profile) {
                setPerfil({
                    displayName: profile.displayName ?? '',
                    profession: profile.profession ?? '',
                    headline: profile.headline ?? '',
                    avatarUrl: profile.avatarUrl ?? '',
                });
                setProfileLink(profile.slug ?? '');
            }
        })();
    }, [router]);

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        const res = await uploadAvatar(file);
        setAvatarUploading(false);
        if (res.ok && res.url) setPerfil((p) => ({ ...p, avatarUrl: res.url! }));
    }

    async function handleNext() {
        setError('');
        if (step === 0) {
            if (!perfil.displayName.trim() || !perfil.profession.trim()) {
                setError('Tu nombre y profesión son requeridos.');
                return;
            }
            setSaving(true);
            const res = await saveAgendaProfile(perfil);
            setSaving(false);
            if (!res.ok) { setError(res.error ?? 'Error al guardar.'); return; }
            setStep(1);
        } else if (step === 1) {
            if (!servicio.name.trim()) {
                setError('El nombre del servicio es requerido.');
                return;
            }
            setSaving(true);
            const res = await createAgendaService({
                name: servicio.name.trim(),
                durationMinutes: servicio.durationMinutes,
                price: servicio.price.trim() || null,
                isOnline: servicio.isOnline,
                isPresential: servicio.isPresential,
            });
            setSaving(false);
            if (!res.ok) { setError(res.error ?? 'Error al guardar servicio.'); return; }
            setStep(2);
        } else if (step === 2) {
            if (horario.days.length === 0) {
                setError('Selecciona al menos un día.');
                return;
            }
            setSaving(true);
            await Promise.all(
                horario.days.map((day) =>
                    createAvailabilityRule({
                        dayOfWeek: day,
                        startTime: horario.startTime,
                        endTime: horario.endTime,
                        isActive: true,
                    })
                )
            );
            const res = await publishProfile({ isPublished: true });
            setSaving(false);
            if (!res.ok) { setError(res.error ?? 'Error al publicar.'); return; }
            if (res.profile?.slug) setProfileLink(res.profile.slug);
            setStep(3);
        }
    }

    function toggleDay(d: number) {
        setHorario((h) => ({
            ...h,
            days: h.days.includes(d) ? h.days.filter((x) => x !== d) : [...h.days, d],
        }));
    }

    const progressPct = step < 3 ? Math.round((step / 3) * 100) : 100;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-lg">

                {/* Header */}
                {step < 3 && (
                    <div className="mb-8 text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>
                            Paso {step + 1} de 3
                        </p>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                            {step === 0 && 'Cuéntanos sobre ti'}
                            {step === 1 && 'Agrega tu primer servicio'}
                            {step === 2 && '¿Cuándo atiendes?'}
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                            {step === 0 && 'Esta información aparecerá en tu perfil público.'}
                            {step === 1 && 'Podrás agregar más servicios después.'}
                            {step === 2 && 'Define tu horario base. Podrás ajustarlo luego.'}
                        </p>
                    </div>
                )}

                {/* Step indicators */}
                {step < 3 && (
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-1.5 rounded-full transition-all duration-300"
                                style={{
                                    width: i === step ? '32px' : '20px',
                                    background: i <= step ? 'var(--accent)' : 'var(--border)',
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* ── STEP 0: Perfil ── */}
                {step === 0 && (
                    <div className="rounded-2xl border p-6 flex flex-col gap-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3">
                            <button
                                type="button"
                                className="relative w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center transition-opacity hover:opacity-80"
                                style={{ borderColor: 'var(--accent)', background: 'var(--bg-muted)' }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={avatarUploading}
                            >
                                {avatarUploading ? (
                                    <IconLoader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                ) : perfil.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={perfil.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <IconCamera size={22} style={{ color: 'var(--fg-muted)' }} />
                                        <span className="text-[10px] font-medium" style={{ color: 'var(--fg-muted)' }}>Foto</span>
                                    </div>
                                )}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Opcional — agrega tu foto de perfil</p>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                                Tu nombre completo <span style={{ color: 'var(--accent)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: María González"
                                value={perfil.displayName}
                                onChange={(e) => setPerfil((p) => ({ ...p, displayName: e.target.value }))}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors border"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                            />
                        </div>

                        {/* Profesión */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                                Profesión o especialidad <span style={{ color: 'var(--accent)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Psicóloga clínica, Nutricionista, Coach"
                                value={perfil.profession}
                                onChange={(e) => setPerfil((p) => ({ ...p, profession: e.target.value }))}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors border"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                            />
                        </div>

                        {/* Tagline */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                                Frase corta <span className="font-normal" style={{ color: 'var(--fg-muted)' }}>(opcional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Más de 10 años acompañando procesos de cambio"
                                value={perfil.headline}
                                onChange={(e) => setPerfil((p) => ({ ...p, headline: e.target.value }))}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors border"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                            />
                        </div>
                    </div>
                )}

                {/* ── STEP 1: Servicio ── */}
                {step === 1 && (
                    <div className="rounded-2xl border p-6 flex flex-col gap-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        {/* Nombre del servicio */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                                Nombre del servicio <span style={{ color: 'var(--accent)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Consulta psicológica, Sesión de nutrición"
                                value={servicio.name}
                                onChange={(e) => setServicio((s) => ({ ...s, name: e.target.value }))}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors border"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                            />
                        </div>

                        {/* Duración */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                                Duración
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DURATIONS.map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setServicio((s) => ({ ...s, durationMinutes: d }))}
                                        className="px-3.5 py-2 rounded-xl text-sm font-medium border transition-all"
                                        style={{
                                            background: servicio.durationMinutes === d ? 'var(--accent)' : 'var(--bg)',
                                            borderColor: servicio.durationMinutes === d ? 'var(--accent)' : 'var(--border)',
                                            color: servicio.durationMinutes === d ? '#fff' : 'var(--fg)',
                                        }}
                                    >
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Precio */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                                Precio <span className="font-normal" style={{ color: 'var(--fg-muted)' }}>(opcional, en CLP)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: 50000"
                                value={servicio.price}
                                onChange={(e) => setServicio((s) => ({ ...s, price: e.target.value }))}
                                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors border"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                            />
                        </div>

                        {/* Modalidad */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                                Modalidad
                            </label>
                            <div className="flex gap-3">
                                {[
                                    { key: 'isOnline', label: 'Online' },
                                    { key: 'isPresential', label: 'Presencial' },
                                ].map(({ key, label }) => {
                                    const val = servicio[key as 'isOnline' | 'isPresential'];
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setServicio((s) => ({ ...s, [key]: !val }))}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                                            style={{
                                                background: val ? 'var(--accent)' : 'var(--bg)',
                                                borderColor: val ? 'var(--accent)' : 'var(--border)',
                                                color: val ? '#fff' : 'var(--fg)',
                                            }}
                                        >
                                            {val && <IconCheck size={13} className="inline mr-1" />}
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Horario ── */}
                {step === 2 && (
                    <div className="rounded-2xl border p-6 flex flex-col gap-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        {/* Días */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                                Días de atención
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {DAYS.map(({ value, label }) => {
                                    const active = horario.days.includes(value);
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => toggleDay(value)}
                                            className="w-11 h-11 rounded-xl text-sm font-semibold border transition-all"
                                            style={{
                                                background: active ? 'var(--accent)' : 'var(--bg)',
                                                borderColor: active ? 'var(--accent)' : 'var(--border)',
                                                color: active ? '#fff' : 'var(--fg)',
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Horario */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>Desde</label>
                                <select
                                    value={horario.startTime}
                                    onChange={(e) => setHorario((h) => ({ ...h, startTime: e.target.value }))}
                                    className="w-full rounded-xl px-3 py-3 text-sm border outline-none"
                                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                                >
                                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>Hasta</label>
                                <select
                                    value={horario.endTime}
                                    onChange={(e) => setHorario((h) => ({ ...h, endTime: e.target.value }))}
                                    className="w-full rounded-xl px-3 py-3 text-sm border outline-none"
                                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                                >
                                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                            Podrás ajustar días, horarios y agregar pausas desde Configuración → Disponibilidad.
                        </p>
                    </div>
                )}

                {/* ── STEP 3: Listo ── */}
                {step === 3 && (
                    <div className="rounded-2xl border p-8 text-center flex flex-col items-center gap-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--accent)' }}
                        >
                            <IconCheck size={36} stroke={3} color="#fff" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>¡Tu agenda está lista!</h2>
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Comparte tu link con tus {vocab.clients} y empieza a recibir reservas.
                            </p>
                        </div>

                        {profileLink && (
                            <div
                                className="w-full rounded-xl px-4 py-3 flex items-center justify-between gap-2 border"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                            >
                                <span className="text-sm font-mono truncate" style={{ color: 'var(--accent)' }}>
                                    simpleagenda.cl/{profileLink}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void navigator.clipboard.writeText(`https://simpleagenda.cl/${profileLink}`)}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                                    style={{ background: 'var(--accent)', color: '#fff' }}
                                >
                                    Copiar
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 w-full pt-2">
                            <button
                                type="button"
                                onClick={() => router.push('/panel')}
                                className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
                                style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                                Ir al panel
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/panel/configuracion')}
                                className="w-full py-3 rounded-xl text-sm font-medium border transition-colors"
                                style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--fg)' }}
                            >
                                Ajustar configuración
                            </button>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="mt-3 text-sm text-center font-medium" style={{ color: '#EF4444' }}>
                        {error}
                    </p>
                )}

                {/* Navigation */}
                {step < 3 && (
                    <div className="flex items-center justify-between mt-6">
                        {step > 0 ? (
                            <button
                                type="button"
                                onClick={() => { setError(''); setStep((s) => s - 1); }}
                                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border transition-colors"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'transparent' }}
                            >
                                <IconChevronLeft size={15} /> Atrás
                            </button>
                        ) : (
                            <div />
                        )}
                        <button
                            type="button"
                            onClick={() => void handleNext()}
                            disabled={saving}
                            className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
                            style={{ background: 'var(--accent)', color: '#fff', opacity: saving ? 0.7 : 1 }}
                        >
                            {saving ? (
                                <IconLoader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    {step === 2 ? 'Publicar mi agenda' : 'Continuar'}
                                    {step < 2 && <IconChevronRight size={15} />}
                                    {step === 2 && <IconRocket size={15} />}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
