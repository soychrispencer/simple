import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase service credentials not configured');
    }
    adminClient = createClient(url, key);
  }
  return adminClient;
}

function isRemoteUrl(value?: string | null) {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

const DOCUMENT_BUCKET = 'documents';
const SIGNED_URL_SECONDS = 60 * 15; // 15 min

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const path = searchParams.get('path');

    if (!id && !path) {
      return NextResponse.json({ error: 'Missing id or path' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Resolver documento desde DB para asegurar que sea público.
    const query = supabase
      .from('documents')
      .select('id, url, is_public')
      .limit(1);

    const { data: doc, error } = id
      ? await query.eq('id', id).maybeSingle()
      : await query.eq('url', path).maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!doc || !doc.is_public) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const urlOrPath = String((doc as any).url || '');
    if (!urlOrPath) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (isRemoteUrl(urlOrPath)) {
      return NextResponse.redirect(urlOrPath);
    }

    const { data, error: signError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(urlOrPath, SIGNED_URL_SECONDS);

    if (signError || !data?.signedUrl) {
      const message = signError?.message || 'Could not create signed URL';
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
