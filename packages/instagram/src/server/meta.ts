export type MetaOAuthConfig = {
  appId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
  authVersion?: string;
  authType?: string;
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

export type FacebookPageAccountRaw = {
  pageId: string;
  pageName: string;
  instagramBusinessAccountId: string | null;
  instagramBusinessUsername: string | null;
  connectedInstagramAccountId: string | null;
  connectedInstagramUsername: string | null;
};

type FacebookPageAccountWithToken = FacebookPageAccountRaw & {
  pageAccessToken: string | null;
};

export type InstagramPublishResult = {
  creationId: string;
  mediaId: string;
};

export type InstagramMediaDetails = {
  id: string;
  permalink: string | null;
  timestamp: string | null;
};

export type FacebookMe = {
  id: string;
  name: string | null;
};

export type FacebookPermission = {
  permission: string;
  status: string;
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
        const hint =
          context === "publishImageToInstagram:createMedia" && apiCode === "9004"
            ? "hint=Instagram requiere imagen JPEG o video MP4 públicos"
            : "";
        detail = [apiMessage, apiType && `type=${apiType}`, apiCode && `code=${apiCode}`, hint]
          .filter(Boolean)
          .join(" · ");
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
  // Meta acepta scopes separados por espacios (OAuth estándar). Esto evita problemas
  // cuando algún scope llega con espacios accidentales tras una coma.
  url.searchParams.set(
    "scope",
    config.scopes
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ")
  );
  if (config.authType) {
    url.searchParams.set("auth_type", config.authType);
  }
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

export async function refreshLongLivedToken(input: {
  appId: string;
  appSecret: string;
  accessToken: string;
  graphVersion?: string;
}): Promise<MetaTokenResponse> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("fb_exchange_token", input.accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "refreshLongLivedToken");
  return (await res.json()) as MetaTokenResponse;
}

export async function fetchPagesAccountsRaw(input: {
  accessToken: string;
  graphVersion?: string;
}): Promise<FacebookPageAccountRaw[]> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/me/accounts`);
  url.searchParams.set(
    "fields",
    "name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}"
  );
  url.searchParams.set("access_token", input.accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "fetchPagesAccountsRaw");
  const json = (await res.json()) as any;
  const data: any[] = Array.isArray(json?.data) ? json.data : [];

  const pages = data
    .map((p) => {
      return {
        pageId: String(p.id),
        pageName: String(p.name || ""),
        pageAccessToken: p?.access_token ? String(p.access_token) : null,
        instagramBusinessAccountId: p?.instagram_business_account?.id
          ? String(p.instagram_business_account.id)
          : null,
        instagramBusinessUsername: p?.instagram_business_account?.username
          ? String(p.instagram_business_account.username)
          : null,
        connectedInstagramAccountId: p?.connected_instagram_account?.id
          ? String(p.connected_instagram_account.id)
          : null,
        connectedInstagramUsername: p?.connected_instagram_account?.username
          ? String(p.connected_instagram_account.username)
          : null,
      } satisfies FacebookPageAccountWithToken;
    })
    .filter(Boolean) as FacebookPageAccountWithToken[];

  // Some apps/accounts do not expose IG fields directly in /me/accounts.
  // Retry per-page lookup using page access token as fallback.
  const enriched = await Promise.all(
    pages.map(async (page) => {
      if (
        page.instagramBusinessAccountId ||
        page.connectedInstagramAccountId ||
        !page.pageAccessToken
      ) {
        return page;
      }

      try {
        const pageUrl = new URL(`https://graph.facebook.com/${version}/${page.pageId}`);
        pageUrl.searchParams.set(
          "fields",
          "instagram_business_account{id,username},connected_instagram_account{id,username}"
        );
        pageUrl.searchParams.set("access_token", page.pageAccessToken);
        const pageRes = await fetch(pageUrl.toString(), { method: "GET" });
        await ensureOk(pageRes, "fetchPagesAccountsRaw:pageLookup");
        const pageJson = (await pageRes.json()) as any;
        return {
          ...page,
          instagramBusinessAccountId: pageJson?.instagram_business_account?.id
            ? String(pageJson.instagram_business_account.id)
            : null,
          instagramBusinessUsername: pageJson?.instagram_business_account?.username
            ? String(pageJson.instagram_business_account.username)
            : null,
          connectedInstagramAccountId: pageJson?.connected_instagram_account?.id
            ? String(pageJson.connected_instagram_account.id)
            : null,
          connectedInstagramUsername: pageJson?.connected_instagram_account?.username
            ? String(pageJson.connected_instagram_account.username)
            : null,
        } satisfies FacebookPageAccountWithToken;
      } catch {
        return page;
      }
    })
  );

  return enriched.map((page) => ({
    pageId: page.pageId,
    pageName: page.pageName,
    instagramBusinessAccountId: page.instagramBusinessAccountId,
    instagramBusinessUsername: page.instagramBusinessUsername,
    connectedInstagramAccountId: page.connectedInstagramAccountId,
    connectedInstagramUsername: page.connectedInstagramUsername,
  }));
}

export async function fetchPagesWithInstagram(input: {
  accessToken: string;
  graphVersion?: string;
}): Promise<InstagramPageWithAccount[]> {
  const rawPages = await fetchPagesAccountsRaw(input);
  return rawPages
    .map((p) => {
      const igUserId = p.instagramBusinessAccountId || p.connectedInstagramAccountId;
      const igUsername = p.instagramBusinessUsername || p.connectedInstagramUsername;
      if (!igUserId) return null;
      return {
        pageId: p.pageId,
        pageName: p.pageName,
        igUserId,
        igUsername,
      } satisfies InstagramPageWithAccount;
    })
    .filter(Boolean) as InstagramPageWithAccount[];
}

export async function fetchFacebookMe(input: {
  accessToken: string;
  graphVersion?: string;
}): Promise<FacebookMe> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/me`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", input.accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "fetchFacebookMe");
  const json = (await res.json()) as any;
  return {
    id: String(json?.id || ""),
    name: json?.name ? String(json.name) : null,
  };
}

export async function fetchFacebookPermissions(input: {
  accessToken: string;
  graphVersion?: string;
}): Promise<FacebookPermission[]> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/me/permissions`);
  url.searchParams.set("access_token", input.accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "fetchFacebookPermissions");
  const json = (await res.json()) as any;
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data
    .map((row) => {
      if (!row?.permission || !row?.status) return null;
      return {
        permission: String(row.permission),
        status: String(row.status),
      } satisfies FacebookPermission;
    })
    .filter(Boolean) as FacebookPermission[];
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

export async function fetchInstagramMediaDetails(input: {
  mediaId: string;
  accessToken: string;
  graphVersion?: string;
}): Promise<InstagramMediaDetails> {
  const version = input.graphVersion || "v19.0";
  const url = new URL(`https://graph.facebook.com/${version}/${input.mediaId}`);
  url.searchParams.set("fields", "id,permalink,timestamp");
  url.searchParams.set("access_token", input.accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  await ensureOk(res, "fetchInstagramMediaDetails");
  const json = (await res.json()) as any;

  return {
    id: String(json?.id || input.mediaId),
    permalink: json?.permalink ? String(json.permalink) : null,
    timestamp: json?.timestamp ? String(json.timestamp) : null,
  };
}
