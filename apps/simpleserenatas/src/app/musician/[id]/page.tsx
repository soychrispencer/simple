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
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!musician) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
        <IconUser className="w-16 h-16 mb-4" style={{ color: 'var(--fg-muted)' }} />
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Músico no encontrado</h1>
        <p className="mb-4" style={{ color: 'var(--fg-secondary)' }}>El perfil que buscas no existe o no está disponible</p>
        <Link
          href="/"
          className="flex items-center gap-2 font-medium"
          style={{ color: 'var(--accent)' }}
        >
          <IconArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    );
  }

  const InstrumentIcon = getInstrumentIcon(musician.instrument);

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="serenatas-interactive -ml-2 rounded-full p-2 transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <SerenatasPageHeader title="Perfil de músico" className="min-w-0 !mb-0 flex-1" />
        </div>
      </div>

      <SerenatasPageShell width="default" className="max-w-2xl">
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {/* Cover & Avatar */}
          <div className="h-32" style={{ background: 'linear-gradient(135deg, var(--info), var(--accent))' }}></div>
          <div className="px-6 pb-6">
            <div className="relative -mt-16 mb-4">
              <div className="w-32 h-32 rounded-2xl shadow-lg flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                {musician.avatar ? (
                  <img
                    src={musician.avatar}
                    alt={musician.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                    <InstrumentIcon className="w-12 h-12" style={{ color: 'var(--fg-muted)' }} />
                  </div>
                )}
              </div>
              {musician.isAvailable && (
                <div className="absolute -bottom-2 -right-2 text-xs font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-1" style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}>
                  <IconCheck className="w-3 h-3" />
                  Disponible
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{musician.name}</h2>
              <div className="flex items-center gap-2" style={{ color: 'var(--fg-secondary)' }}>
                <InstrumentIcon className="w-4 h-4" />
                <span className="capitalize">{musician.instrument}</span>
              </div>
              {musician.location && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                  <IconMapPin className="w-4 h-4" />
                  <span>{musician.location}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--warning)' }}>
                  <IconStar className="w-5 h-5 fill-current" />
                  <span className="font-bold text-lg" style={{ color: 'var(--fg)' }}>{musician.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Calificación</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--info)' }}>
                  <IconTrophy className="w-5 h-5" />
                  <span className="font-bold text-lg" style={{ color: 'var(--fg)' }}>{musician.completedSerenatas}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Serenatas</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--success)' }}>
                  <IconCalendar className="w-5 h-5" />
                  <span className="font-bold text-lg" style={{ color: 'var(--fg)' }}>
                    {new Date(musician.joinedAt).getFullYear()}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Miembro desde</span>
              </div>
            </div>

            {/* Bio */}
            {musician.bio && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-medium mb-2" style={{ color: 'var(--fg)' }}>Sobre mí</h3>
                <p className="leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{musician.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Availability Card */}
        <div className="mt-4 rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <IconClock className="w-5 h-5" style={{ color: 'var(--info)' }} />
            Disponibilidad
          </h3>
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: musician.isAvailable ? 'color-mix(in oklab, var(--success) 15%, transparent)' : 'var(--bg-subtle)' }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: musician.isAvailable ? 'var(--success)' : 'var(--fg-muted)' }}
            ></div>
            <span
              className="font-medium"
              style={{ color: musician.isAvailable ? 'var(--success)' : 'var(--fg-secondary)' }}
            >
              {musician.isAvailable
                ? 'Disponible para nuevas serenatas'
                : 'No disponible actualmente'}
            </span>
          </div>
        </div>
      </SerenatasPageShell>
    </div>
  );
}
