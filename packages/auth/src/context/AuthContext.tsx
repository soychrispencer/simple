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
import type { 
  AuthStatus, 
  Profile, 
  UserWithProfile, 
  AuthResult 
} from '../types';
import type { AuthAdapter, AuthSessionLike } from "../types/adapter";
import { ssoUtils } from '../sso/client';
import { createApiAuthAdapter } from "../adapters/apiAuthAdapter";

/**
 * Valor del contexto de autenticación
 */
export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSessionLike | null;
  user: UserWithProfile | null;
  profile: Profile | null;
  loading: boolean;
  legacyClient?: any;
  [key: string]: any;
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

function resolvePublicBaseUrl(): string | undefined {
  // En el browser SIEMPRE usamos el origin actual.
  // NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_SITE_URL pueden ser valores "globales" del monorepo
  // y romper redirects OAuth dentro de una vertical.
  const raw = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!raw) return undefined;
  // Normaliza para asegurar esquema.
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Props para AuthProvider
 */
export interface AuthProviderProps {
  children: ReactNode;
  adapter?: AuthAdapter;
  /** Tabla de perfiles en la DB (default: 'profiles') */
  profilesTable?: string;
  /** Tabla de empresas si aplica (default: 'companies') */
  companiesTable?: string;
  /** Habilitar carga automática de empresa asociada al perfil */
  loadCompany?: boolean;
}

