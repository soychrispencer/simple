import { useAuth } from '@/context/AuthContext';

export function useSupabase(): any {
  const { supabase } = useAuth();
  return supabase as any;
}


