import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Configuración centralizada para SSO
const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Cliente compartido para SSO
const isBrowser = typeof window !== 'undefined';
let browserSSOClient: SupabaseClient | null = null;
let serviceSSOClient: SupabaseClient | null = null;

export function getSSOClient(): SupabaseClient {
  if (!browserSSOClient) {
    browserSSOClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce', // Más seguro para múltiples dominios
      },
      global: {
        headers: {
          'x-simple-sso': '1',
          'x-vertical': process.env.NEXT_PUBLIC_VERTICAL || 'unknown'
        }
      }
    });
  }
  return browserSSOClient;
}

function getServiceSSOClient(): SupabaseClient {
  if (!SUPABASE_CONFIG.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side SSO operations.');
  }

  if (!serviceSSOClient) {
    serviceSSOClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-simple-sso': '1',
          'x-vertical': process.env.NEXT_PUBLIC_VERTICAL || 'unknown'
        }
      }
    });
  }

  return serviceSSOClient;
}

// Utilidades para SSO entre verticales
export const ssoUtils = {
  // Generar token de acceso para otras verticales
  async generateCrossDomainToken(userId: string | null, targetDomain: string, expiresIn = 300) {
    if (!targetDomain) {
      throw new Error('targetDomain is required to generate an SSO token');
    }

    const canUseServiceClient = Boolean(SUPABASE_CONFIG.serviceRoleKey && !isBrowser && userId);

    if (canUseServiceClient) {
      const client = getServiceSSOClient();
      const { data, error } = await client.rpc('generate_sso_token', {
        p_user_id: userId,
        p_target_domain: targetDomain,
        p_expires_in: expiresIn
      });

      if (error) throw error;
      if (!data?.token) {
        throw new Error('Supabase generate_sso_token returned an empty payload');
      }
      return data.token;
    }

    const client = getSSOClient();
    const { data, error } = await client.rpc('init_sso_token', {
      p_target_domain: targetDomain,
      p_expires_in: expiresIn
    });

    if (error) throw error;
    if (!data?.token) {
      throw new Error('Supabase init_sso_token returned an empty payload');
    }
    return data.token;
  },

  // Validar token de SSO
  async validateSSOToken(token: string, domain: string) {
    const client = getSSOClient();
    const { data, error } = await client.rpc('validate_sso_token', {
      p_token: token,
      p_domain: domain
    });

    if (error) throw error;
    return data;
  },

  // Obtener lista de verticales disponibles para el usuario
  async getAvailableVerticals(userId: string) {
    const client = getSSOClient();
    const { data, error } = await client
      .from('user_verticals')
      .select('vertical, permissions')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) throw error;
    return data;
  }
};