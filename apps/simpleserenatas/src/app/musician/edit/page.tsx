'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconUser,
  IconConfetti,
  IconMapPin,
  IconDeviceFloppy,
  IconLoader2,
  IconCheck,
} from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { SerenatasPageShell } from '@/components/shell';

/** Alineado con PATCH `/musicians/me/profile` (ubicación ↔ comuna). */
interface MusicianProfile {
  id: string;
  name: string;
  instrument: string;
  bio: string;
  /** Comuna o zona corta (se envía como `comuna` y `location`). */
  location: string;
  region: string;
  phone: string;
  experienceYears: number | '';
  isAvailable: boolean;
}

const BIO_MAX = 4000;

const INSTRUMENTS = [
  'Voz',
  'Guitarra',
  'Guitarrón',
  'Vihuela',
  'Violín',
  'Trompeta',
  'Saxofón',
  'Bajo',
  'Piano',
  'Batería',
  'Teclado',
  'Percusión',
  'Charango',
  'Cuatro',
  'Acordeón',
  'Otros',
];

export default function EditMusicianProfilePage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
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
        const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/profile`, {
          credentials: 'include',
        });
        const data = await res.json();
        const m = data.ok ? (data.musician ?? data.profile) : null;

        if (m && typeof m === 'object') {
          const row = m as {
            id?: string;
            name?: string;
            instrument?: string;
            bio?: string;
            location?: string;
            comuna?: string;
            region?: string;
            phone?: string;
            experience?: number | null;
            experienceYears?: number;
            isAvailable?: boolean;
          };
          const exp =
            row.experienceYears != null
              ? Number(row.experienceYears)
              : row.experience != null
                ? Number(row.experience)
                : '';
          setProfile({
            id: typeof row.id === 'string' ? row.id : '',
            name: typeof row.name === 'string' ? row.name : '',
            instrument: typeof row.instrument === 'string' ? row.instrument : 'Voz',
            bio: typeof row.bio === 'string' ? row.bio : '',
            location:
              (typeof row.location === 'string' && row.location) ||
              (typeof row.comuna === 'string' && row.comuna) ||
              '',
            region: typeof row.region === 'string' ? row.region : '',
            phone: typeof row.phone === 'string' ? row.phone : '',
            experienceYears:
              typeof exp === 'number' && Number.isFinite(exp) && exp >= 0 ? Math.min(80, Math.floor(exp)) : '',
            isAvailable: row.isAvailable !== false,
          });
        } else {
          // Sin fila `serenata_musicians` (p. ej. coordinador creando perfil después)
          setProfile({
            id: '',
            name: user.name || '',
            instrument: 'Voz',
            bio: '',
            location: '',
            region: '',
            phone: '',
            experienceYears: '',
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
      const method = profile.id ? 'PATCH' : 'POST';
      const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/profile`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          instrument: profile.instrument,
          bio: profile.bio.slice(0, BIO_MAX),
          comuna: profile.location,
          location: profile.location,
          region: profile.region.trim() || undefined,
          phone: profile.phone.trim() || undefined,
          ...(method === 'PATCH'
            ? {
                experience:
                  profile.experienceYears === ''
                    ? null
                    : typeof profile.experienceYears === 'number'
                      ? profile.experienceYears
                      : undefined,
              }
            : typeof profile.experienceYears === 'number'
              ? { experience: profile.experienceYears }
              : {}),
          isAvailable: profile.isAvailable,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        showToast('Perfil guardado exitosamente', 'success');
        await refreshProfile();
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <IconLoader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6">
        <div className="text-center">
          <IconUser className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--fg-muted)' }} />
          <p style={{ color: 'var(--fg-secondary)' }}>No se pudo cargar el perfil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="serenatas-interactive -ml-2 shrink-0 rounded-full p-2 transition-colors"
              style={{ color: 'var(--fg-secondary)' }}
            >
              <IconArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="type-page-title truncate text-lg sm:text-xl" style={{ color: 'var(--fg)' }}>
              Editar perfil
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="serenatas-interactive flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            {isSaving ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="h-4 w-4" />
            )}
            Guardar
          </button>
        </div>
      </div>

      <SerenatasPageShell width="default" className="max-w-2xl space-y-4">
        {/* Name */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Nombre artístico
          </label>
          <div className="relative">
            <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--fg-muted)' }} />
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="Tu nombre artístico"
            />
          </div>
        </div>

        {/* Instrument */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Instrumento principal
          </label>
          <div className="relative">
            <IconConfetti className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--fg-muted)' }} />
            <select
              value={profile.instrument}
              onChange={(e) => setProfile({ ...profile, instrument: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 outline-none appearance-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
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
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Biografía
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) =>
              setProfile({
                ...profile,
                bio: e.target.value.slice(0, BIO_MAX),
              })
            }
            rows={4}
            maxLength={BIO_MAX}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none resize-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            placeholder="Cuéntanos sobre ti, tu experiencia y estilo musical..."
          />
          <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>
            {profile.bio.length}/{BIO_MAX} caracteres
          </p>
        </div>

        {/* Region */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Región
          </label>
          <input
            type="text"
            value={profile.region}
            onChange={(e) => setProfile({ ...profile, region: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            placeholder="Ej. RM, Valparaíso"
          />
        </div>

        {/* Phone */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Teléfono de contacto
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            placeholder="+569..."
          />
        </div>

        {/* Experience */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Años de experiencia (opcional)
          </label>
          <input
            type="number"
            min={0}
            max={80}
            value={profile.experienceYears === '' ? '' : profile.experienceYears}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') setProfile({ ...profile, experienceYears: '' });
              else {
                const n = Number(v);
                if (Number.isFinite(n)) setProfile({ ...profile, experienceYears: Math.min(80, Math.max(0, n)) });
              }
            }}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            placeholder="0"
          />
        </div>

        {/* Location */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Ubicación (comuna o zona)
          </label>
          <div className="relative">
            <IconMapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--fg-muted)' }} />
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="Ciudad o zona donde te encuentras"
            />
          </div>
        </div>

        {/* Availability */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: profile.isAvailable ? 'color-mix(in oklab, var(--success) 15%, transparent)' : 'var(--bg-subtle)' }}
              >
                <IconCheck
                  className="w-5 h-5"
                  style={{ color: profile.isAvailable ? 'var(--success)' : 'var(--fg-muted)' }}
                />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--fg)' }}>Disponibilidad</p>
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                  {profile.isAvailable
                    ? 'Disponible para nuevas serenatas'
                    : 'No disponible actualmente'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setProfile({ ...profile, isAvailable: !profile.isAvailable })
              }
              className="relative w-14 h-8 rounded-full transition-colors"
              style={{ background: profile.isAvailable ? 'var(--success)' : 'var(--fg-muted)' }}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-transform ${
                  profile.isAvailable ? 'translate-x-6' : 'translate-x-0'
                }`}
                style={{ background: 'var(--surface)' }}
              />
            </button>
          </div>
        </div>
      </SerenatasPageShell>
    </div>
  );
}
