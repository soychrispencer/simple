import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { resolveRequestToken } from "@/lib/server/sessionCookie";
import { verifySessionToken } from "@simple/auth/server";

const uploadDir = path.join(process.cwd(), "public", "uploads");

function requireAuth(request: Request): boolean {
  const token = resolveRequestToken(request);
  if (!token) return false;
  const verified = verifySessionToken(token);
  return Boolean(verified.valid && verified.payload?.sub);
}

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: "No auth" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") || "properties").replace(/[^a-zA-Z0-9/_-]/g, "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  await ensureUploadDir();
  const ext = (file.type && file.type.split("/")[1]) || "webp";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const safeFolder = folder ? folder.replace(/\.+/g, "").replace(/^\/+|\/+$/g, "") : "properties";
  const targetDir = path.join(uploadDir, safeFolder);
  await fs.mkdir(targetDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const finalPath = path.join(targetDir, name);
  await fs.writeFile(finalPath, Buffer.from(arrayBuffer));

  const relativePath = path
    .relative(path.join(process.cwd(), "public"), finalPath)
    .replace(/\\/g, "/");

  const url = `/${relativePath}`;
  return NextResponse.json({ url, path: relativePath });
}
