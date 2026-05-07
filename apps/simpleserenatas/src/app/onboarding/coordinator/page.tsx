'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    IconArrowLeft,
    IconCheck,
    IconLoader,
    IconMapPin,
    IconWallet,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { ModernSelect } from '@simple/ui';

export default function CoordinatorOnboardingPage() {
    const router = useRouter();
    const { user, coordinatorProfile, createCoordinatorProfile } = useAuth();
    const { showToast } = useToast();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [experience, setExperience] = useState<number>(0);
    /** Guardamos el `regionId` para resolver comunas; al guardar enviamos el `name`. */
    const [regionId, setRegionId] = useState<string>('');
    const [city, setCity] = useState<string>('');
    const [serviceRadius, setServiceRadius] = useState<number>(50);
    const [minPrice, setMinPrice] = useState<number>(80_000);
    const [maxPrice, setMaxPrice] = useState<number>(300_000);

    useEffect(() => {
        if (user?.role === 'coordinator') {
            router.replace('/inicio');
            return;
        }
        if (coordinatorProfile && user?.role === 'musician') {
            router.replace('/suscripcion');
        }
    }, [coordinatorProfile, user?.role, router]);

    const regionOptions = useMemo(
        () => LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name })),
        []
    );
    const communeOptions = useMemo(() => {
        if (!regionId) return [];
        return getCommunesForRegion(regionId).map((c) => ({ value: c.name, label: c.name }));
    }, [regionId]);

    const regionName = useMemo(
        () => LOCATION_REGIONS.find((r) => r.id === regionId)?.name ?? '',
        [regionId]
    );

    const canAdvance = useMemo(() => {
        if (step === 1) return bio.trim().length >= 20;
        if (step === 2) return Boolean(regionId && city);
        if (step === 3) return minPrice >= 0 && maxPrice >= minPrice;
        return false;
    }, [step, bio, regionId, city, minPrice, maxPrice]);

    const handleSubmit = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await createCoordinatorProfile({
                bio: bio.trim(),
                phone: phone.trim() || undefined,
                experience,
                region: regionName,
                city: city.trim(),
                serviceRadius,
                minPrice,
                maxPrice,
            });
            showToast('Perfil listo. Activa tu suscripción para ser coordinador.', 'success');
            router.push('/suscripcion');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No pudimos crear tu perfil';
            setError(message);
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = async () => {
        if (step < 3) {
            setStep((s) => (s + 1) as 1 | 2 | 3);
            return;
        }
        await handleSubmit();
    };

    return (
        <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
            <div
                className="px-4 sm:px-6 py-4 border-b sticky top-0 z-10"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div className="mx-auto max-w-xl w-full">
                    <Link
                        href="/inicio"
                        className="serenatas-interactive mb-3 inline-flex items-center gap-2 rounded-lg text-sm"
                        style={{ color: 'var(--fg-secondary)' }}
                    >
                        <IconArrowLeft size={18} />
                        <span>Cancelar</span>
                    </Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                            Conviértete en coordinador
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

            <div className="mx-auto max-w-xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                {error ? (
                    <div
                        className="rounded-xl border p-3 text-sm"
                        style={{
                            borderColor: 'rgba(185,28,28,0.20)',
                            background: 'rgba(185,28,28,0.06)',
                            color: '#b91c1c',
                        }}
                    >
                        {error}
                    </div>
                ) : null}

                {step === 1 ? (
                    <Step1
                        bio={bio}
                        setBio={setBio}
                        phone={phone}
                        setPhone={setPhone}
                        experience={experience}
                        setExperience={setExperience}
                    />
                ) : null}

                {step === 2 ? (
                    <Step2
                        region={regionId}
                        setRegion={(value) => {
                            setRegionId(value);
                            setCity('');
                        }}
                        city={city}
                        setCity={setCity}
                        serviceRadius={serviceRadius}
                        setServiceRadius={setServiceRadius}
                        regionOptions={regionOptions}
                        communeOptions={communeOptions}
                    />
                ) : null}

                {step === 3 ? (
                    <Step3
                        minPrice={minPrice}
                        setMinPrice={setMinPrice}
                        maxPrice={maxPrice}
                        setMaxPrice={setMaxPrice}
                    />
                ) : null}
            </div>

            <div
                className="fixed bottom-0 left-0 right-0 border-t p-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div className="mx-auto max-w-xl w-full flex items-center gap-3">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                            className="px-4 py-3 rounded-xl border font-medium"
                            style={{
                                background: 'var(--surface)',
                                borderColor: 'var(--border)',
                                color: 'var(--fg-secondary)',
                            }}
                        >
                            Atrás
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={!canAdvance || isSubmitting}
                        className="flex-1 rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        {isSubmitting ? (
                            <IconLoader size={20} className="animate-spin" />
                        ) : step === 3 ? (
                            <>
                                Crear mi perfil
                                <IconCheck size={20} />
                            </>
                        ) : (
                            <>Continuar</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Step1({
    bio,
    setBio,
    phone,
    setPhone,
    experience,
    setExperience,
}: {
    bio: string;
    setBio: (v: string) => void;
    phone: string;
    setPhone: (v: string) => void;
    experience: number;
    setExperience: (v: number) => void;
}) {
    return (
        <div className="space-y-5">
            <header>
                <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                    Cuéntanos sobre ti
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                    Esta información es lo que verán los clientes al elegir un coordinador.
                </p>
            </header>

            <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                    Biografía pública{' '}
                    <span style={{ color: 'var(--fg-muted)' }}>(mínimo 20 caracteres)</span>
                </label>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Coordinador con 5 años armando serenatas en RM. Trabajo con cuadrillas de 4 a 8 músicos…"
                    className="w-full px-4 py-3 rounded-xl border outline-none resize-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                    {bio.trim().length} / 1000 caracteres
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                        Teléfono de contacto
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="w-full px-4 py-3 rounded-xl border outline-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                        Años de experiencia
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={50}
                        value={experience}
                        onChange={(e) => setExperience(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                        className="w-full px-4 py-3 rounded-xl border outline-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    />
                </div>
            </div>
        </div>
    );
}

function Step2({
    region,
    setRegion,
    city,
    setCity,
    serviceRadius,
    setServiceRadius,
    regionOptions,
    communeOptions,
}: {
    region: string;
    setRegion: (v: string) => void;
    city: string;
    setCity: (v: string) => void;
    serviceRadius: number;
    setServiceRadius: (v: number) => void;
    regionOptions: Array<{ value: string; label: string }>;
    communeOptions: Array<{ value: string; label: string }>;
}) {
    return (
        <div className="space-y-5">
            <header className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <IconMapPin size={20} />
                </div>
                <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                        Tu zona de operación
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        Vamos a usar esto para mostrarte solicitudes cercanas.
                    </p>
                </div>
            </header>

            <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                    Región
                </label>
                <ModernSelect
                    value={region}
                    onChange={setRegion}
                    options={regionOptions}
                    placeholder="Selecciona región"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                    Comuna principal
                </label>
                <ModernSelect
                    value={city}
                    onChange={setCity}
                    options={communeOptions}
                    placeholder={region ? 'Selecciona comuna' : 'Primero elige región'}
                    disabled={!region}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                    Radio de servicio
                </label>
                <div
                    className="rounded-xl p-4 border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                            {serviceRadius} km
                        </span>
                        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            desde tu comuna
                        </span>
                    </div>
                    <input
                        type="range"
                        min={5}
                        max={200}
                        step={5}
                        value={serviceRadius}
                        onChange={(e) => setServiceRadius(parseInt(e.target.value, 10))}
                        className="w-full"
                        style={{ accentColor: 'var(--accent)' }}
                    />
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                        <span>5 km</span>
                        <span>200 km</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Step3({
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
}: {
    minPrice: number;
    setMinPrice: (v: number) => void;
    maxPrice: number;
    setMaxPrice: (v: number) => void;
}) {
    return (
        <div className="space-y-5">
            <header className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <IconWallet size={20} />
                </div>
                <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                        Tus tarifas
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        Define tu rango de precios. La suscripción al panel de coordinador es un único plan ($4.990/mes) en el siguiente paso.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                        Precio mínimo (CLP)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={1000}
                        value={minPrice}
                        onChange={(e) => setMinPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-4 py-3 rounded-xl border outline-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
                        Precio máximo (CLP)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step={1000}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-4 py-3 rounded-xl border outline-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    />
                </div>
            </div>

            <p className="text-xs rounded-xl border p-3" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                Después de crear tu perfil te llevamos a pagar la suscripción mensual; con eso se activa el rol coordinador y todas las funciones del panel.
            </p>
        </div>
    );
}
