export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    { ok: true, service: "simplepropiedades", ts: new Date().toISOString() },
    { status: 200 }
  );
}
