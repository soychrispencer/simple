import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Falta email' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase env no configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'x-simpletiendas-auth': '1' } },
    });

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_TIENDAS_DOMAIN ||
      'http://localhost:3003';

    const platformOrigin = process.env.NEXT_PUBLIC_SITE_URL || origin;
    const verticalOrigin = process.env.NEXT_PUBLIC_TIENDAS_DOMAIN || origin;

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
