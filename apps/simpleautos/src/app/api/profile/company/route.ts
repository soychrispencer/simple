import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

type MembershipSnapshot = {
  membershipId: string | null;
  companyId: string | null;
  role: string | null;
  permissions: Record<string, any>;
  company: Record<string, any> | null;
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

async function loadTableColumns(tableName: string): Promise<Set<string>> {
  const db = getDbPool();
  const result = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set((result.rows || []).map((row: any) => String(row.column_name)));
}

function mapCompanyForClient(company: Record<string, any> | null): Record<string, any> | null {
  if (!company) return null;
  return {
    ...company,
    id: company.id ?? null,
    name: company.name ?? company.legal_name ?? null,
    legal_name: company.legal_name ?? company.name ?? null,
    rut: company.rut ?? company.tax_id ?? null,
    tax_id: company.tax_id ?? company.rut ?? null,
    industry: company.industry ?? company.business_activity ?? null,
    business_activity: company.business_activity ?? company.industry ?? null,
    description: company.description ?? company.business_type ?? null,
    business_type: company.business_type ?? company.description ?? null,
    address: company.address ?? company.address_legal ?? null,
    address_legal: company.address_legal ?? company.address ?? null,
    website: company.website ?? null,
    company_type: company.company_type ?? null,
    region_id: company.region_id ? String(company.region_id) : null,
    commune_id: company.commune_id ? String(company.commune_id) : null,
    phone: company.phone ?? company.billing_phone ?? null,
    billing_phone: company.billing_phone ?? company.phone ?? null,
    whatsapp: company.whatsapp ?? null,
    email: company.email ?? company.billing_email ?? null,
    billing_email: company.billing_email ?? company.email ?? null,
  };
}

function sanitizePermissions(raw: unknown): Record<string, any> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, any>) };
}

