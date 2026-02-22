import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

type MembershipRow = {
  membership_id: string;
  company_id: string;
  role: string | null;
  status: string | null;
  permissions: Record<string, any> | null;
  company: Record<string, any>;
};

function asNullableText(value: unknown): string | null {
  const next = String(value ?? "").trim();
  return next.length ? next : null;
}

function asNullableUuid(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
}

function asPermissions(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, any>) };
}

async function loadCompanyColumns(): Promise<Set<string>> {
  const db = getDbPool();
  const result = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'companies'`
  );
  return new Set((result.rows || []).map((row: any) => String(row.column_name)));
}

function buildCompanyPayload(input: Record<string, any>, columns: Set<string>): Record<string, any> {
  const payload: Record<string, any> = {};
  const setIfColumn = (column: string, value: unknown) => {
    if (!columns.has(column)) return;
    payload[column] = value;
  };

  setIfColumn("legal_name", asNullableText(input.legal_name ?? input.name));
  setIfColumn("name", asNullableText(input.name ?? input.legal_name));
  setIfColumn("rut", asNullableText(input.rut ?? input.tax_id));
  setIfColumn("tax_id", asNullableText(input.tax_id ?? input.rut));
  setIfColumn("company_type", asNullableText(input.company_type));
  setIfColumn("industry", asNullableText(input.industry ?? input.business_activity));
  setIfColumn("business_activity", asNullableText(input.business_activity ?? input.industry));
  setIfColumn("address_legal", asNullableText(input.address_legal ?? input.address));
  setIfColumn("address", asNullableText(input.address ?? input.address_legal));
  setIfColumn("region_id", asNullableUuid(input.region_id));
  setIfColumn("commune_id", asNullableUuid(input.commune_id));
  setIfColumn("billing_email", asNullableText(input.billing_email ?? input.email));
  setIfColumn("email", asNullableText(input.email ?? input.billing_email));
  setIfColumn("billing_phone", asNullableText(input.billing_phone ?? input.phone));
  setIfColumn("phone", asNullableText(input.phone ?? input.billing_phone));
  setIfColumn("website", asNullableText(input.website));

  if (columns.has("billing_data")) {
    const rawBillingData = input.billing_data;
    payload.billing_data =
      rawBillingData && typeof rawBillingData === "object" && !Array.isArray(rawBillingData)
        ? rawBillingData
        : {};
  }

  return payload;
}

async function queryMembershipRows(userId: string): Promise<MembershipRow[]> {
  const db = getDbPool();
  const result = await db.query(
    `
      SELECT
        cu.id AS membership_id,
        cu.company_id,
        cu.role,
        cu.status,
        cu.permissions,
        jsonb_build_object(
          'id', c.id,
          'legal_name', c.legal_name,
          'rut', c.rut,
          'company_type', c.company_type,
          'industry', c.industry,
          'billing_email', c.billing_email,
          'billing_phone', c.billing_phone,
          'address_legal', c.address_legal,
          'region_id', c.region_id,
          'commune_id', c.commune_id,
          'billing_data', c.billing_data,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'region', CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object('name', r.name) END,
          'commune', CASE WHEN cm.id IS NULL THEN NULL ELSE jsonb_build_object('name', cm.name) END
        ) AS company
      FROM company_users cu
      INNER JOIN companies c ON c.id = cu.company_id
      LEFT JOIN regions r ON r.id = c.region_id
      LEFT JOIN communes cm ON cm.id = c.commune_id
      WHERE cu.user_id = $1
      ORDER BY
        COALESCE((cu.permissions->>'primary')::boolean, false) DESC,
        c.created_at DESC NULLS LAST,
        cu.created_at DESC NULLS LAST
    `,
    [userId]
  );

  return (result.rows || []) as MembershipRow[];
}

function mapMemberships(rows: MembershipRow[]) {
  return rows
    .filter((row) => row.company_id && row.company)
    .map((row) => ({
      membershipId: String(row.membership_id),
      companyId: String(row.company_id),
      role: row.role ?? "member",
      status: row.status ?? "active",
      permissions: asPermissions(row.permissions),
      company: row.company || null,
    }));
}

async function clearPrimaryMembershipForUser(userId: string, exceptMembershipId?: string | null) {
  const db = getDbPool();
  const result = await db.query(
    `SELECT id, permissions FROM company_users WHERE user_id = $1`,
    [userId]
  );
  const rows = result.rows || [];

  for (const row of rows) {
    const membershipId = String(row.id);
    if (exceptMembershipId && membershipId === exceptMembershipId) continue;
    const perms = asPermissions(row.permissions);
    if (!perms.primary) continue;
    delete perms.primary;
    await db.query(
      `UPDATE company_users SET permissions = $2::jsonb, updated_at = now() WHERE id = $1`,
      [membershipId, JSON.stringify(perms)]
    );
  }
}

async function updateMembershipPermissions(membershipId: string, permissions: Record<string, any>) {
  const db = getDbPool();
  await db.query(
    `UPDATE company_users SET permissions = $2::jsonb, updated_at = now() WHERE id = $1`,
    [membershipId, JSON.stringify(permissions || {})]
  );
}

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const rows = await queryMembershipRows(auth.userId);
    return NextResponse.json({ companies: mapMemberships(rows) });
  } catch (error) {
    logError("[API /api/profile/companies GET autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, any>));
    const action = String(body.action || "").trim().toLowerCase();
    const db = getDbPool();

    if (action === "create") {
      const companyColumns = await loadCompanyColumns();
      const companyPayload = buildCompanyPayload(body.company || {}, companyColumns);
      const permissions = asPermissions(body.permissions);

      if (permissions.primary) {
        await clearPrimaryMembershipForUser(auth.userId, null);
      }

      const entries = Object.entries(companyPayload);
      if (!entries.length) {
        return NextResponse.json({ error: "No hay datos válidos para crear la empresa" }, { status: 400 });
      }

      const columns = entries.map(([column]) => column);
      const values = entries.map(([, value]) => value);
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");

      const insertedCompany = await db.query(
        `INSERT INTO companies (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING id`,
        values
      );

      const companyId = insertedCompany.rows[0]?.id;
      if (!companyId) {
        return NextResponse.json({ error: "No se pudo crear la empresa" }, { status: 500 });
      }

      await db.query(
        `INSERT INTO company_users (company_id, user_id, role, permissions, status)
         VALUES ($1, $2, 'owner', $3::jsonb, 'active')`,
        [companyId, auth.userId, JSON.stringify(permissions || {})]
      );

      const rows = await queryMembershipRows(auth.userId);
      return NextResponse.json({ ok: true, companies: mapMemberships(rows) });
    }

    if (action === "update") {
      const companyId = asNullableUuid(body.companyId);
      const membershipId = asNullableUuid(body.membershipId);
      if (!companyId) {
        return NextResponse.json({ error: "companyId inválido" }, { status: 400 });
      }

      const ownerMembership = await db.query(
        `
          SELECT id, role, permissions
          FROM company_users
          WHERE user_id = $1 AND company_id = $2::uuid
          ORDER BY created_at ASC NULLS LAST
          LIMIT 1
        `,
        [auth.userId, companyId]
      );

      if (!ownerMembership.rows[0]?.id) {
        return NextResponse.json({ error: "No autorizado para editar esta empresa" }, { status: 403 });
      }

      const companyColumns = await loadCompanyColumns();
      const companyPayload = buildCompanyPayload(body.company || {}, companyColumns);
      const entries = Object.entries(companyPayload);
      if (entries.length) {
        const assignments = entries.map(([column], idx) => `${column} = $${idx + 2}`).join(", ");
        const values = entries.map(([, value]) => value);
        await db.query(
          `UPDATE companies
           SET ${assignments}, updated_at = now()
           WHERE id = $1::uuid`,
          [companyId, ...values]
        );
      }

      const currentMembershipId = membershipId || String(ownerMembership.rows[0].id);
      const permissions = asPermissions(body.permissions);
      if (permissions.primary) {
        await clearPrimaryMembershipForUser(auth.userId, currentMembershipId);
      }
      await updateMembershipPermissions(currentMembershipId, permissions);

      const rows = await queryMembershipRows(auth.userId);
      return NextResponse.json({ ok: true, companies: mapMemberships(rows) });
    }

    if (action === "delete") {
      const companyId = asNullableUuid(body.companyId);
      const membershipId = asNullableUuid(body.membershipId);
      const hardDelete = Boolean(body.hardDelete);

      if (!companyId || !membershipId) {
        return NextResponse.json({ error: "Parámetros inválidos para eliminar" }, { status: 400 });
      }

      const membershipResult = await db.query(
        `
          SELECT id, role
          FROM company_users
          WHERE id = $1::uuid AND company_id = $2::uuid AND user_id = $3
          LIMIT 1
        `,
        [membershipId, companyId, auth.userId]
      );

      const membership = membershipResult.rows[0];
      if (!membership?.id) {
        return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 });
      }

      if (hardDelete) {
        if (String(membership.role || "").toLowerCase() !== "owner") {
          return NextResponse.json({ error: "Solo el owner puede eliminar la empresa" }, { status: 403 });
        }
        await db.query(`DELETE FROM company_users WHERE company_id = $1::uuid`, [companyId]);
        await db.query(`DELETE FROM companies WHERE id = $1::uuid`, [companyId]);
      } else {
        await db.query(`DELETE FROM company_users WHERE id = $1::uuid`, [membershipId]);
      }

      const rows = await queryMembershipRows(auth.userId);
      return NextResponse.json({ ok: true, companies: mapMemberships(rows) });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error) {
    logError("[API /api/profile/companies POST autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
