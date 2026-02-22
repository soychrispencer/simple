export const runtime = "nodejs";

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_SIMPLE_API_BASE_URL || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const writes = process.env.NEXT_PUBLIC_ENABLE_SIMPLE_API_WRITES || "";
  const strictWrites = process.env.NEXT_PUBLIC_SIMPLE_API_STRICT_WRITES || "";

  return Response.json(
    {
      ok: true,
      service: "simpleautos",
      ts: new Date().toISOString(),
      env: {
        has_next_public_app_url: Boolean(appUrl),
        has_next_public_simple_api_base_url: Boolean(apiBase),
        enable_simple_api_writes: writes || "auto",
        simple_api_strict_writes: strictWrites || "auto",
      },
    },
    { status: 200 }
  );
}
