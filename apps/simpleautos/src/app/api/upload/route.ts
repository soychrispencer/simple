import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { UPLOAD_DIR } from '@/lib/config';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';

const uploadDir = path.isAbsolute(UPLOAD_DIR)
  ? UPLOAD_DIR
  : path.join(process.cwd(), UPLOAD_DIR);

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest) {
  const cookiesObj = await getCookies();
  const supabase = createServerComponentClient({ cookies: () => (cookiesObj as any) });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

  await ensureUploadDir();
  const ext = (file.type && file.type.split('/')[1]) || 'webp';
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(path.join(uploadDir, name), Buffer.from(arrayBuffer));

  const url = `/uploads/${name}`;
  return NextResponse.json({ url });
}


