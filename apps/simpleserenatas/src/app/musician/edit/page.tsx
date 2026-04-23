'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconUser,
  IconMusic,
  IconMapPin,
  IconDeviceFloppy,
  IconLoader2,
  IconCheck,
  IconMicrophone,
} from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';

interface MusicianProfile {
  id: string;
  name: string;
  instrument: string;
  bio: string;
  location: string;
  isAvailable: boolean;
}

const INSTRUMENTS = [
  'Voz',
  'Guitarra',
  'Piano',
  'Batería',
  'Violín',
  'Trompeta',
  'Saxofón',
  'Bajo',
  'Teclado',
  'Percusión',
  'Charango',
  'Cuatro',
  'Acordeón',
  'Otros',
];

export default function EditMusicianProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<MusicianProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/serenatas/musicians/my`, {
          credentials: 'include',
        });
        const data = await res.json();

        if (data.ok && data.musician) {
          setProfile(data.musician);
        } else {
          // Create new profile if doesn't exist
          setProfile({
            id: '',
            name: user.name || '',
            instrument: 'Voz',
            bio: '',
            location: '',
            isAvailable: true,
          });
        }
      } catch {
        showToast('Error al cargar el perfil', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, router, showToast]);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const url = profile.id
        ? `${API_BASE}/api/serenatas/musicians/${profile.id}`
        : `${API_BASE}/api/serenatas/musicians`;

      const method = profile.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          instrument: profile.instrument,
          bio: profile.bio,
          location: profile.location,
          isAvailable: profile.isAvailable,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        showToast('Perfil guardado exitosamente', 'success');
        router.push('/perfil');
      } else {
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <IconLoader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <IconUser className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500">No se pudo cargar el perfil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <IconArrowLeft className="w-5 h-5 text-zinc-700" />
            </button>
            <h1 className="font-semibold text-zinc-900">Editar Perfil</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <IconLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="w-4 h-4" />
            )}
            Guardar
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Name */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Nombre artístico
          </label>
          <div className="relative">
            <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Tu nombre artístico"
            />
          </div>
        </div>

        {/* Instrument */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Instrumento principal
          </label>
          <div className="relative">
            <IconMusic className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <select
              value={profile.instrument}
              onChange={(e) => setProfile({ ...profile, instrument: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
            >
              {INSTRUMENTS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Biografía
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Cuéntanos sobre ti, tu experiencia y estilo musical..."
          />
          <p className="text-xs text-zinc-500 mt-1">
            {profile.bio.length}/500 caracteres
          </p>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Ubicación
          </label>
          <div className="relative">
            <IconMapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Ciudad o zona donde te encuentras"
            />
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  profile.isAvailable ? 'bg-green-100' : 'bg-zinc-100'
                }`}
              >
                <IconCheck
                  className={`w-5 h-5 ${
                    profile.isAvailable ? 'text-green-600' : 'text-zinc-400'
                  }`}
                />
              </div>
              <div>
                <p className="font-medium text-zinc-900">Disponibilidad</p>
                <p className="text-sm text-zinc-500">
                  {profile.isAvailable
                    ? 'Disponible para nuevas serenatas'
                    : 'No disponible actualmente'}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setProfile({ ...profile, isAvailable: !profile.isAvailable })
              }
              className={`relative w-14 h-8 rounded-full transition-colors ${
                profile.isAvailable ? 'bg-green-500' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  profile.isAvailable ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
