import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Falta email' }, { status: 400 });

    const cookiesObj = await getCookies();
    const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });

    const origin = req.headers.get('origin')
      || process.env.NEXT_PUBLIC_AUTOS_DOMAIN
      || 'http://localhost:3000';

    const platformOrigin = process.env.NEXT_PUBLIC_SITE_URL || origin;
    const verticalOrigin = process.env.NEXT_PUBLIC_AUTOS_DOMAIN || origin;

    const emailRedirectToUrl = new URL('/auth/confirm', platformOrigin);
    emailRedirectToUrl.searchParams.set('email', String(email).trim());
    emailRedirectToUrl.searchParams.set('redirect_to', verticalOrigin);
    const emailRedirectTo = emailRedirectToUrl.toString();

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: String(email).trim(),
      options: { emailRedirectTo },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, info: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}


