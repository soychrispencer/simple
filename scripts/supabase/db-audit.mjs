#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const rootDir = process.cwd();
const defaultOutPath = path.join(rootDir, "docs", "db", "db-audit-latest.md");

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    options[key] = typeof value === "string" ? value : true;
  }
  return options;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function humanSize(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes || 0);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function normalizeDbUrlForNoVerify(dbUrl) {
  try {
    const url = new URL(dbUrl);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslrootcert");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    return url.toString();
  } catch {
    return dbUrl;
  }
}

function listSourceFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".turbo" || entry.name === "dist") {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (/\.(ts|tsx|js|mjs|sql)$/.test(entry.name)) {
        out.push(fullPath);
      }
    }
  }
  return out;
}

function extractSourceSignals(files) {
  const tableRefs = new Set();
  const tokens = new Set();
  const fromRegex = /from\((["'`])([a-z_][a-z0-9_]*)\1\)/g;
  const tokenRegex = /\b[a-z_][a-z0-9_]{3,}\b/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    let match = fromRegex.exec(content);
    while (match) {
      tableRefs.add(match[2]);
      match = fromRegex.exec(content);
    }

    let tokenMatch = tokenRegex.exec(content);
    while (tokenMatch) {
      tokens.add(tokenMatch[0]);
      tokenMatch = tokenRegex.exec(content);
    }
  }

  return { tableRefs, tokens };
}

function renderTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((cell) => String(cell)).join(" | ")} |`);
  }
  return lines.join("\n");
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(path.join(rootDir, ".env"));
  loadEnvFile(path.join(rootDir, "backend", "supabase", ".env"));

  const dbUrl =
    args["db-url"] ||
    process.env.SUPABASE_AUDIT_DB_URL ||
    process.env.SUPABASE_STAGING_DB_URL ||
    process.env.SUPABASE_PROD_DB_URL;

  const sslNoVerifyRaw = args["ssl-no-verify"] ?? process.env.SUPABASE_AUDIT_SSL_NO_VERIFY ?? "";
  const sslNoVerify = String(sslNoVerifyRaw).toLowerCase() === "true";

  if (!dbUrl) {
    console.error("Define --db-url=<postgres-url> o SUPABASE_AUDIT_DB_URL/SUPABASE_STAGING_DB_URL/SUPABASE_PROD_DB_URL.");
    process.exit(1);
  }

  const outPath = path.resolve(rootDir, args.out || defaultOutPath);
  const sourceScope = String(args["source-scope"] || "all").toLowerCase();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (sslNoVerify) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const client = new Client({
    connectionString: sslNoVerify ? normalizeDbUrlForNoVerify(dbUrl) : dbUrl,
    ...(sslNoVerify ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  try {
    const tableRes = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name;
    `);
    const tableNames = tableRes.rows.map((r) => r.table_name);

    const sizeRes = await client.query(`
      select relname as table_name, pg_total_relation_size(relid) as total_bytes
      from pg_catalog.pg_statio_user_tables
      where schemaname = 'public';
    `);
    const sizeByTable = new Map(sizeRes.rows.map((r) => [r.table_name, Number(r.total_bytes || 0)]));

    const tableStats = [];
    for (const tableName of tableNames) {
      const countRes = await client.query(`select count(*)::bigint as count from public.${quoteIdent(tableName)}`);
      tableStats.push({
        tableName,
        rowCount: Number(countRes.rows[0]?.count || 0),
        totalBytes: sizeByTable.get(tableName) || 0,
      });
    }

    const columnsRes = await client.query(`
      select table_name, column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position;
    `);

    const columnsByTable = new Map();
    for (const row of columnsRes.rows) {
      if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, []);
      columnsByTable.get(row.table_name).push(row);
    }

    const sourceDirs =
      sourceScope === "frontend"
        ? [
            path.join(rootDir, "apps"),
            path.join(rootDir, "packages", "ui"),
            path.join(rootDir, "packages", "config"),
            path.join(rootDir, "packages", "shared-types"),
          ]
        : [
            path.join(rootDir, "apps"),
            path.join(rootDir, "packages"),
            path.join(rootDir, "backend"),
          ];

    const sourceFiles = sourceDirs.flatMap((dir) => listSourceFiles(dir));
    const { tableRefs, tokens } = extractSourceSignals(sourceFiles);

    const ignoredColumns = new Set([
      "id",
      "created_at",
      "updated_at",
      "deleted_at",
      "created_by",
      "updated_by",
      "status",
      "metadata",
      "search_vector",
      "is_active",
    ]);

    const maybeUnusedColumns = [];
    for (const row of columnsRes.rows) {
      const column = String(row.column_name);
      if (ignoredColumns.has(column)) continue;
      if (column.endsWith("_id")) continue;
      if (tokens.has(column)) continue;
      maybeUnusedColumns.push({
        tableName: row.table_name,
        columnName: column,
        dataType: row.data_type,
      });
    }

    const emptyTables = tableStats.filter((t) => t.rowCount === 0);
    const tablesWithoutCodeRef = tableStats.filter((t) => !tableRefs.has(t.tableName));

    const overlapPairs = [];
    const tableList = [...columnsByTable.keys()].sort();
    for (let i = 0; i < tableList.length; i += 1) {
      for (let j = i + 1; j < tableList.length; j += 1) {
        const a = tableList[i];
        const b = tableList[j];
        const aCols = new Set(columnsByTable.get(a).map((c) => c.column_name));
        const bCols = new Set(columnsByTable.get(b).map((c) => c.column_name));
        const intersection = [...aCols].filter((c) => bCols.has(c));
        const union = new Set([...aCols, ...bCols]);
        const score = union.size ? intersection.length / union.size : 0;
        if (score >= 0.8 && intersection.length >= 6) {
          overlapPairs.push({
            left: a,
            right: b,
            score,
            shared: intersection.length,
          });
        }
      }
    }

    const deprecationsExistsRes = await client.query(`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'schema_deprecations'
      ) as exists;
    `);

    let deprecations = [];
    if (deprecationsExistsRes.rows[0]?.exists) {
      const depRes = await client.query(`
        select table_name, column_name, reason, status, migration_marked, migration_removed, remove_after
        from public.schema_deprecations
        where status in ('deprecated', 'scheduled_drop')
        order by table_name, column_name nulls first;
      `);
      deprecations = depRes.rows;
    }

    const lines = [];
    lines.push("# DB Audit Report");
    lines.push("");
    lines.push(`- Generated at: ${new Date().toISOString()}`);
    lines.push(`- Database: audit target via URL env`);
    lines.push(`- Source scope: ${sourceScope}`);
    lines.push(`- Tables analyzed (public): ${tableStats.length}`);
    lines.push(`- Source files scanned: ${sourceFiles.length}`);
    lines.push("");

    lines.push("## Table Inventory");
    lines.push("");
    lines.push(
      renderTable(
        ["Table", "Rows", "Size"],
        tableStats
          .sort((a, b) => b.rowCount - a.rowCount)
          .map((t) => [t.tableName, t.rowCount, humanSize(t.totalBytes)])
      )
    );
    lines.push("");

    lines.push("## Empty Tables");
    lines.push("");
    if (!emptyTables.length) {
      lines.push("No empty tables detected.");
    } else {
      lines.push(renderTable(["Table", "Size"], emptyTables.map((t) => [t.tableName, humanSize(t.totalBytes)])));
    }
    lines.push("");

    lines.push("## Tables Without Direct Code Reference");
    lines.push("");
    if (!tablesWithoutCodeRef.length) {
      lines.push("All public tables have at least one `from(\"table\")` reference in source.");
    } else {
      lines.push(
        renderTable(
          ["Table", "Rows", "Notes"],
          tablesWithoutCodeRef.map((t) => [t.tableName, t.rowCount, "Puede ser tabla de soporte, seed o no usada"])
        )
      );
    }
    lines.push("");

    lines.push("## Possible Unused Columns (Heuristic)");
    lines.push("");
    if (!maybeUnusedColumns.length) {
      lines.push("No suspicious columns detected by static token scan.");
    } else {
      lines.push(
        renderTable(
          ["Table", "Column", "Type"],
          maybeUnusedColumns.slice(0, 200).map((c) => [c.tableName, c.columnName, c.dataType])
        )
      );
      if (maybeUnusedColumns.length > 200) {
        lines.push("");
        lines.push(`_Output truncated: ${maybeUnusedColumns.length - 200} additional columns omitted._`);
      }
    }
    lines.push("");

    lines.push("## High Overlap Table Pairs");
    lines.push("");
    if (!overlapPairs.length) {
      lines.push("No table pairs above overlap threshold.");
    } else {
      lines.push(
        renderTable(
          ["Table A", "Table B", "Shared Cols", "Jaccard"],
          overlapPairs.map((o) => [o.left, o.right, o.shared, o.score.toFixed(2)])
        )
      );
    }
    lines.push("");

    lines.push("## Active Deprecations");
    lines.push("");
    if (!deprecations.length) {
      lines.push("No active deprecations registered.");
    } else {
      lines.push(
        renderTable(
          ["Table", "Column", "Status", "Reason", "Marked By", "Remove After"],
          deprecations.map((d) => [
            d.table_name,
            d.column_name || "(table)",
            d.status,
            d.reason,
            d.migration_marked,
            d.remove_after || "",
          ])
        )
      );
    }
    lines.push("");

    fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
    console.log(`[db:audit] Report generated: ${path.relative(rootDir, outPath)}`);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("[db:audit] Failed:", error?.message || error);
  process.exit(1);
});
