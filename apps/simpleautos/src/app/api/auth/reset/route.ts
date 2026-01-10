import { NextResponse } from 'next/server';

// Legacy endpoint removed in favor of Supabase Auth flows.
export async function POST() {
  return NextResponse.json({ error: 'Endpoint legacy eliminado' }, { status: 410 });
}


