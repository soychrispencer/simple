

import { NextRequest, NextResponse } from 'next/server';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

  const cookiesObj = await getCookies();
  const supabase = createRouteHandlerClient({ cookies: () => (cookiesObj as any) });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Credenciales inv�lidas' }, { status: 401 });
  }
  // Importante: usar NextResponse para propagar las cookies
  const res = NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name } });
  return res;
}