async function loadMembershipSnapshot(userId: string): Promise<MembershipSnapshot> {
  const db = getDbPool();
  const result = await db.query(
    `SELECT
       cu.id AS membership_id,
       cu.company_id,
       cu.role,
       cu.permissions,
       c.*
     FROM company_users cu
     INNER JOIN companies c ON c.id = cu.company_id
     WHERE cu.user_id = $1
     ORDER BY cu.created_at ASC NULLS LAST
     LIMIT 1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return {
      membershipId: null,
      companyId: null,
      role: null,
      permissions: {},
      company: null,
    };
  }

  const company: Record<string, any> = { ...row };
  delete (company as any).membership_id;
  delete (company as any).company_id;
  delete (company as any).role;
  delete (company as any).permissions;

  return {
    membershipId: row.membership_id ? String(row.membership_id) : null,
    companyId: row.company_id ? String(row.company_id) : null,
    role: row.role ? String(row.role) : null,
    permissions: sanitizePermissions(row.permissions),
    company,
  };
}

function buildCompanyWritePayload(
  input: Record<string, any>,
  companyColumns: Set<string>,
  mode: "company" | "contact"
): Record<string, any> {
  const payload: Record<string, any> = {};

  const setIfColumn = (column: string, value: unknown) => {
    if (!companyColumns.has(column)) return;
    payload[column] = value;
  };

  if (mode === "company") {
    const legalName = asNullableText(input.legal_name ?? input.name);
    const taxId = asNullableText(input.tax_id ?? input.rut);
    const businessActivity = asNullableText(input.business_activity ?? input.industry);
    const businessType = asNullableText(input.business_type ?? input.description);
    const address = asNullableText(input.address ?? input.address_legal);
    const website = asNullableText(input.website);
    const companyType = asNullableText(input.company_type);
    const regionId = asNullableUuid(input.region_id);
    const communeId = asNullableUuid(input.commune_id);

    setIfColumn("name", legalName);
    setIfColumn("legal_name", legalName);
    setIfColumn("rut", taxId);
    setIfColumn("tax_id", taxId);
    setIfColumn("industry", businessActivity);
    setIfColumn("business_activity", businessActivity);
    setIfColumn("description", businessType);
    setIfColumn("business_type", businessType);
    setIfColumn("address", address);
    setIfColumn("address_legal", address);
    setIfColumn("website", website);
    setIfColumn("company_type", companyType);
    setIfColumn("region_id", regionId);
    setIfColumn("commune_id", communeId);
  } else {
    const phone = asNullableText(input.phone);
    const whatsapp = asNullableText(input.whatsapp);
    const email = asNullableText(input.email);

    setIfColumn("phone", phone);
    setIfColumn("billing_phone", phone);
    setIfColumn("whatsapp", whatsapp);
    setIfColumn("email", email);
    setIfColumn("billing_email", email);
  }

  return payload;
}

async function insertCompanyRow(payload: Record<string, any>): Promise<string> {
  const db = getDbPool();
  const entries = Object.entries(payload);
  if (!entries.length) {
    throw new Error("No hay campos válidos para crear empresa");
  }

  const columns = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);
  const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");

  const inserted = await db.query(
    `INSERT INTO companies (${columns.join(", ")})
     VALUES (${placeholders})
     RETURNING id`,
    values
  );

  const companyId = inserted.rows[0]?.id;
  if (!companyId) {
    throw new Error("No se pudo crear la empresa");
  }
  return String(companyId);
}

async function updateCompanyRow(companyId: string, payload: Record<string, any>): Promise<void> {
  const db = getDbPool();
  const entries = Object.entries(payload);
  if (!entries.length) return;

  const assignments = entries.map(([column], idx) => `${column} = $${idx + 2}`).join(", ");
  const values = entries.map(([, value]) => value);

  await db.query(
    `UPDATE companies
     SET ${assignments}, updated_at = now()
     WHERE id = $1`,
    [companyId, ...values]
  );
}

async function ensureMembership(userId: string, companyId: string, permissions: Record<string, any>): Promise<void> {
  const db = getDbPool();
  const existing = await db.query(
    `SELECT id FROM company_users WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (existing.rows[0]?.id) {
    await db.query(
      `UPDATE company_users
       SET company_id = $2,
           permissions = $3::jsonb,
           role = COALESCE(role, 'owner'),
           updated_at = now()
       WHERE id = $1`,
      [existing.rows[0].id, companyId, JSON.stringify(permissions || {})]
    );
    return;
  }

  await db.query(
    `INSERT INTO company_users (company_id, user_id, role, permissions)
     VALUES ($1, $2, 'owner', $3::jsonb)`,
    [companyId, userId, JSON.stringify(permissions || {})]
  );
}

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const snapshot = await loadMembershipSnapshot(auth.userId);
    return NextResponse.json({
      company: mapCompanyForClient(snapshot.company),
      membershipId: snapshot.membershipId,
      companyId: snapshot.companyId,
      role: snapshot.role,
      permissions: snapshot.permissions,
    });
  } catch (error) {
    logError("[API /api/profile/company GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({} as Record<string, any>));
    const action = String(payload.action || "").trim();

    if (action !== "upsert_company" && action !== "update_contact") {
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }

    const companyColumns = await loadTableColumns("companies");
    const snapshot = await loadMembershipSnapshot(auth.userId);
    const companyIdFromPayload = asNullableUuid(payload.companyId);

    const targetCompanyId = snapshot.companyId || companyIdFromPayload;

    if (action === "upsert_company") {
      const writePayload = buildCompanyWritePayload(payload.company || {}, companyColumns, "company");

      let companyId = targetCompanyId;
      if (!companyId) {
        companyId = await insertCompanyRow(writePayload);
      } else {
        await updateCompanyRow(companyId, writePayload);
      }

      const permissions = snapshot.permissions || {};
      await ensureMembership(auth.userId, companyId, permissions);

      const updated = await loadMembershipSnapshot(auth.userId);
      return NextResponse.json({
        ok: true,
        company: mapCompanyForClient(updated.company),
        membershipId: updated.membershipId,
        companyId: updated.companyId,
        role: updated.role,
        permissions: updated.permissions,
      });
    }

    if (!targetCompanyId) {
      return NextResponse.json({ error: "Primero completa la información de empresa" }, { status: 400 });
    }

    const contactPayload = buildCompanyWritePayload(payload.contact || {}, companyColumns, "contact");
    await updateCompanyRow(targetCompanyId, contactPayload);

    const nextPermissions = {
      ...(snapshot.permissions || {}),
    } as Record<string, any>;

    const contactName = asNullableText(payload.contact?.contact_name);
    if (contactName) {
      nextPermissions.contact_name = contactName;
    } else {
      delete nextPermissions.contact_name;
    }

    await ensureMembership(auth.userId, targetCompanyId, nextPermissions);

    const updated = await loadMembershipSnapshot(auth.userId);
    return NextResponse.json({
      ok: true,
      company: mapCompanyForClient(updated.company),
      membershipId: updated.membershipId,
      companyId: updated.companyId,
      role: updated.role,
      permissions: updated.permissions,
    });
  } catch (error) {
    logError("[API /api/profile/company POST] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
