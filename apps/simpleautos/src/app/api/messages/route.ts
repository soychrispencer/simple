import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const mode = String(req.nextUrl.searchParams.get("mode") || "threads").toLowerCase();
  const db = getDbPool();

  try {
    if (mode === "thread") {
      const listingId = String(req.nextUrl.searchParams.get("listing_id") || "").trim();
      const counterpartyId = String(req.nextUrl.searchParams.get("counterparty_id") || "").trim();
      if (!listingId || !counterpartyId) {
        return NextResponse.json({ error: "listing_id y counterparty_id son requeridos" }, { status: 400 });
      }

      const result = await db.query(
        `SELECT id, sender_id, receiver_id, listing_id, subject, content, is_read, status, created_at
         FROM messages
         WHERE listing_id = $1
           AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
         ORDER BY created_at ASC`,
        [listingId, auth.userId, counterpartyId]
      );

      return NextResponse.json({ messages: result.rows || [] });
    }

    const vertical = String(req.nextUrl.searchParams.get("vertical") || "autos").trim();
    const result = await db.query(
      `SELECT listing_id, company_id, vertical_key, listing_title, context, counterparty_id, last_message_at,
              last_event_at, last_message_content, status, unread, role, user_id
       FROM messages_inbox_user
       WHERE user_id = $1 AND vertical_key = $2
       ORDER BY last_event_at DESC`,
      [auth.userId, vertical]
    );

    return NextResponse.json({ threads: result.rows || [] });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Error interno") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = String(body.action || "").trim().toLowerCase();
  const db = getDbPool();

  try {
    if (action === "mark_read") {
      const listingId = String(body.listing_id || "").trim();
      const counterpartyId = String(body.counterparty_id || "").trim();
      if (!listingId || !counterpartyId) {
        return NextResponse.json({ error: "listing_id y counterparty_id son requeridos" }, { status: 400 });
      }

      await db.query(
        `UPDATE messages
         SET is_read = true
         WHERE listing_id = $1 AND receiver_id = $2 AND sender_id = $3`,
        [listingId, auth.userId, counterpartyId]
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "send") {
      const listingId = String(body.listing_id || "").trim();
      const counterpartyId = String(body.counterparty_id || "").trim();
      const subject = String(body.subject || "").trim();
      const content = String(body.content || "").trim().slice(0, 4000);

      if (!listingId || !counterpartyId || !content) {
        return NextResponse.json({ error: "listing_id, counterparty_id y content son requeridos" }, { status: 400 });
      }

      const inserted = await db.query(
        `INSERT INTO messages (sender_id, receiver_id, listing_id, subject, content, is_read, status, last_event_at)
         VALUES ($1, $2, $3, $4, $5, false, 'open', now())
         RETURNING id, sender_id, receiver_id, listing_id, subject, content, is_read, status, created_at`,
        [auth.userId, counterpartyId, listingId, subject || null, content]
      );

      return NextResponse.json({ message: inserted.rows[0] || null });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Error interno") }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = String(body.action || "").trim().toLowerCase();
  if (action !== "toggle_status") {
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  }

  const listingId = String(body.listing_id || "").trim();
  const counterpartyId = String(body.counterparty_id || "").trim();
  const status = String(body.status || "").trim().toLowerCase();

  if (!listingId || !counterpartyId || !["open", "closed"].includes(status)) {
    return NextResponse.json({ error: "listing_id, counterparty_id y status(open|closed) son requeridos" }, { status: 400 });
  }

  try {
    const db = getDbPool();
    await db.query(
      `UPDATE messages
       SET status = $1, last_event_at = now()
       WHERE listing_id = $2
         AND ((sender_id = $3 AND receiver_id = $4) OR (sender_id = $4 AND receiver_id = $3))`,
      [status, listingId, auth.userId, counterpartyId]
    );

    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Error interno") }, { status: 500 });
  }
}
