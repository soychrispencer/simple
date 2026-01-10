import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/serverSupabase';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Credenciales inválidas' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email } });
}
