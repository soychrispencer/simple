"use client";
import React, { createContext, useContext, useEffect, useCallback, useRef, useState, useMemo, ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Estados de auth: 'initial' -> montando, 'checking' -> refrescando, 'authenticated', 'anonymous', 'error'
export type AuthStatus = 'initial' | 'checking' | 'authenticated' | 'anonymous' | 'error';

interface Profile {
  id?: string;
  user_id?: string;
  username?: string;
  first_name?: string; // migrado de nombre
  last_name?: string; // migrado de apellido
  avatar_url?: string;
  cover_url?: string;
  visits?: number; // migrado de visitas
  [key: string]: any;
}

interface AuthValue {
  status: AuthStatus;
  session: Session | null;
  user: (User & Profile) | null;
  profile: Profile | null;
  loading: boolean; // true mientras status es 'initial' o 'checking'
  supabase: ReturnType<typeof getSupabaseClient>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, data?: Record<string, any>) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  patchProfile: (partial: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

// Singleton Supabase browser
const supabase = getSupabaseClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [status, setStatus] = useState<AuthStatus>('initial');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<(User & Profile) | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const refreshing = useRef(false);

  const applyState = useCallback((s: Session | null, p: Profile | null) => {
    setSession(s);
    setProfile(p);
    if (s?.user) {
      const combined: any = { ...(s.user as any), ...(p || {}) };
      setUser(combined);
      setStatus('authenticated');
    } else {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const loadProfile = useCallback(async (sessionUserId: string): Promise<Profile | null> => {
    try {
      // Buscar perfil por user_id (que referencia auth.users.id)
      const { data: profileData, error: profileError } = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('user_id', sessionUserId)
        .maybeSingle();

      if (profileError) {
        console.error('[loadProfile] Profile query error:', profileError);
        return null;
      }

      // Si no existe perfil, intentar crearlo
      if (!profileData) {
        console.log('[loadProfile] Profile not found, attempting to create one');
        try {
          // Obtener datos del usuario de auth
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.error('[loadProfile] Could not get user data:', userError);
            return null;
          }

          // Crear perfil básico
          const profilePayload = {
            user_id: sessionUserId,
            email: user.email
          };

          const { data: newProfile, error: insertError } = await (supabase
            .from('profiles') as any)
            .insert(profilePayload)
            .select('*')
            .single();

          if (insertError) {
            console.error('[loadProfile] Could not create profile:', insertError);
            return null;
          }

          console.log('[loadProfile] Profile created successfully:', newProfile);
          return newProfile as Profile;
        } catch (createError) {
          console.error('[loadProfile] Profile creation failed:', createError);
          return null;
        }
      }

      // Si existe perfil, verificar si tiene empresa asociada
      let profileWithCompany = profileData as Profile;

      if (profileData.company_id) {
        try {
          const { data: companyData, error: companyError } = await (supabase
            .from('companies') as any)
            .select('*')
            .eq('id', profileData.company_id)
            .maybeSingle();

          if (!companyError && companyData) {
            profileWithCompany = {
              ...profileData,
              empresa: companyData
            } as Profile;
          }
        } catch (companyQueryError) {
          console.warn('[loadProfile] Could not load company data:', companyQueryError);
          // Continuar sin datos de empresa
        }
      }

      return profileWithCompany;
    } catch (error) {
      console.error('[loadProfile] Unexpected error:', error);
      return null;
    }
  }, [supabase]);

  const refresh = useCallback(async (force?: boolean) => {
    if (refreshing.current && !force) return;
    refreshing.current = true;
    setStatus(prev => (prev === 'authenticated' || prev === 'anonymous') ? 'checking' : prev);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        applyState(null, null);
        return;
      }
      const p = await loadProfile(session.user.id);
      applyState(session, p);
    } catch (e) {
      console.error('[auth] refresh error', e);
      setStatus('error');
    } finally {
      refreshing.current = false;
    }
  }, [applyState, loadProfile, supabase]);

  // Efecto 1: Carga inicial (sólo una vez)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session: current } } = await supabase.auth.getSession();
        if (!active) return;
        if (!current?.user) {
          applyState(null, null);
        } else {
          const p = await loadProfile(current.user.id);
          if (!active) return;
          applyState(current, p);
        }
      } finally {
        if (active) {
          setStatus(prev => (prev === 'initial' ? (session?.user ? 'authenticated' : 'anonymous') : prev));
        }
      }
    })();
    return () => { active = false; };
    // Intencionadamente sin dependencias: sólo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto 2: Suscripción a cambios de auth
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess?.user) {
        applyState(null, null);
        return;
      }
      loadProfile(sess.user.id).then(p => applyState(sess, p));
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [applyState, loadProfile, supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      await refresh(true);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, [supabase, refresh]);

  const signUp = useCallback(async (email: string, password: string, data?: Record<string, any>) => {
    try {
      console.log('[AuthContext] signUp called with:', { email, data });
      const { data: res, error } = await supabase.auth.signUp({ email, password, options: { data } });
      if (error) {
        console.error('[AuthContext] Auth signup error:', error);
        return { ok: false, error: error.message };
      }
      console.log('[AuthContext] Auth signup successful, user:', res.user?.id);

      // No insertar en DB aquí - dejar que se maneje con triggers o en el login
      // Esto evita problemas de permisos durante el registro

      await refresh(true);
      return { ok: true };
    } catch (e: any) {
      console.error('[AuthContext] signUp error:', e);
      return { ok: false, error: e.message };
    }
  }, [supabase, refresh]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const p = await loadProfile(user.id);
    if (p) {
      setProfile(p);
    }
  }, [user?.id, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    applyState(null, null);
  }, [supabase, applyState]);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => { setAuthModalMode(mode); setAuthModalOpen(true); }, []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const value: AuthValue = useMemo(() => ({
    status,
    session,
    user,
    profile,
    loading: status === 'initial' || status === 'checking',
    supabase,
    signIn,
    signUp,
    signOut,
    refresh,
    refreshProfile,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    patchProfile: (partial) => {
      setProfile(prev => {
        const next = { ...(prev || {}), ...partial };
        if (user) setUser({ ...(user as any), ...partial } as any);
        return next;
      });
    }
  }), [status, session, user, profile, supabase, signIn, signUp, signOut, refresh, authModalOpen, authModalMode, openAuthModal, closeAuthModal]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
