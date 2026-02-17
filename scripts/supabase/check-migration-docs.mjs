#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "backend", "supabase", "migrations");
const docsFile = path.join(rootDir, "docs", "08-DB-MIGRATIONS.md");

if (!fs.existsSync(migrationsDir)) {
  console.error(`[db:check-migration-docs] No existe directorio: ${migrationsDir}`);
  process.exit(1);
}

if (!fs.existsSync(docsFile)) {
  console.error(`[db:check-migration-docs] Falta documentación obligatoria: ${docsFile}`);
  process.exit(1);
}

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const docsContent = fs.readFileSync(docsFile, "utf8");
const documented = new Set();
const headingRegex = /^##\s+`([^`]+)`/gm;
let match = headingRegex.exec(docsContent);
while (match) {
  documented.add(match[1]);
  match = headingRegex.exec(docsContent);
}

const missingInDocs = migrationFiles.filter((file) => !documented.has(file));
const staleInDocs = [...documented].filter((file) => !migrationFiles.includes(file));

if (missingInDocs.length || staleInDocs.length) {
  console.error("[db:check-migration-docs] Inconsistencias detectadas.");
  if (missingInDocs.length) {
    console.error("Migraciones sin documentación:");
    for (const file of missingInDocs) {
      console.error(`- ${file}`);
    }
  }
  if (staleInDocs.length) {
    console.error("Entradas documentadas que no existen:");
    for (const file of staleInDocs) {
      console.error(`- ${file}`);
    }
  }
  process.exit(1);
}

console.log(`[db:check-migration-docs] OK. ${migrationFiles.length} migraciones documentadas.`);
