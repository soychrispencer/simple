"use client";
import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useCallback, 
  useRef, 
  useState, 
  useMemo, 
  ReactNode 
} from 'react';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import type { 
  AuthStatus, 
  Profile, 
  UserWithProfile, 
  AuthResult 
} from '../types';
import { ssoUtils } from '../sso/client';

/**
 * Valor del contexto de autenticación
 */
export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: UserWithProfile | null;
  profile: Profile | null;
  loading: boolean;
  supabase: SupabaseClient;
  signIn: (email: string, password: string, remember?: boolean) => Promise<AuthResult>;
  signInWithOAuth: (
    provider: 'google',
    options?: { redirectTo?: string }
  ) => Promise<AuthResult>;
  signUp: (email: string, password: string, data?: Record<string, any>) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  patchProfile: (partial: Partial<Profile>) => void;
  // SSO functions
  getAvailableVerticals: () => Promise<any[]>;
  switchToVertical: (verticalId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Props para AuthProvider
 */
export interface AuthProviderProps {
  children: ReactNode;
  supabaseClient: SupabaseClient;
  /** Tabla de perfiles en la DB (default: 'profiles') */
  profilesTable?: string;
  /** Tabla de empresas si aplica (default: 'companies') */
  companiesTable?: string;
  /** Habilitar carga automática de empresa asociada al perfil */
  loadCompany?: boolean;
}

/**
 * Proveedor de autenticación compartido
 * Maneja autenticación con Supabase y sincronización de perfiles
 * 
 * @example
 * <AuthProvider supabaseClient={supabase}>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ 
  children, 
  supabaseClient,
  profilesTable = 'profiles',
  companiesTable = 'companies',
  loadCompany = true
}: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('initial');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const refreshing = useRef(false);
  const lastAuthUserIdRef = useRef<string | null>(null);

  const applyState = useCallback((s: Session | null, p: Profile | null) => {
    setSession(s);
    setProfile(p);
    if (s?.user) {
      const combined: any = { ...(s.user as any), ...(p || {}) };
      setUser(combined);
      setStatus('authenticated');
      lastAuthUserIdRef.current = s.user.id;
    } else {
      setUser(null);
      setStatus('anonymous');
      lastAuthUserIdRef.current = null;
    }
  }, []);

  const loadProfile = useCallback(async (sessionUserId: string): Promise<Profile | null> => {
    try {
      // Buscar perfil por id (que es el mismo que auth.users.id)
      const { data: profileData, error: profileError } = await (supabaseClient
        .from(profilesTable) as any)
        .select('*')
        .eq('id', sessionUserId)
        .maybeSingle();

      if (profileError) {
        console.error('[loadProfile] Profile query error:', profileError);
        return null;
      }

      // Si no existe perfil, intentar crearlo
      if (!profileData) {
        console.log('[loadProfile] Profile not found, attempting to create one');
        try {
          const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
          if (userError || !user) {
            console.error('[loadProfile] Could not get user data:', userError);
            return null;
          }

          const profilePayload = {
            id: sessionUserId, // Debe coincidir con auth.users.id
            email: user.email
          };

          const { data: newProfile, error: insertError } = await (supabaseClient
            .from(profilesTable) as any)
            .insert(profilePayload)
            .select('*')
            .single();

          if (insertError) {
            const errorMessage = (insertError as any)?.message ?? insertError;
            console.error('[loadProfile] Could not create profile:', errorMessage);

            // If the profile already exists (23505), re-fetch it to avoid blocking the session
            if ((insertError as any)?.code === '23505') {
              const { data: existingProfile } = await (supabaseClient
                .from(profilesTable) as any)
                .select('*')
                .eq('id', sessionUserId)
                .maybeSingle();

              if (existingProfile) {
                return existingProfile as Profile;
              }
            }

            return null;
          }

          console.log('[loadProfile] Profile created successfully:', newProfile);
          return newProfile as Profile;
        } catch (createError) {
          console.error('[loadProfile] Profile creation failed:', (createError as any)?.message ?? createError);
          return null;
        }
      }

      // Si existe perfil, verificar si tiene empresa asociada
      let profileWithCompany = profileData as Profile;

      if (loadCompany && profileData.company_id) {
        try {
          const { data: companyData, error: companyError } = await (supabaseClient
            .from(companiesTable) as any)
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

      // Cargar perfil público asociado (si existe)
      let publicProfile = null;
      try {
        const { data: publicProfileData, error: publicProfileError } = await supabaseClient
          .from('public_profiles')
          .select('*')
          .eq('owner_profile_id', sessionUserId)
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (!publicProfileError && publicProfileData) {
          publicProfile = publicProfileData;
        }
      } catch (publicProfileQueryError) {
        console.warn('[loadProfile] Could not load public profile:', publicProfileQueryError);
      }

      // Cargar membresías de empresas y sus perfiles públicos
      let companyMemberships: any[] = [];
      try {
        const { data: membershipsData, error: membershipsError } = await supabaseClient
          .from('company_users')
          .select(`*, company:companies(
            id, legal_name, billing_email, billing_phone, address_legal, region_id, commune_id, billing_data, plan_key, is_active,
            public_profile:public_profiles!company_id(*),
            commune:commune_id(name),
            region:region_id(name)
          )`)
          .eq('user_id', sessionUserId);

        if (!membershipsError && membershipsData) {
          companyMemberships = membershipsData;
        }
      } catch (membershipsQueryError) {
        console.warn('[loadProfile] Could not load company memberships:', membershipsQueryError);
      }

      const primaryCompany = companyMemberships?.[0]?.company;
      const profileWithRelations = {
        ...profileWithCompany,
        public_profile: publicProfile,
        company_memberships: companyMemberships,
        // Mantener compatibilidad con código que espera `empresa`
        empresa: profileWithCompany?.empresa || primaryCompany || null
      } as Profile;

      return profileWithRelations;
    } catch (error) {
      console.error('[loadProfile] Unexpected error:', error);
      return null;
    }
  }, [supabaseClient, profilesTable, companiesTable, loadCompany]);

  const refresh = useCallback(async (force?: boolean) => {
    if (refreshing.current && !force) return;
    refreshing.current = true;
    setStatus(prev => (prev === 'authenticated' || prev === 'anonymous') ? 'checking' : prev);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
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
  }, [applyState, loadProfile, supabaseClient]);

  // Efecto 1: Carga inicial (sólo una vez)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session: current } } = await supabaseClient.auth.getSession();

        // Verificar si el usuario tenía "remember me" activado
        const rememberMeEnabled = localStorage.getItem('simple_auth_remember') === 'true';

        if (!active) return;
        if (!current?.user) {
          // Si no hay sesión pero remember me estaba activado, intentar refresh
          if (rememberMeEnabled) {
            console.log('[Auth] Attempting to restore remembered session');
            try {
              const { data: { session: refreshed }, error } = await supabaseClient.auth.refreshSession();
              if (!error && refreshed?.user && active) {
                const p = await loadProfile(refreshed.user.id);
                if (active) applyState(refreshed, p);
                return;
              }
            } catch (refreshError) {
              console.log('[Auth] Could not refresh remembered session:', refreshError);
            }
          }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto 2: Suscripción a cambios de auth
  useEffect(() => {
    const { data: sub } = supabaseClient.auth.onAuthStateChange((event, sess) => {
      // Next/Supabase pueden emitir eventos al recuperar foco (p.ej. refresh de token o sync cross-tab).
      // Para evitar refetch/re-render del panel, sólo reaccionamos cuando cambia el usuario (user.id)
      // o cuando se cierra sesión.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      const nextUserId = sess?.user?.id ?? null;
      const prevUserId = lastAuthUserIdRef.current;

      if (!nextUserId) {
        applyState(null, null);
        return;
      }

      if (nextUserId === prevUserId) {
        return;
      }

      loadProfile(nextUserId).then(p => applyState(sess, p));
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [applyState, loadProfile, supabaseClient]);

  const signIn = useCallback(async (email: string, password: string, remember: boolean = false): Promise<AuthResult> => {
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const msg = String(error.message || 'Error al iniciar sesión');
        const lowered = msg.toLowerCase();
        if (lowered.includes('not confirmed') || lowered.includes('email not confirmed') || lowered.includes('confirm your email')) {
          return {
            ok: false,
            error: 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja (y spam) o solicita un nuevo correo de confirmación.'
          };
        }
        return { ok: false, error: msg };
      }

      // Si "recordarme" está activado, almacenar la preferencia
      if (remember) {
        console.log('[Auth] Remember me enabled - session will be more persistent');
        localStorage.setItem('simple_auth_remember', 'true');
        localStorage.setItem('simple_auth_email', email); // Para autocompletar en futuros logins
      } else {
        localStorage.removeItem('simple_auth_remember');
        localStorage.removeItem('simple_auth_email');
      }

      await refresh(true);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, [supabaseClient, refresh]);

  const signInWithOAuth = useCallback(async (
    provider: 'google',
    options?: { redirectTo?: string }
  ): Promise<AuthResult> => {
    try {
      const defaultRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/confirm`
        : undefined;

      const redirectTo = options?.redirectTo ?? defaultRedirectTo;

      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Error inesperado' };
    }
  }, [supabaseClient]);

  const signUp = useCallback(async (email: string, password: string, data?: Record<string, any>): Promise<AuthResult> => {
    try {
      console.log('[AuthContext] signUp called with:', { email, data });
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/confirm?email=${encodeURIComponent(email)}`
        : undefined;

      const { data: res, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data,
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        }
      });
      if (error) {
        console.error('[AuthContext] Auth signup error:', error);
        return { ok: false, error: error.message };
      }

      // Supabase puede devolver "éxito" aunque el usuario ya exista (para evitar enumeración).
      // En ese caso típicamente viene sin sesión y con `identities` vacío.
      const identities = (res as any)?.user?.identities as any[] | undefined;
      const hasSession = !!(res as any)?.session;
      if (!hasSession && Array.isArray(identities) && identities.length === 0) {
        return {
          ok: false,
          error: 'Este correo ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.',
        };
      }

      console.log('[AuthContext] Auth signup successful, user:', res.user?.id);
      await refresh(true);
      return { ok: true };
    } catch (e: any) {
      console.error('[AuthContext] signUp error:', e);
      return { ok: false, error: e.message };
    }
  }, [supabaseClient, refresh]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const p = await loadProfile(user.id);
    if (p) {
      setProfile(p);
    }
  }, [user?.id, loadProfile]);

  const signOut = useCallback(async () => {
    // Limpiar la preferencia de "remember me" al cerrar sesión
    localStorage.removeItem('simple_auth_remember');
    await supabaseClient.auth.signOut();
    applyState(null, null);
  }, [supabaseClient, applyState]);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => { 
    setAuthModalMode(mode); 
    setAuthModalOpen(true); 
  }, []);

  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const patchProfile = useCallback((partial: Partial<Profile>) => {
    setProfile(prev => {
      const next = { ...(prev || {}), ...partial };
      if (user) setUser({ ...(user as any), ...partial } as any);
      return next;
    });
  }, [user]);

  // SSO Functions
  const getAvailableVerticals = useCallback(async () => {
    if (!user?.id) return [];
    return await ssoUtils.getAvailableVerticals(user.id);
  }, [user?.id]);

  const switchToVertical = useCallback(async (verticalId: string) => {
    if (!user?.id) return;

    const verticals = [
      { id: 'autos', domain: process.env.NEXT_PUBLIC_AUTOS_DOMAIN || 'http://localhost:3000' },
      { id: 'propiedades', domain: process.env.NEXT_PUBLIC_PROPIEDADES_DOMAIN || 'http://localhost:3001' },
      { id: 'tiendas', domain: process.env.NEXT_PUBLIC_TIENDAS_DOMAIN || 'http://localhost:3003' },
      { id: 'food', domain: process.env.NEXT_PUBLIC_FOOD_DOMAIN || 'http://localhost:3004' },
      { id: 'crm', domain: process.env.NEXT_PUBLIC_CRM_DOMAIN || 'http://localhost:3002' }
    ];

    const targetVertical = verticals.find(v => v.id === verticalId);
    if (!targetVertical) return;

    const token = await ssoUtils.generateCrossDomainToken(user.id, targetVertical.domain);
    const ssoUrl = new URL('/auth/sso', targetVertical.domain);
    ssoUrl.searchParams.set('token', token);
    ssoUrl.searchParams.set('from', window.location.hostname);

    window.open(ssoUrl.toString(), '_blank');
  }, [user?.id]);

  const value: AuthContextValue = useMemo(() => ({
    status,
    session,
    user,
    profile,
    loading: status === 'initial' || status === 'checking',
    supabase: supabaseClient,
    signIn,
    signInWithOAuth,
    signUp,
    signOut,
    refresh,
    refreshProfile,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    patchProfile,
    getAvailableVerticals,
    switchToVertical
  }), [
    status, 
    session, 
    user, 
    profile, 
    supabaseClient, 
    signIn, 
    signInWithOAuth,
    signUp, 
    signOut, 
    refresh, 
    refreshProfile,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    patchProfile,
    getAvailableVerticals,
    switchToVertical
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar el contexto de autenticación
 * Debe ser usado dentro de un AuthProvider
 * 
 * @example
 * const { user, signIn, signOut } = useAuth();
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/**
 * Variante segura: retorna `undefined` si no hay <AuthProvider>.
 * Útil para componentes compartidos que pueden renderizarse en apps sin auth.
 */
export function useOptionalAuth() {
  return useContext(AuthContext);
}
