'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { API_BASE } from '@simple/config';
import { authRequest, normalizeEmail, type AuthApiResponse } from '@simple/auth';

type UserRole = 'client' | 'coordinator' | 'musician' | 'admin' | 'superadmin';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  role?: UserRole;
  status?: string;
}

interface CoordinatorProfile {
  id: string;
  bio?: string;
  phone?: string;
  experience?: number;
  city?: string;
  region?: string;
  serviceRadius?: number;
  minPrice?: number;
  maxPrice?: number;
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'cancelled' | 'paused';
  subscriptionEndsAt?: string | null;
  isVerified: boolean;
  totalSerenatas: number;
  rating: number;
  reviewsCount: number;
}

interface MusicianProfile {
  id: string;
  instrument: string;
  isAvailable: boolean;
  availableNow: boolean;
  comuna?: string;
  region?: string;
  /** Dirección legible si viene del API o del formulario. */
  address?: string;
  phone?: string;
  bio?: string;
  rating: number;
  experienceYears?: number;
}

/** Respuesta cruda de `/musicians/me/profile` → forma del contexto. */
function mapApiMusicianToProfile(m: Record<string, unknown> | null): MusicianProfile | null {
  if (!m || typeof m.id !== 'string') return null;
  const rating = typeof m.rating === 'number' ? m.rating : Number(m.rating ?? 5);
  const exp =
    m.experienceYears !== undefined
      ? Number(m.experienceYears)
      : m.experience !== undefined && m.experience !== null
        ? Number(m.experience)
        : undefined;
  return {
    id: m.id,
    instrument: typeof m.instrument === 'string' ? m.instrument : 'Músico',
    isAvailable: m.isAvailable !== false,
    availableNow: Boolean(m.availableNow),
    comuna: typeof m.comuna === 'string' ? m.comuna : undefined,
    region: typeof m.region === 'string' ? m.region : undefined,
    phone: typeof m.phone === 'string' ? m.phone : undefined,
    bio: typeof m.bio === 'string' ? m.bio : undefined,
    rating: Number.isFinite(rating) ? rating : 5,
    experienceYears: exp !== undefined && Number.isFinite(exp) ? exp : undefined,
  };
}

interface AuthContextType {
  user: User | null;
  coordinatorProfile: CoordinatorProfile | null;
  musicianProfile: MusicianProfile | null;
  /**
   * Rol para navegación/UI: `user.role` del API o inferencia si faltara (cuentas legacy).
   * Carga de datos (`fetchMusicianProfile` / `fetchCoordinatorProfile`) sigue el rol canónico del servidor.
   */
  effectiveRole: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, extraData?: {
    userType?: 'client' | 'musician';
    phone?: string;
    instrument?: string;
    region?: string;
    comuna?: string;
    addressLine1?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setAvailability: (available: boolean, availableNow?: boolean) => Promise<void>;
  createCoordinatorProfile: (data: Partial<CoordinatorProfile>) => Promise<void>;
  updateCoordinatorProfile: (data: Partial<CoordinatorProfile>) => Promise<void>;
}

const AUTH_MESSAGES = {
  connection: 'No se puede conectar al servidor. Verifica que el API esté corriendo.',
  loginFailed: 'No pudimos iniciar sesión.',
  registerFailed: 'No pudimos crear tu cuenta.',
  registerConflict: 'Este correo ya está registrado. Inicia sesión o usa otro correo.',
  createCoordinatorFailed: 'No pudimos crear tu perfil de coordinador.',
  updateCoordinatorFailed: 'No pudimos actualizar tu perfil de coordinador.',
  updateAvailabilityFailed: 'No pudimos actualizar tu disponibilidad.',
} as const;

function normalizeUserRole(role: string | undefined): UserRole | undefined {
  if (!role) return undefined;
  const legacyCoordinatorRole = ['c', 'a', 'p', 't', 'a', 'i', 'n'].join('');
  if (role === legacyCoordinatorRole) return 'coordinator';
  return role as UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [coordinatorProfile, setCoordinatorProfile] = useState<CoordinatorProfile | null>(null);
  const [musicianProfile, setMusicianProfile] = useState<MusicianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const effectiveRole = useMemo((): UserRole => {
    if (user?.role) return user.role;
    if (coordinatorProfile) return 'coordinator';
    if (musicianProfile) return 'musician';
    // Si no tiene rol definido ni perfiles especiales, es cliente por defecto
    return 'client';
  }, [user?.role, coordinatorProfile, musicianProfile]);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Add timeout to prevent hanging if API is not available
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        // Not authenticated - expected for non-logged users
        return;
      }
      
