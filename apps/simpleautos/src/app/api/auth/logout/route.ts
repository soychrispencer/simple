
import { NextResponse } from 'next/server';


import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';

export async function POST() {
  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}


