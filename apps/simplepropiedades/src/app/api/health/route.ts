export const runtime = "nodejs";

export async function GET() {
  const nextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const nextAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const legacyUrl = process.env.SUPABASE_URL || "";
  const legacyAnon = process.env.SUPABASE_ANON_KEY || "";

  return Response.json(
    {
      ok: true,
      service: "simplepropiedades",
      ts: new Date().toISOString(),
      env: {
        has_next_public_supabase_url: Boolean(nextUrl),
        has_next_public_supabase_anon_key: Boolean(nextAnon),
        has_supabase_url: Boolean(legacyUrl),
        has_supabase_anon_key: Boolean(legacyAnon),
      },
    },
    { status: 200 }
  );
}
