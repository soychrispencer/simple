import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';


// GET /api/notificaciones?limit=20&unreadOnly=1
export async function GET(req: NextRequest) {
  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const unreadOnly = searchParams.get('unreadOnly') === '1';
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) query = query.eq('is_read', false);
  const { data: notifications, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
  return NextResponse.json({ notifications: notifications || [], unreadCount: unreadCount || 0 });
}

// PATCH /api/notificaciones (marcar todas como le�das o por ids)
export async function PATCH(req: NextRequest) {
  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { markAll, ids } = await req.json();
  if (markAll) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (Array.isArray(ids) && ids.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
}

// POST /api/notificaciones  body: { type, title?, body?, data? }
export async function POST(req: NextRequest) {
  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  if (!body.type) return NextResponse.json({ error: 'type requerido' }, { status: 400 });

  let dataJson: any = null;
  if (body.data != null) {
    if (typeof body.data === 'string') {
      try {
        dataJson = JSON.parse(body.data);
      } catch {
        dataJson = null;
      }
    } else {
      dataJson = body.data;
    }
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: user.id,
        type: body.type,
        title: body.title || 'Notificación',
        content: body.body ?? body.content ?? null,
        data: dataJson,
        is_read: false
      }
    ])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification });
}


