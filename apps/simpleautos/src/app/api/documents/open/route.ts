import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server/db';

function isRemoteUrl(value?: string | null) {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

function toPublicPath(urlOrPath: string): string {
  if (urlOrPath.startsWith('/')) return urlOrPath;
  if (urlOrPath.startsWith('uploads/')) return `/${urlOrPath}`;
  if (urlOrPath.startsWith('documents/')) return `/uploads/${urlOrPath}`;
  return `/uploads/${urlOrPath}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const path = searchParams.get('path');

    if (!id && !path) {
      return NextResponse.json({ error: 'Missing id or path' }, { status: 400 });
    }

    const db = getDbPool();
    const result = id
      ? await db.query(
          `SELECT id, url, is_public
           FROM documents
           WHERE id = $1
           LIMIT 1`,
          [id]
        )
      : await db.query(
          `SELECT id, url, is_public
           FROM documents
           WHERE url = $1
           LIMIT 1`,
          [path]
        );

    const doc = result.rows[0] as any;
    if (!doc || !doc.is_public) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const urlOrPath = String(doc.url || '');
    if (!urlOrPath) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (isRemoteUrl(urlOrPath)) {
      return NextResponse.redirect(urlOrPath);
    }

    return NextResponse.redirect(toPublicPath(urlOrPath));
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
