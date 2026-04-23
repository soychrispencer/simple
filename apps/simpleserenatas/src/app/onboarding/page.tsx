'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconMusic, 
  IconMapPin, 
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconLoader
} from '@tabler/icons-react';
import { API_BASE } from '@simple/config';

const instruments = [
  { id: 'trumpet', name: 'Trompeta', emoji: '🎺' },
  { id: 'voice', name: 'Voz', emoji: '🎤' },
  { id: 'guitar', name: 'Guitarra', emoji: '🎸' },
  { id: 'vihuela', name: 'Vihuela', emoji: '🎻' },
  { id: 'guitarron', name: 'Guitarrón', emoji: '🎸' },
  { id: 'violin', name: 'Violín', emoji: '🎻' },
  { id: 'accordion', name: 'Acordeón', emoji: '🪗' },
  { id: 'percussion', name: 'Percusión', emoji: '🥁' },
];

const comunas = [
  'Providencia',
  'Las Condes',
  'Vitacura',
  'Ñuñoa',
  'La Reina',
  'Santiago',
  'Independencia',
  'Maipú',
  'Puente Alto',
  'La Florida',
];

const experienceOptions = [
  { label: 'Menos de 1 año', years: 0 },
  { label: '1-3 años', years: 2 },
  { label: '3-5 años', years: 4 },
  { label: '5-10 años', years: 7 },
  { label: 'Más de 10 años', years: 12 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [selectedComuna, setSelectedComuna] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Complete onboarding - create musician profile
      setIsSubmitting(true);
      setError('');
      
      try {
        const experienceYears = experienceOptions.find(e => e.label === experience)?.years || 0;
        
        const res = await fetch(`${API_BASE}/api/serenatas/musicians`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            instrument: selectedInstrument,
            comuna: selectedComuna,
            experience: experienceYears,
            isAvailable: true,
            availableNow: false,
          }),
        });
        
        const data = await res.json();
        
        if (data.ok) {
          router.push('/inicio');
        } else {
          setError(data.error || 'Error al crear perfil');
          setIsSubmitting(false);
        }
      } catch (err) {
        setError('Error de conexión. Intenta nuevamente.');
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    if (isSubmitting) return false;
    if (step === 1) return selectedInstrument !== '';
    if (step === 2) return selectedComuna !== '';
    if (step === 3) return experience !== '';
    return false;
  };

  const getExperienceLabel = () => {
    const option = experienceOptions.find(e => e.label === experience);
    return option?.label || experience;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Progress */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-500">Paso {step} de 3</span>
          <span className="text-sm font-medium text-rose-600">{Math.round((step / 3) * 100)}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 pt-8 pb-24">
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              ¿Qué instrumento tocas?
            </h1>
            <p className="text-zinc-500 mb-6">
              Selecciona tu instrumento principal
            </p>

            <div className="grid grid-cols-2 gap-3">
              {instruments.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstrument(inst.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedInstrument === inst.id
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{inst.emoji}</span>
                  <span className={`font-medium ${
                    selectedInstrument === inst.id ? 'text-rose-700' : 'text-zinc-900'
                  }`}>
                    {inst.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              ¿Dónde te ubicas?
            </h1>
            <p className="text-zinc-500 mb-6">
              Selecciona tu comuna principal de trabajo
            </p>

            <div className="space-y-2">
              {comunas.map((comuna) => (
                <button
                  key={comuna}
                  onClick={() => setSelectedComuna(comuna)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                    selectedComuna === comuna
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconMapPin size={20} className={
                      selectedComuna === comuna ? 'text-rose-500' : 'text-zinc-400'
                    } />
                    <span className={`font-medium ${
                      selectedComuna === comuna ? 'text-rose-700' : 'text-zinc-900'
                    }`}>
                      {comuna}
                    </span>
                  </div>
                  {selectedComuna === comuna && (
                    <IconCheck size={20} className="text-rose-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              Tu experiencia
            </h1>
            <p className="text-zinc-500 mb-6">
              ¿Cuántos años llevas tocando?
            </p>

            <div className="space-y-3">
              {experienceOptions.map((exp) => (
                <button
                  key={exp.label}
                  onClick={() => setExperience(exp.label)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    experience === exp.label
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  <span className={`font-medium ${
                    experience === exp.label ? 'text-rose-700' : 'text-zinc-900'
                  }`}>
                    {exp.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 p-4">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
            >
              <IconChevronLeft size={24} className="text-zinc-700" />
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 bg-rose-500 text-white rounded-xl py-3.5 font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <IconLoader size={20} className="animate-spin" />
                Creando perfil...
              </>
            ) : (
              <>
                {step === 3 ? 'Comenzar' : 'Continuar'}
                <IconChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
