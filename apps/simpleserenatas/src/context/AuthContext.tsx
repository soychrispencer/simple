'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE } from '@simple/config';

type UserRole = 'client' | 'captain' | 'musician' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  role?: UserRole;
}

interface CaptainProfile {
  id: string;
  bio?: string;
  phone?: string;
  experience?: number;
  city?: string;
  region?: string;
  subscriptionPlan: 'free' | 'pro' | 'premium';
  subscriptionStatus: 'active' | 'cancelled' | 'paused';
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
  rating: number;
  experienceYears?: number;
}

interface AuthContextType {
  user: User | null;
  captainProfile: CaptainProfile | null;
  musicianProfile: MusicianProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setAvailability: (available: boolean, availableNow?: boolean) => Promise<void>;
  createCaptainProfile: (data: Partial<CaptainProfile>) => Promise<void>;
  updateCaptainProfile: (data: Partial<CaptainProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [captainProfile, setCaptainProfile] = useState<CaptainProfile | null>(null);
  const [musicianProfile, setMusicianProfile] = useState<MusicianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      
      const data = await res.json();
      
      if (data.ok) {
        setUser(data.user);
        // Fetch profiles based on role
        if (data.user.role === 'captain') {
          await fetchCaptainProfile();
        } else if (data.user.role === 'musician') {
          await fetchMusicianProfile();
        }
      }
    } catch (error) {
      // Silently handle network errors
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCaptainProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/captains/me`, {
        credentials: 'include',
      });
      
      if (res.status === 404) {
        setCaptainProfile(null);
        return;
      }
      
      if (!res.ok) {
        setCaptainProfile(null);
        return;
      }
      
      const data = await res.json();
      
      if (data.ok && data.profile) {
        setCaptainProfile(data.profile);
      } else {
        setCaptainProfile(null);
      }
    } catch (error) {
      setCaptainProfile(null);
    }
  };

  const createCaptainProfile = async (profileData: Partial<CaptainProfile>) => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/captains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      
      if (!res.ok) throw new Error('Failed to create profile');
      
      const data = await res.json();
      if (data.ok && data.profile) {
        setCaptainProfile(data.profile);
        setUser(prev => prev ? { ...prev, role: 'captain' } : null);
      }
    } catch (error) {
      console.error('Error creating captain profile:', error);
      throw error;
    }
  };

  const updateCaptainProfile = async (profileData: Partial<CaptainProfile>) => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/captains/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      
      if (!res.ok) throw new Error('Failed to update profile');
      
      const data = await res.json();
      if (data.ok && data.profile) {
        setCaptainProfile(data.profile);
      }
    } catch (error) {
      console.error('Error updating captain profile:', error);
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
      
      // Silently handle 500 - database tables may not exist yet
      if (res.status === 500) {
        setMusicianProfile(null);
        return;
      }
      
      const data = await res.json();
      
      if (data.ok && data.musician) {
        setMusicianProfile(data.musician);
      } else {
        setMusicianProfile(null);
      }
    } catch (error) {
      // Silently handle all errors
      setMusicianProfile(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({ ok: false, error: 'Error de conexión' }));
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      setUser(data.user);
      await fetchMusicianProfile();
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('No se puede conectar al servidor. Verifica que el API esté corriendo.');
      }
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.user);
      // New user doesn't have musician profile yet
      setMusicianProfile(null);
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('No se puede conectar al servidor. Verifica que el API esté corriendo.');
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
    setCaptainProfile(null);
    setMusicianProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.role === 'captain') {
      await fetchCaptainProfile();
    } else if (user?.role === 'musician') {
      await fetchMusicianProfile();
    }
  };

  const setAvailability = async (isAvailable: boolean, availableNow?: boolean) => {
    const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable, availableNow }),
      credentials: 'include',
    });

    const data = await res.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Failed to update availability');
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
      captainProfile,
      musicianProfile,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      createCaptainProfile,
      updateCaptainProfile,
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
