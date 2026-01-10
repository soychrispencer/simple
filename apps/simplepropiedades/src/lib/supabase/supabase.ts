import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton Supabase client to avoid multiple GoTrueClient instances
let supabaseClient: SupabaseClient<any> | null = null;

export function getSupabaseClient(): SupabaseClient<any> {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabaseClient = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-simplepropiedades-auth': '1' } }
    });
  }
  return supabaseClient;
}