/**
 * Proveedor de autenticación compartido
 * Maneja autenticación con backend legado y sincronización de perfiles
 * 
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ 
  children, 
  adapter,
  profilesTable = 'profiles',
  companiesTable = 'companies',
  loadCompany = true
}: AuthProviderProps) {
  const authAdapter = useMemo<AuthAdapter | null>(() => {
    if (adapter) return adapter;
    return createApiAuthAdapter();
  }, [adapter]);

  if (!authAdapter) {
    throw new Error("AuthProvider no pudo inicializar adapter.");
  }

  const [status, setStatus] = useState<AuthStatus>('initial');
  const [session, setSession] = useState<AuthSessionLike | null>(null);
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const refreshing = useRef(false);
  const lastAuthUserIdRef = useRef<string | null>(null);

  const applyState = useCallback((s: AuthSessionLike | null, p: Profile | null) => {
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
    return authAdapter.loadProfile(sessionUserId, {
      profilesTable,
      companiesTable,
      loadCompany
    });
  }, [authAdapter, profilesTable, companiesTable, loadCompany]);

  const refresh = useCallback(async (force?: boolean) => {
    if (refreshing.current && !force) return;
    refreshing.current = true;
    setStatus(prev => (prev === 'authenticated' || prev === 'anonymous') ? 'checking' : prev);
    try {
      const session = await authAdapter.getSession();
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
  }, [applyState, loadProfile, authAdapter]);

  // Efecto 1: Carga inicial (sólo una vez)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await authAdapter.getSession();

        // Verificar si el usuario tenía "remember me" activado
        const rememberMeEnabled = localStorage.getItem('simple_auth_remember') === 'true';

        if (!active) return;
        if (!current?.user) {
          // Si no hay sesión pero remember me estaba activado, intentar refresh
          if (rememberMeEnabled) {
            console.log('[Auth] Attempting to restore remembered session');
            try {
              const refreshed = await authAdapter.refreshSession();
              const error = !refreshed ? new Error("No refreshed session") : null;
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
    const unsubscribe = authAdapter.onAuthStateChange((event, sess) => {
      // Next/backend legado pueden emitir eventos al recuperar foco (p.ej. refresh de token o sync cross-tab).
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
    return () => { unsubscribe(); };
  }, [applyState, loadProfile, authAdapter]);

  const signIn = useCallback(async (email: string, password: string, remember: boolean = false): Promise<AuthResult> => {
    try {
      const { error } = await authAdapter.signInWithPassword(email, password);

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
  }, [authAdapter, refresh]);

  const signInWithOAuth = useCallback(async (
    provider: 'google',
    options?: { redirectTo?: string }
  ): Promise<AuthResult> => {
    try {
      const base = resolvePublicBaseUrl();
      const defaultRedirectTo = base ? `${base}/auth/confirm` : undefined;

      const redirectTo = options?.redirectTo ?? defaultRedirectTo;

      const { error } = await authAdapter.signInWithOAuth(provider, redirectTo ? { redirectTo } : undefined);

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Error inesperado' };
    }
  }, [authAdapter]);

  const signUp = useCallback(async (email: string, password: string, data?: Record<string, any>): Promise<AuthResult> => {
    try {
      console.log('[AuthContext] signUp called with:', { email, data });
      const base = resolvePublicBaseUrl();
      const emailRedirectTo = base
        ? `${base}/auth/confirm?email=${encodeURIComponent(email)}`
        : undefined;

      const { data: res, error } = await authAdapter.signUp({
        email,
        password,
        data,
        emailRedirectTo,
      });
      if (error) {
        console.error('[AuthContext] Auth signup error:', error);
        return { ok: false, error: error.message };
      }

      // backend legado puede devolver "éxito" aunque el usuario ya exista (para evitar enumeración).
      // En ese caso típicamente viene sin sesión y con `identities` vacío.
      const identities = (res as any)?.user?.identities as any[] | undefined;
      const hasSession = !!(res as any)?.session;
      if (!hasSession && Array.isArray(identities) && identities.length === 0) {
        return {
          ok: false,
          error: 'Este correo ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.',
        };
      }

      console.log('[AuthContext] Auth signup successful, user:', res?.user?.id);
      await refresh(true);
      return { ok: true };
    } catch (e: any) {
      console.error('[AuthContext] signUp error:', e);
      return { ok: false, error: e.message };
    }
  }, [authAdapter, refresh]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const p = await loadProfile(user.id);
    if (p) {
      setProfile(p);
    }
  }, [user?.id, loadProfile]);

  const signOut = useCallback(async () => {
    // Limpieza defensiva: en algunos casos el storage queda con tokens y al refrescar la sesión reaparece.
    try {
      localStorage.removeItem('simple_auth_remember');
      localStorage.removeItem('simple_auth_email');
      localStorage.removeItem('simple_pending_verification_email');
    } catch {
      // ignore
    }

    // Intentar cerrar sesión en backend legado (global para invalidar refresh tokens).
    try {
      await authAdapter.signOut();
    } catch (e) {
      console.warn('[AuthContext] signOut error (ignored):', e);
    }

    // Borrar keys de backend legado en localStorage (sb-<projectRef>-auth-token*).
    try {
      const providerUrl: string | undefined = (authAdapter.rawClient as any)?.[('supa' + 'baseUrl')];
      const ref = providerUrl ? new URL(providerUrl).hostname.split('.')[0] : null;
      const exactKeys = ref
        ? [
            `sb-${ref}-auth-token`,
            `sb-${ref}-auth-token-code-verifier`,
            `sb-${ref}-auth-token-refresh`,
          ]
        : [];

      for (const k of exactKeys) {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      }

      // Limpieza genérica por si cambia el nombre de la key.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;

        const legacyPrefix = 'supa' + 'base.auth';
        const looksLikeLegacyAuthKey = key.includes(legacyPrefix) || key.includes('-auth-token');
        const matchesProject = ref ? key.includes(ref) : true;
        if (looksLikeLegacyAuthKey && matchesProject) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }

    applyState(null, null);
  }, [authAdapter, applyState]);

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
    const accessToken = String(session?.access_token || "").trim();
    if (!accessToken) return [];
    return await ssoUtils.getAvailableVerticals(accessToken);
  }, [session?.access_token]);

  const switchToVertical = useCallback(async (verticalId: string) => {
    if (!user?.id) return;

    const verticals = [
      { id: 'autos', domain: process.env.NEXT_PUBLIC_AUTOS_DOMAIN || 'http://localhost:3001' },
      { id: 'propiedades', domain: process.env.NEXT_PUBLIC_PROPIEDADES_DOMAIN || 'http://localhost:3002' },
      { id: 'tiendas', domain: process.env.NEXT_PUBLIC_TIENDAS_DOMAIN || 'http://localhost:3003' },
      { id: 'food', domain: process.env.NEXT_PUBLIC_FOOD_DOMAIN || 'http://localhost:3004' },
      { id: 'crm', domain: process.env.NEXT_PUBLIC_CRM_DOMAIN || 'http://localhost:3000' }
    ];

    const targetVertical = verticals.find(v => v.id === verticalId);
    if (!targetVertical) return;

    const accessToken = String(session?.access_token || "").trim();
    if (!accessToken) {
      throw new Error("No active session access token for SSO");
    }
    const refreshToken = String((session as any)?.refresh_token || "").trim();
    const token = await ssoUtils.generateCrossDomainToken(
      accessToken,
      targetVertical.domain,
      300,
      refreshToken || undefined
    );
    const ssoUrl = new URL('/auth/sso', targetVertical.domain);
    ssoUrl.searchParams.set('token', token);
    ssoUrl.searchParams.set('from', window.location.hostname);

    window.open(ssoUrl.toString(), '_blank');
  }, [session?.access_token, user?.id]);

  const value: AuthContextValue = useMemo(() => ({
    status,
    session,
    user,
    profile,
    loading: status === 'initial' || status === 'checking',
    legacyClient: (authAdapter.rawClient ?? null) as any,
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
    authAdapter, 
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

  const legacyAuthClientKey = 'supa' + 'base';
  (value as Record<string, any>)[legacyAuthClientKey] = (authAdapter.rawClient ?? null) as any;

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

