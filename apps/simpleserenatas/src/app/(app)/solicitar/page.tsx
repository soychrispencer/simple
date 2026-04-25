'use client';

import { useState } from 'react';
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

const occasionTypes = [
    { id: 'birthday', name: 'Cumpleaños', emoji: '🎂' },
    { id: 'anniversary', name: 'Aniversario', emoji: '💑' },
    { id: 'serenade', name: 'Serenata romántica', emoji: '🌹' },
    { id: 'graduation', name: 'Graduación', emoji: '🎓' },
    { id: 'retirement', name: 'Jubilación', emoji: '🏖️' },
    { id: 'other', name: 'Otra ocasión', emoji: '🎉' },
];

export default function SolicitarSerenataPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [matchedCaptains, setMatchedCaptains] = useState<any[]>([]);
    const [selectedCaptain, setSelectedCaptain] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        // Step 1: Destinatario
        recipientName: '',
        recipientPhone: '',
        occasion: '',
        message: '',
        
        // Step 2: Ubicación y fecha
        address: '',
        comuna: '',
        date: '',
        time: '',
        
        // Step 3: Preferencias
        duration: 30,
        songs: [] as string[],
        budget: 150,
    });

    const updateForm = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = async () => {
        if (step < 4) {
            if (step === 2) {
                // Buscar capitanes disponibles
                await findMatchingCaptains();
            }
            setStep(step + 1);
        } else {
            await submitRequest();
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const findMatchingCaptains = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/captains/match`, {
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
                setMatchedCaptains(data.captains || []);
            }
        } catch (error) {
            console.error('Error finding captains:', error);
        }
    };

    const submitRequest = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    captainId: selectedCaptain,
                }),
            });

            if (res.ok) {
                router.push('/inicio');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return formData.recipientName && formData.occasion;
        if (step === 2) return formData.address && formData.comuna && formData.date && formData.time;
        if (step === 3) return true;
        if (step === 4) return selectedCaptain;
        return false;
    };

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-zinc-900">Solicitar Serenata</h1>
                    <span className="text-sm text-zinc-500">Paso {step} de 4</span>
                </div>
                <div className="h-1 bg-zinc-100 rounded-full mt-3 overflow-hidden">
                    <div 
                        className="h-full bg-rose-500 transition-all duration-300" 
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>
            </div>

            <div className="px-6 py-6">
                {/* Step 1: Destinatario */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                ¿Para quién es la serenata?
                            </label>
                            <input
                                type="text"
                                value={formData.recipientName}
                                onChange={(e) => updateForm('recipientName', e.target.value)}
                                placeholder="Nombre del destinatario"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Teléfono (para confirmar ubicación)
                            </label>
                            <input
                                type="tel"
                                value={formData.recipientPhone}
                                onChange={(e) => updateForm('recipientPhone', e.target.value)}
                                placeholder="+56 9 1234 5678"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-3">
                                ¿Qué ocasión celebramos?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {occasionTypes.map((occ) => (
                                    <button
                                        key={occ.id}
                                        onClick={() => updateForm('occasion', occ.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            formData.occasion === occ.id 
                                                ? 'border-rose-500 bg-rose-50' 
                                                : 'border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        <span className="text-2xl mb-1 block">{occ.emoji}</span>
                                        <span className="text-sm font-medium text-zinc-900">{occ.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Mensaje personal (opcional)
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => updateForm('message', e.target.value)}
                                placeholder="¿Quieres dedicar un mensaje especial?"
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Ubicación y fecha */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Dirección de entrega
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => updateForm('address', e.target.value)}
                                placeholder="Calle, número, departamento"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Comuna
                            </label>
                            <select
                                value={formData.comuna}
                                onChange={(e) => updateForm('comuna', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                            >
                                <option value="">Selecciona comuna</option>
                                {comunas.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Fecha
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => updateForm('date', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Hora de entrega
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => updateForm('time', time)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                            formData.time === time
                                                ? 'bg-rose-500 text-white'
                                                : 'bg-white border border-zinc-200 text-zinc-700 hover:border-rose-300'
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Preferencias y presupuesto */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Duración de la serenata
                            </label>
                            <div className="flex gap-3">
                                {[15, 30, 45, 60].map((mins) => (
                                    <button
                                        key={mins}
                                        onClick={() => updateForm('duration', mins)}
                                        className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${
                                            formData.duration === mins
                                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                                : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
                                        }`}
                                    >
                                        {mins} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Canciones específicas (opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Las Mañanitas, Cielito Lindo..."
                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
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
                                    <span key={i} className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                        {song}
                                        <button onClick={() => updateForm('songs', formData.songs.filter((_, idx) => idx !== i))}>
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">
                                Tu presupuesto (aproximado)
                            </label>
                            <div className="bg-white rounded-xl p-4 border border-zinc-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl font-bold text-rose-600">${formData.budget}</span>
                                    <span className="text-sm text-zinc-500">CLP</span>
                                </div>
                                <input
                                    type="range"
                                    min={50}
                                    max={500}
                                    step={10}
                                    value={formData.budget}
                                    onChange={(e) => updateForm('budget', parseInt(e.target.value))}
                                    className="w-full accent-rose-500"
                                />
                                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                                    <span>$50</span>
                                    <span>$500</span>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-500 mt-2">
                                El precio final dependerá del capitán seleccionado
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 4: Selección de capitán */}
                {step === 4 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-900">
                            Capitanes disponibles ({matchedCaptains.length})
                        </h2>
                        
                        {matchedCaptains.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-xl">
                                <IconConfettiFilled size={48} className="mx-auto text-zinc-300 mb-3" />
                                <p className="text-zinc-500">No hay capitanes disponibles</p>
                                <p className="text-sm text-zinc-400 mt-1">Intenta con otra fecha u hora</p>
                            </div>
                        ) : (
                            matchedCaptains.map((captain) => (
                                <div
                                    key={captain.id}
                                    onClick={() => setSelectedCaptain(captain.id)}
                                    className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
                                        selectedCaptain === captain.id
                                            ? 'border-rose-500'
                                            : 'border-transparent hover:border-zinc-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                                            <IconUser size={24} className="text-rose-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-zinc-900">{captain.user?.name || 'Capitán'}</h3>
                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    <IconConfettiFilled size={16} />
                                                    <span className="font-medium">{captain.rating || 5}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-zinc-500 mt-1">{captain.bio || 'Mariachi profesional'}</p>
                                            <div className="flex items-center gap-3 mt-2 text-sm">
                                                <span className="text-rose-600 font-medium">
                                                    Desde ${captain.minPrice || 100}
                                                </span>
                                                <span className="text-zinc-400">•</span>
                                                <span className="text-zinc-500">{captain.city}</span>
                                            </div>
                                            {selectedCaptain === captain.id && (
                                                <div className="mt-3 flex items-center gap-2 text-rose-600 text-sm font-medium">
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
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 p-4">
                <div className="flex items-center gap-3">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50"
                        >
                            <IconChevronLeft size={24} className="text-zinc-700" />
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canProceed() || isSubmitting}
                        className="flex-1 bg-rose-500 text-white rounded-xl py-3.5 font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <IconLoader size={20} className="animate-spin" />
                        ) : step === 4 ? (
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
