// Archivo legado. No usar este import directamente.
// Mantener sólo para evitar romper imports antiguos mientras migramos.
// Forzar a usar el hook useSupabase (contexto único).
let warned = false;
export const supabase: any = new Proxy({}, {
  get() {
    if (!warned) {
      warned = true;
      console.error('[supabaseClient.ts] Uso LEGADO detectado. Reemplaza import { supabase } con useSupabase().');
    }
    throw new Error('Importa useSupabase y obtén el cliente desde el contexto. Este módulo está deprecado.');
  }
});
