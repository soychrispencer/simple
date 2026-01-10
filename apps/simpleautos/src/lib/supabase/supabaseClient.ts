// Archivo legado. No usar este import directamente.
// Mantener s�lo para evitar romper imports antiguos mientras migramos.
// Forzar a usar el hook useSupabase (contexto �nico).
import { logWarn } from '../logger';
let warned = false;
export const supabase: any = new Proxy({}, {
  get() {
    if (!warned) {
      warned = true;
      if (process.env.NODE_ENV !== 'production') {
        logWarn('[supabaseClient.ts] Uso LEGADO detectado. Reemplaza import { supabase } con useSupabase().');
      }
    }
    throw new Error('Importa useSupabase y obt�n el cliente desde el contexto. Este m�dulo est� deprecado.');
  }
});


