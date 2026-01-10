
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';


export async function GET() {
  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.user_metadata?.name } });
}


