'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconUser,
  IconConfetti,
  IconStar,
  IconMapPin,
  IconClock,
  IconCheck,
  IconArrowLeft,
  IconCalendar,
  IconTrophy,
  IconMicrophone,
} from '@tabler/icons-react';
import Link from 'next/link';
import { API_BASE } from '@simple/config';
import { useToast } from '@/hooks';

interface Musician {
  id: string;
  name: string;
  instrument: string;
  bio?: string;
  location?: string;
  rating: number;
  completedSerenatas: number;
  joinedAt: string;
  isAvailable: boolean;
  avatar?: string;
}

function getInstrumentIcon(instrument: string) {
  const key = instrument.toLowerCase();
  if (key.includes('voice') || key.includes('voz')) return IconMicrophone;
  return IconConfetti;
}

export default function MusicianProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMusician = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/musicians/${params.id}`, {
          credentials: 'include',
        });
        const data = await res.json();

        if (data.ok && data.musician) {
          setMusician(data.musician);
        } else {
          showToast('Músico no encontrado', 'error');
        }
      } catch {
        showToast('Error al cargar el perfil', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadMusician();
  }, [params.id, showToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!musician) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <IconUser className="w-16 h-16 text-zinc-300 mb-4" />
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Músico no encontrado</h1>
        <p className="text-zinc-500 mb-4">El perfil que buscas no existe o no está disponible</p>
        <Link
          href="/"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <IconArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    );
  }

  const InstrumentIcon = getInstrumentIcon(musician.instrument);

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <IconArrowLeft className="w-5 h-5 text-zinc-700" />
          </button>
          <h1 className="font-semibold text-zinc-900">Perfil de Músico</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Cover & Avatar */}
          <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600"></div>
          <div className="px-6 pb-6">
            <div className="relative -mt-16 mb-4">
              <div className="w-32 h-32 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                {musician.avatar ? (
                  <img
                    src={musician.avatar}
                    alt={musician.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-100 rounded-2xl flex items-center justify-center">
                    <InstrumentIcon className="w-12 h-12 text-zinc-400" />
                  </div>
                )}
              </div>
              {musician.isAvailable && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <IconCheck className="w-3 h-3" />
                  Disponible
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900">{musician.name}</h2>
              <div className="flex items-center gap-2 text-zinc-600">
                <InstrumentIcon className="w-4 h-4" />
                <span className="capitalize">{musician.instrument}</span>
              </div>
              {musician.location && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <IconMapPin className="w-4 h-4" />
                  <span>{musician.location}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 py-4 border-t border-zinc-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                  <IconStar className="w-5 h-5 fill-current" />
                  <span className="font-bold text-lg text-zinc-900">{musician.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-zinc-500">Calificación</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                  <IconTrophy className="w-5 h-5" />
                  <span className="font-bold text-lg text-zinc-900">{musician.completedSerenatas}</span>
                </div>
                <span className="text-xs text-zinc-500">Serenatas</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <IconCalendar className="w-5 h-5" />
                  <span className="font-bold text-lg text-zinc-900">
                    {new Date(musician.joinedAt).getFullYear()}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Miembro desde</span>
              </div>
            </div>

            {/* Bio */}
            {musician.bio && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <h3 className="font-medium text-zinc-900 mb-2">Sobre mí</h3>
                <p className="text-zinc-600 leading-relaxed">{musician.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Availability Card */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-medium text-zinc-900 mb-4 flex items-center gap-2">
            <IconClock className="w-5 h-5 text-blue-500" />
            Disponibilidad
          </h3>
          <div
            className={`flex items-center gap-3 p-4 rounded-xl ${
              musician.isAvailable ? 'bg-green-50' : 'bg-zinc-50'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                musician.isAvailable ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'
              }`}
            ></div>
            <span
              className={`font-medium ${
                musician.isAvailable ? 'text-green-700' : 'text-zinc-600'
              }`}
            >
              {musician.isAvailable
                ? 'Disponible para nuevas serenatas'
                : 'No disponible actualmente'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
