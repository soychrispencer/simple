import { redirect } from 'next/navigation';
import { createServerClient } from '../supabase/serverSupabase';

export type StaffGateResult =
  | { status: 'anon' }
  | { status: 'forbidden'; user: any }
  | { status: 'staff'; user: any; profile: { id: string; is_staff: boolean; email: string | null } };

export async function getStaffGate(): Promise<StaffGateResult> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return { status: 'anon' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,is_staff,email')
    .eq('id', user.id)
    .single();

  if (error || !profile?.is_staff) {
    return { status: 'forbidden', user };
  }

  return { status: 'staff', user, profile };
}

export async function requireStaffUser() {
  const gate = await getStaffGate();
  if (gate.status === 'staff') return { user: gate.user, profile: gate.profile };
  if (gate.status === 'forbidden') redirect('/?forbidden=1');
  redirect('/');
}
