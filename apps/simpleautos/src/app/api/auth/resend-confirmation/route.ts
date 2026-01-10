import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Falta email' }, { status: 400 });

  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });

    // Usamos resetPasswordForEmail para enviar un email que permita verificar la propiedad del correo
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      // opcional: redirectTo: process.env.NEXT_PUBLIC_APP_URL
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, info: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}


