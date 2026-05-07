'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    IconMapPin, 
    IconCalendar, 
    IconClock,
    IconUser,
    IconConfettiFilled,
    IconCreditCard,
    IconCheck,
    IconLoader,
    IconChevronRight,
    IconChevronLeft,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageShell } from '@/components/shell';

const comunas = [
    'Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa', 'La Reina',
    'Santiago', 'Independencia', 'Maipú', 'Puente Alto', 'La Florida',
    'Recoleta', 'Estación Central', 'San Miguel', 'La Pintana', 'El Bosque'
];

const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

/** Mapea cada opción del wizard a `eventType` válido para el API (`createSerenataSchema`). */
const occasionTypes: Array<{
    id: 'cumpleanos' | 'aniversario' | 'serenata' | 'propuesta' | 'otro';
    name: string;
    emoji: string;
}> = [
    { id: 'cumpleanos', name: 'Cumpleaños', emoji: '🎂' },
    { id: 'aniversario', name: 'Aniversario', emoji: '💑' },
    { id: 'serenata', name: 'Serenata romántica', emoji: '🌹' },
    { id: 'propuesta', name: 'Propuesta / sorpresa', emoji: '💍' },
    { id: 'otro', name: 'Otra ocasión', emoji: '🎉' },
];

export default function SolicitarSerenataPage() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [matchedCoordinators, setMatchedCoordinators] = useState<any[]>([]);
    const [selectedCoordinator, setSelectedCoordinator] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        recipientName: '',
        recipientPhone: '',
        occasion: '' as '' | 'cumpleanos' | 'aniversario' | 'serenata' | 'propuesta' | 'otro',
        message: '',

        address: '',
        comuna: '',
        date: '',
        time: '',

        duration: 30,
        songs: [] as string[],
        /** Presupuesto expresado en miles de CLP. Se multiplica por 1000 al enviar al API. */
        budget: 150,
    });
    const [submitError, setSubmitError] = useState<string | null>(null);

    const updateForm = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = async () => {
        if (step < 3) {
            if (step === 2) {
                await findMatchingCoordinators();
            }
            setStep(step + 1);
        } else {
            await submitRequest();
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const findMatchingCoordinators = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/coordinators/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    comuna: formData.comuna,
                    date: formData.date,
                    time: formData.time,
                    budget: formData.budget,
                }),
            });
            
            if (res.ok) {
                const data = await res.json();
                setMatchedCoordinators(data.coordinators ?? []);
            }
        } catch (error) {
            console.error('Error finding coordinators:', error);
        }
    };

    const submitRequest = async () => {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const phoneNote = formData.recipientPhone
                ? `Teléfono del destinatario: ${formData.recipientPhone}`
                : '';
            const fullMessage = [phoneNote, formData.message].filter(Boolean).join('\n\n');

            const payload = {
                clientName: user?.name?.trim() || formData.recipientName.trim(),
                clientPhone: user?.phone || undefined,
                clientEmail: user?.email || undefined,
                eventType: formData.occasion || 'serenata',
                eventDate: formData.date,
                eventTime: formData.time,
                duration: formData.duration,
                address: formData.address.trim(),
                city: formData.comuna || undefined,
                region: 'Región Metropolitana',
                recipientName: formData.recipientName.trim() || undefined,
                message: fullMessage || undefined,
                songRequests: formData.songs.length > 0 ? formData.songs : undefined,
                price: Math.round(formData.budget * 1000),
                source: 'platform_lead',
                coordinatorId: selectedCoordinator || undefined,
            };

            const res = await fetch(`${API_BASE}/api/serenatas/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data?.ok) {
                setSubmitError(
                    data?.error ||
                        'No pudimos crear tu solicitud. Revisa los datos del formulario e inténtalo nuevamente.'
                );
                return;
            }

            const created = data.serenata;
            if (created?.id) {
                router.push(`/tracking/${created.id}`);
            } else {
                router.push('/inicio');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            setSubmitError('Error de conexión. Inténtalo nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return Boolean(formData.recipientName && formData.occasion);
        if (step === 2)
            return Boolean(formData.address && formData.comuna && formData.date && formData.time);
        if (step === 3) return true;
        return false;
    };

    useEffect(() => {
        if (!isLoading && isAuthenticated && user?.role !== 'client') {
            router.replace('/inicio');
        }
    }, [isLoading, isAuthenticated, user?.role, router]);

    if (!isLoading && isAuthenticated && user?.role !== 'client') {
        return null;
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b sticky top-0 z-10" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="mx-auto max-w-lg w-full">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: 'var(--fg)' }}>
                            Solicitar serenata
                        </h1>
                        <span className="text-sm shrink-0" style={{ color: 'var(--fg-muted)' }}>
                            Paso {step} de 3
                        </span>
                    </div>
                    <div className="h-1 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                        <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${(step / 3) * 100}%`, background: 'var(--accent)' }}
                        />
                    </div>
                </div>
            </div>

            <SerenatasPageShell width="narrow">
                {/* Step 1: Destinatario */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                ¿Para quién es la serenata?
                            </label>
                            <input
                                type="text"
                                value={formData.recipientName}
                                onChange={(e) => updateForm('recipientName', e.target.value)}
                                placeholder="Nombre del destinatario"
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Teléfono (para confirmar ubicación)
                            </label>
                            <input
                                type="tel"
                                value={formData.recipientPhone}
                                onChange={(e) => updateForm('recipientPhone', e.target.value)}
                                placeholder="+56 9 1234 5678"
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--fg-secondary)' }}>
                                ¿Qué ocasión celebramos?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {occasionTypes.map((occ) => (
                                    <button
                                        key={occ.id}
                                        onClick={() => updateForm('occasion', occ.id)}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            formData.occasion === occ.id 
                                                ? '' 
                                                : ''
                                        }`}
                                        style={{
                                            borderColor: formData.occasion === occ.id ? 'var(--accent)' : 'var(--border)',
                                            background: formData.occasion === occ.id ? 'var(--accent-subtle)' : 'var(--surface)',
                                        }}
                                    >
                                        <span className="text-2xl mb-1 block">{occ.emoji}</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{occ.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Mensaje personal (opcional)
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => updateForm('message', e.target.value)}
                                placeholder="¿Quieres dedicar un mensaje especial?"
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border outline-none resize-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            />
                        </div>
                    </div>
                )}

                {/* Paso 2: Cuándo, dónde y preferencias (presupuesto estimado) */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Dirección de entrega
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => updateForm('address', e.target.value)}
                                placeholder="Calle, número, departamento"
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Comuna
                            </label>
                            <select
                                value={formData.comuna}
                                onChange={(e) => updateForm('comuna', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            >
                                <option value="">Selecciona comuna</option>
                                {comunas.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Fecha
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => updateForm('date', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Hora de entrega
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => updateForm('time', time)}
                                        className="py-2 px-3 rounded-lg text-sm font-medium transition-all border"
                                        style={{
                                            background: formData.time === time ? 'var(--accent)' : 'var(--surface)',
                                            color: formData.time === time ? 'var(--accent-contrast)' : 'var(--fg-secondary)',
                                            borderColor: formData.time === time ? 'var(--accent)' : 'var(--border)',
                                        }}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Duración de la serenata
                            </label>
                            <div className="flex gap-3">
                                {[15, 30, 45, 60].map((mins) => (
                                    <button
                                        key={mins}
                                        onClick={() => updateForm('duration', mins)}
                                        className="flex-1 py-3 rounded-xl border font-medium transition-all"
                                        style={{
                                            borderColor: formData.duration === mins ? 'var(--accent)' : 'var(--border)',
                                            background: formData.duration === mins ? 'var(--accent-subtle)' : 'var(--surface)',
                                            color: formData.duration === mins ? 'var(--accent)' : 'var(--fg-secondary)',
                                        }}
                                    >
                                        {mins} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Canciones específicas (opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Las Mañanitas, Cielito Lindo..."
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = (e.target as HTMLInputElement).value;
                                        if (value && !formData.songs.includes(value)) {
                                            updateForm('songs', [...formData.songs, value]);
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.songs.map((song, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full text-sm flex items-center gap-1" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                                        {song}
                                        <button onClick={() => updateForm('songs', formData.songs.filter((_, idx) => idx !== i))}>
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                Tu presupuesto (aproximado)
                            </label>
                            <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                                        ${(formData.budget * 1000).toLocaleString('es-CL')}
                                    </span>
                                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>CLP</span>
                                </div>
                                <input
                                    type="range"
                                    min={50}
                                    max={500}
                                    step={10}
                                    value={formData.budget}
                                    onChange={(e) => updateForm('budget', parseInt(e.target.value))}
                                    className="w-full"
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    <span>$50.000</span>
                                    <span>$500.000</span>
                                </div>
                            </div>
                            <p className="text-sm mt-2" style={{ color: 'var(--fg-secondary)' }}>
                                El precio final dependerá del coordinador seleccionado
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmación + coordinador */}
                {step === 3 && (
                    <div className="space-y-4">
                        {submitError ? (
                            <div
                                className="rounded-xl border p-3 text-sm"
                                style={{
                                    borderColor: 'rgba(185,28,28,0.20)',
                                    background: 'rgba(185,28,28,0.06)',
                                    color: '#b91c1c',
                                }}
                            >
                                {submitError}
                            </div>
                        ) : null}
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                            Coordinadores disponibles ({matchedCoordinators.length})
                        </h2>
                        
                        {matchedCoordinators.length === 0 ? (
                            <div className="text-center py-8 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                                <IconConfettiFilled size={48} className="mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
                                <p style={{ color: 'var(--fg-secondary)' }}>
                                    No hay coordinadores con coincidencias para tu fecha y zona
                                </p>
                                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    Puedes confirmar igual; el equipo te asignará uno disponible.
                                </p>
                            </div>
                        ) : (
                            matchedCoordinators.map((coordinator) => (
                                <div
                                    key={coordinator.id}
                                    onClick={() => setSelectedCoordinator(coordinator.id)}
                                    className="rounded-xl p-4 border cursor-pointer transition-all"
                                    style={{
                                        background: 'var(--surface)',
                                        borderColor: selectedCoordinator === coordinator.id ? 'var(--accent)' : 'var(--border)',
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                                            <IconUser size={24} style={{ color: 'var(--accent)' }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>{coordinator.user?.name || 'Coordinador'}</h3>
                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    <IconConfettiFilled size={16} />
                                                    <span className="font-medium">{coordinator.rating || 5}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>{coordinator.bio || 'Mariachi profesional'}</p>
                                            <div className="flex items-center gap-3 mt-2 text-sm">
                                                <span className="font-medium" style={{ color: 'var(--accent)' }}>
                                                    Desde ${coordinator.minPrice || 100}
                                                </span>
                                                <span style={{ color: 'var(--fg-muted)' }}>•</span>
                                                <span style={{ color: 'var(--fg-secondary)' }}>{coordinator.city}</span>
                                            </div>
                                            {selectedCoordinator === coordinator.id && (
                                                <div className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                                                    <IconCheck size={16} />
                                                    Seleccionado
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </SerenatasPageShell>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 border-t p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="p-3 rounded-xl border hover:opacity-90"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <IconChevronLeft size={24} style={{ color: 'var(--fg-secondary)' }} />
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canProceed() || isSubmitting}
                        className="flex-1 rounded-xl py-3.5 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        {isSubmitting ? (
                            <IconLoader size={20} className="animate-spin" />
                        ) : step === 3 ? (
                            <>Confirmar solicitud <IconCheck size={20} /></>
                        ) : (
                            <>Continuar <IconChevronRight size={20} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
