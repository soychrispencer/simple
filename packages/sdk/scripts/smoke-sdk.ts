/* eslint-disable no-console */
import {
  buildProfileSummary,
  getListingMedia,
  getListingById,
  getSimpleApiHealth,
  listListings,
  queuePublish,
  resolveSubscriptionPlan
} from "../src/index";

function parseArg(name: string): string | null {
  const pref = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(pref));
  if (!arg) return null;
  return arg.slice(pref.length);
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runNetworkSmoke(baseUrl: string) {
  process.env.NEXT_PUBLIC_SIMPLE_API_BASE_URL = baseUrl;
  console.log(`[sdk smoke] base=${baseUrl}`);

  const health = await getSimpleApiHealth();
  assertCondition(health.ok === true, "Health payload inválido");
  console.log("[ok] getSimpleApiHealth");

  const autos = await listListings({ vertical: "autos", type: "sale", limit: 3, offset: 0 });
  assertCondition(Array.isArray(autos.items), "Autos listings payload inválido");
  console.log(`[ok] listListings autos (items=${autos.items.length})`);

  const props = await listListings({ vertical: "properties", type: "sale", limit: 3, offset: 0 });
  assertCondition(Array.isArray(props.items), "Properties listings payload inválido");
  console.log(`[ok] listListings properties (items=${props.items.length})`);

  const first = autos.items[0] || props.items[0] || null;
  if (!first) {
    console.log("[warn] no listings disponibles; se omiten checks de media/queue");
    return;
  }

  const media = await getListingMedia(first.id);
  assertCondition(Array.isArray(media.items), "Listing media payload inválido");
  console.log(`[ok] getListingMedia (items=${media.items.length})`);

  const listing = await getListingById(first.id);
  assertCondition(Boolean(listing?.item?.id), "Listing detail payload inválido");
  console.log("[ok] getListingById");

  const queue = await queuePublish({
    listingId: first.id,
    vertical: (first.vertical as any) || "autos",
    reason: "manual_retry"
  });
  assertCondition(queue.status === "accepted", "queuePublish payload inválido");
  console.log("[ok] queuePublish");
}

function runPureChecks() {
  const business = resolveSubscriptionPlan("business");
  assertCondition(business.plan === "enterprise", "Alias business -> enterprise no funciona");

  const basic = resolveSubscriptionPlan("basic");
  assertCondition(basic.plan === "pro", "Alias basic -> pro no funciona");

  const profile = buildProfileSummary({
    id: "abc",
    email: "user@example.com",
    first_name: "Chris",
    last_name: "Spencer",
    plan_key: "business"
  });
  assertCondition(profile.planKey === "enterprise", "Normalización plan en profile no funciona");
  assertCondition(profile.firstName === "Chris", "Resumen de profile inválido");
  console.log("[ok] pure checks");
}

async function main() {
  const skipNetwork = hasFlag("skip-network");
  const baseArg = parseArg("base");
  const baseUrl = (baseArg || process.env.SIMPLE_API_BASE_URL || "http://localhost:4000").replace(
    /\/+$/,
    ""
  );

  runPureChecks();

  if (skipNetwork) {
    console.log("[sdk smoke] network checks skipped");
    return;
  }

  await runNetworkSmoke(baseUrl);
}

main()
  .then(() => {
    console.log("[sdk smoke] success");
  })
  .catch((error: any) => {
    console.error("[sdk smoke] failed:", error?.message || error);
    process.exit(1);
  });