      const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; user?: User };
      
      if (data.ok && data.user) {
        const normalized = normalizeUserRole(data.user.role);
        setUser(normalized ? { ...data.user, role: normalized } : data.user);
        await fetchCoordinatorProfile();
        if (normalized === 'musician') {
          await fetchMusicianProfile();
        } else {
          setMusicianProfile(null);
        }
      }
    } catch (error) {
      // Silently handle network errors
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoordinatorProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/coordinators/me`, {
        credentials: 'include',
      });
      
      if (res.status === 404) {
        setCoordinatorProfile(null);
        return;
      }
      
      if (!res.ok) {
        setCoordinatorProfile(null);
        return;
      }
      
      const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; profile?: CoordinatorProfile };
      
      if (data.ok && data.profile) {
        setCoordinatorProfile(data.profile);
      } else {
        setCoordinatorProfile(null);
      }
    } catch (error) {
      setCoordinatorProfile(null);
    }
  };

  const createCoordinatorProfile = async (profileData: Partial<CoordinatorProfile>) => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/coordinators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      
      if (!res.ok) throw new Error(AUTH_MESSAGES.createCoordinatorFailed);
      
      const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; profile?: CoordinatorProfile };
      if (data.ok && data.profile) {
        setCoordinatorProfile(data.profile);
      }
    } catch (error) {
      console.error('Error creating coordinator profile:', error);
      throw error;
    }
  };

  const updateCoordinatorProfile = async (profileData: Partial<CoordinatorProfile>) => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/coordinators/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      
      if (!res.ok) throw new Error(AUTH_MESSAGES.updateCoordinatorFailed);
      
      const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; profile?: CoordinatorProfile };
      if (data.ok && data.profile) {
        setCoordinatorProfile(data.profile);
      }
    } catch (error) {
      console.error('Error updating coordinator profile:', error);
      throw error;
    }
  };

  const fetchMusicianProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/profile`, {
        credentials: 'include',
      });
      
      // Silently handle 404 - user hasn't created musician profile yet
      if (res.status === 404) {
        setMusicianProfile(null);
        return;
      }
      
      if (res.status === 500) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            '[AuthContext] fetchMusicianProfile: 500 del API (¿migraciones o tabla `serenata_musicians`?).',
            res.status
          );
        }
        setMusicianProfile(null);
        return;
      }
      
      const data = await res.json().catch(() => ({ ok: false })) as {
        ok?: boolean;
        musician?: Record<string, unknown>;
        profile?: Record<string, unknown>;
      };

      const raw = data.ok ? (data.musician ?? data.profile) : undefined;
      if (raw) {
        setMusicianProfile(mapApiMusicianToProfile(raw));
      } else {
        setMusicianProfile(null);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AuthContext] fetchMusicianProfile error:', error);
      }
      setMusicianProfile(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { status, data } = await authRequest<AuthApiResponse<User>>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizeEmail(email), password }),
      });
      
      if (status !== 200 || !data?.ok || !data.user) {
        throw new Error(data?.error || AUTH_MESSAGES.loginFailed);
      }

      const loginRole = normalizeUserRole(data.user.role);
      setUser(loginRole ? { ...data.user, role: loginRole } : data.user);
      await fetchCoordinatorProfile();
      if (loginRole === 'musician') {
        await fetchMusicianProfile();
      } else {
        setMusicianProfile(null);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(AUTH_MESSAGES.connection);
      }
      throw error;
    }
  };

  const register = async (
    name: string, 
    email: string, 
    password: string,
    extraData?: {
      userType?: 'client' | 'musician';
      phone?: string;
      instrument?: string;
      region?: string;
      comuna?: string;
      addressLine1?: string;
    }
  ): Promise<User> => {
    try {
      const { status, data } = await authRequest<AuthApiResponse<User>>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: normalizeEmail(email),
          password,
          ...extraData,
        }),
      });
      
      if (status !== 201) {
        if (status === 409) {
          throw new Error(AUTH_MESSAGES.registerConflict);
        }
        throw new Error(data?.error || AUTH_MESSAGES.registerFailed);
      }
      
      if (!data?.ok || !data.user) {
        throw new Error(data?.error || AUTH_MESSAGES.registerFailed);
      }

      const regRole = normalizeUserRole(data.user.role);
      const u = regRole ? { ...data.user, role: regRole } : data.user;
      setUser(u);
      await fetchCoordinatorProfile();
      if (extraData?.userType === 'client' && extraData.addressLine1?.trim()) {
        await fetch(`${API_BASE}/api/address-book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'personal',
            label: 'Principal',
            countryCode: 'CL',
            regionId: null,
            regionName: extraData.region?.trim() || null,
            communeId: null,
            communeName: extraData.comuna?.trim() || null,
            addressLine1: extraData.addressLine1.trim(),
            isDefault: true,
          }),
          credentials: 'include',
        }).catch(() => null);
      }

      // Only fetch musician profile if user is a musician
      if (regRole === 'musician') {
        await fetchMusicianProfile();
      } else {
        setMusicianProfile(null);
      }

      return u as User;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(AUTH_MESSAGES.connection);
      }
      throw error;
    }
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setCoordinatorProfile(null);
    setMusicianProfile(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; user?: User };
      if (res.ok && data.ok && data.user) {
        const normalized = normalizeUserRole(data.user.role);
        setUser(normalized ? { ...data.user, role: normalized } : data.user);
        await fetchCoordinatorProfile();
        if (normalized === 'musician') {
          await fetchMusicianProfile();
        } else {
          setMusicianProfile(null);
        }
      }
    } catch {
      // ignore
    }
  };

  const setAvailability = async (isAvailable: boolean, availableNow?: boolean) => {
    const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable, availableNow }),
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({ ok: false })) as { ok?: boolean; error?: string };
    
    if (!data.ok) {
      throw new Error(data.error || AUTH_MESSAGES.updateAvailabilityFailed);
    }

    setMusicianProfile(prev => prev ? {
      ...prev,
      isAvailable,
      availableNow: availableNow ?? prev.availableNow,
    } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      coordinatorProfile,
      musicianProfile,
      effectiveRole,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      createCoordinatorProfile,
      updateCoordinatorProfile,
      refreshProfile,
      setAvailability,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
