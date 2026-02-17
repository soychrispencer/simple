import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton Supabase client to avoid multiple GoTrueClient instances
let supabaseClient: SupabaseClient<any> | null = null;

function getRuntimePublicEnv(): {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
} {
  if (typeof window === 'undefined') {
    return {};
  }
  return ((window as any).__SIMPLE_RUNTIME_ENV__ as any) || {};
}

function createServerStubClient(): SupabaseClient<any> {
  // Durante SSR/prerender no queremos inicializar
  // Supabase con env vars públicas (y mucho menos reventar el build si faltan).
  // Este stub sólo evita que el render server falle; cualquier uso real
  // debe ocurrir en el browser.
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Supabase client no está disponible durante SSR. ' +
            'Este código debe ejecutarse sólo en el browser (Client Components).'
        );
      },
    }
  ) as any;
}

export function getSupabaseClient(): SupabaseClient<any> {
  if (typeof window === 'undefined') {
    return createServerStubClient();
  }

  if (!supabaseClient) {
    const runtimeEnv = getRuntimePublicEnv();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        'Faltan env vars de Supabase: NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: { headers: { 'x-simpleautos-auth': '1' } }
    });
  }
  return supabaseClient;
}

