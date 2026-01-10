import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';

// Endpoint mantenido �nicamente para flujos de confirmaci�n por correo.
// El registro est�ndar ocurre en el cliente usando Supabase Auth (signUp) dentro del nuevo AuthContext.
// Si migras a magic links o eliminas confirmaciones server-side, este archivo puede eliminarse.

export async function POST(req: NextRequest) {
  const { email, password, nombre, apellido } = await req.json();
  if (!email || !password || !nombre || !apellido)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });

  const redirectTo = "http://localhost:3000/auth/confirm"; // Ajustar dominio en producci�n
  const signUpOptions: any = { data: { nombre, apellido }, emailRedirectTo: redirectTo };

  const { data, error } = await supabase.auth.signUp({ email, password, options: signUpOptions });
  if (error) return NextResponse.json({ error: error.message || 'Error al crear usuario' }, { status: 500 });

  if (!data.user) return NextResponse.json({ ok: true, message: 'Revisa tu correo para confirmar el registro.' });

  // El perfil se crea/actualiza tras el primer login desde el frontend (on-demand en AuthContext).
  return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email, nombre, apellido } });
}


