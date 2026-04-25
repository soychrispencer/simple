'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconUser,
  IconConfettiFilled,
  IconHeart,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconLoader,
  IconUsers,
  IconBuilding,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

// Tipos de usuario
const userTypes = [
  { 
    id: 'client', 
    name: 'Quiero contratar', 
    description: 'Solicita serenatas para tus seres queridos',
    icon: IconHeart,
  },
  { 
    id: 'captain', 
    name: 'Soy músico/capitán', 
    description: 'Gestiona tu cuadrilla y recibe solicitudes',
    icon: IconConfettiFilled,
  },
];

// Planes de suscripción
const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    commission: '20%',
    features: ['Hasta 5 serenatas/mes', 'Gestión básica', 'Soporte por email'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 3900,
    commission: '10%',
    features: ['Serenatas ilimitadas', 'Marketing básico', 'Soporte prioritario', 'Estadísticas'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 7900,
    commission: '0%',
    features: ['Todo lo de Pro', 'Marketing avanzado', 'Soporte 24/7', 'API access'],
  },
];

const comunas = [
  'Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa', 'La Reina',
  'Santiago', 'Independencia', 'Maipú', 'Puente Alto', 'La Florida',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { createCaptainProfile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'client' | 'captain' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: '',
    phone: '',
    city: '',
    region: 'Metropolitana',
    minPrice: 100,
    maxPrice: 500,
  });

  const handleSelectUserType = (type: 'client' | 'captain') => {
    setUserType(type);
    if (type === 'client') {
      setStep(2);
    } else {
      setStep(2);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    try {
      if (userType === 'captain') {
        await createCaptainProfile({
          ...profileData,
          subscriptionPlan: selectedPlan as any,
        });
        router.push('/inicio');
      } else {
        router.push('/explorar');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSteps = userType === 'client' ? 2 : 3;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-zinc-900">
            {step === 1 ? 'Bienvenido' : 
             step === 2 && userType === 'captain' ? 'Elige tu plan' : 
             step === 2 ? '¡Listo!' : 'Completa tu perfil'}
          </h1>
          <span className="text-sm text-zinc-500">Paso {step} de {totalSteps}</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pt-4">
        {/* Step 1: Select User Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-900">¿Cómo quieres usar SimpleSerenatas?</h1>
              <p className="text-zinc-500 mt-2">Elige la opción que mejor te describa</p>
            </div>

            <div className="space-y-4">
              {userTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelectUserType(type.id as any)}
                    className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                      userType === type.id ? 'border-rose-500 bg-rose-50' : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        userType === type.id ? 'bg-rose-200' : 'bg-zinc-100'
                      }`}>
                        <Icon size={24} className={userType === type.id ? 'text-rose-600' : 'text-zinc-600'} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900">{type.name}</h3>
                        <p className="text-sm text-zinc-500 mt-1">{type.description}</p>
                      </div>
                      <IconChevronRight size={20} className="text-zinc-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Plan selection (captain) or completion (client) */}
        {step === 2 && userType === 'captain' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-900">Elige tu plan</h1>
              <p className="text-zinc-500 mt-2">Cambia de plan en cualquier momento</p>
            </div>

            <div className="space-y-4">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === plan.id ? 'border-rose-500 bg-rose-50' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2 right-4 bg-rose-500 text-white text-xs px-2 py-1 rounded-full">Popular</span>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{plan.name}</h3>
                      <p className="text-sm text-zinc-500">
                        {plan.price === 0 ? 'Gratis' : `$${plan.price.toLocaleString()}/mes`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-rose-600">{plan.commission}</span>
                      <p className="text-xs text-zinc-400">comisión</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="text-sm text-zinc-600 flex items-center gap-2">
                        <IconCheck size={14} className="text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 2: Client completion */}
        {step === 2 && userType === 'client' && (
          <div className="space-y-6 text-center">
            <IconHeart size={64} className="text-rose-500 mx-auto" />
            <h1 className="text-2xl font-bold text-zinc-900">¡Todo listo!</h1>
            <p className="text-zinc-600">
              Ya puedes explorar capitanes verificados y solicitar tu primera serenata.
            </p>
            <button
              onClick={handleCompleteOnboarding}
              disabled={isLoading}
              className="w-full bg-rose-500 text-white py-3 rounded-xl font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? <IconLoader className="animate-spin mx-auto" /> : 'Comenzar a explorar →'}
            </button>
          </div>
        )}

        {/* Step 3: Captain profile */}
        {step === 3 && userType === 'captain' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-zinc-900">Completa tu perfil</h1>
              <p className="text-zinc-500 mt-2">Los clientes verán esta información</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(d => ({ ...d, phone: e.target.value }))}
                  placeholder="+56 9 1234 5678"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Ciudad</label>
                <select
                  value={profileData.city}
                  onChange={(e) => setProfileData(d => ({ ...d, city: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                >
                  <option value="">Selecciona una comuna</option>
                  {comunas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Sobre ti</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData(d => ({ ...d, bio: e.target.value }))}
                  placeholder="Cuéntanos tu experiencia como músico..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Precio mínimo ($)</label>
                  <input
                    type="number"
                    value={profileData.minPrice}
                    onChange={(e) => setProfileData(d => ({ ...d, minPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Precio máximo ($)</label>
                  <input
                    type="number"
                    value={profileData.maxPrice}
                    onChange={(e) => setProfileData(d => ({ ...d, maxPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleCompleteOnboarding}
              disabled={isLoading}
              className="w-full bg-rose-500 text-white py-3 rounded-xl font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? <IconLoader className="animate-spin mx-auto" /> : 'Completar registro →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
