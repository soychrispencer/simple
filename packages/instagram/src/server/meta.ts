export type MetaOAuthConfig = {
  appId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
  authVersion?: string;
};

export type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type InstagramPageWithAccount = {
  pageId: string;
  pageName: string;
  igUserId: string;
  igUsername?: string | null;
};

export type InstagramPublishResult = {
  creationId: string;
  mediaId: string;
};

async function ensureOk(res: Response, context: string) {
  if (res.ok) return;

  let detail = "";
  try {
    const text = await res.text();
    if (text) {
      try {
        const json = JSON.parse(text);
        const apiMessage = json?.error?.message ? String(json.error.message) : "";
        const apiType = json?.error?.type ? String(json.error.type) : "";
        const apiCode = json?.error?.code != null ? String(json.error.code) : "";
        detail = [apiMessage, apiType && `type=${apiType}`, apiCode && `code=${apiCode}`].filter(Boolean).join(" · ");
      } catch {
        detail = text.slice(0, 400);
      }
    }
  } catch {
    // ignore
  }

  throw new Error(`${context}: HTTP ${res.status}${detail ? ` · ${detail}` : ""}`);
}

export function buildMetaOAuthUrl(config: MetaOAuthConfig) {
  const version = config.authVersion || "v19.0";
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", config.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(","));
  return url.toString();
}

export async function exchangeCodeForToken(input: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
  graphVersion?: string;
}): Promise<MetaTokenResponse> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("code", input.code);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "exchangeCodeForToken");
  return (await res.json()) as MetaTokenResponse;
}

export async function exchangeForLongLivedToken(input: {
  appId: string;
  appSecret: string;
  shortLivedToken: string;
  graphVersion?: string;
}): Promise<MetaTokenResponse> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("fb_exchange_token", input.shortLivedToken);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "exchangeForLongLivedToken");
  return (await res.json()) as MetaTokenResponse;
}

export async function fetchPagesWithInstagram(input: {
  accessToken: string;
  graphVersion?: string;
}): Promise<InstagramPageWithAccount[]> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/me/accounts`);
  url.searchParams.set("fields", "name,instagram_business_account{id,username}");
  url.searchParams.set("access_token", input.accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "fetchPagesWithInstagram");
  const json = (await res.json()) as any;
  const data: any[] = Array.isArray(json?.data) ? json.data : [];

  return data
    .map((p) => {
      const ig = p?.instagram_business_account;
      if (!ig?.id) return null;
      return {
        pageId: String(p.id),
        pageName: String(p.name || ""),
        igUserId: String(ig.id),
        igUsername: ig.username ? String(ig.username) : null,
      } satisfies InstagramPageWithAccount;
    })
    .filter(Boolean) as InstagramPageWithAccount[];
}

export async function publishImageToInstagram(input: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
  graphVersion?: string;
}): Promise<InstagramPublishResult> {
  const version = input.graphVersion || "v19.0";

  // 1) Create media
  const createUrl = new URL(`https://graph.facebook.com/${version}/${input.igUserId}/media`);
  createUrl.searchParams.set("image_url", input.imageUrl);
  createUrl.searchParams.set("caption", input.caption);
  createUrl.searchParams.set("access_token", input.accessToken);

  const createRes = await fetch(createUrl.toString(), { method: "POST" });
  await ensureOk(createRes, "publishImageToInstagram:createMedia");
  const createJson = (await createRes.json()) as any;
  const creationId = String(createJson?.id || "");
  if (!creationId) throw new Error("publishImageToInstagram: missing creation id");

  // 2) Publish
  const publishUrl = new URL(`https://graph.facebook.com/${version}/${input.igUserId}/media_publish`);
  publishUrl.searchParams.set("creation_id", creationId);
  publishUrl.searchParams.set("access_token", input.accessToken);

  const publishRes = await fetch(publishUrl.toString(), { method: "POST" });
  await ensureOk(publishRes, "publishImageToInstagram:publish");
  const publishJson = (await publishRes.json()) as any;
  const mediaId = String(publishJson?.id || "");
  if (!mediaId) throw new Error("publishImageToInstagram: missing media id");

  return { creationId, mediaId };
}
