import { NextRequest, NextResponse } from "next/server";
import {
  clearInstagramOAuthCookies,
  connectInstagramFromCode,
  getInstagramFlowReason,
  readInstagramOAuthCookies,
  resolveAuthUserId,
} from "@simple/instagram/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectError = (reason: string) => {
    const url = new URL(`${origin}/panel/configuraciones`);
    url.searchParams.set("error", "instagram");
    url.searchParams.set("reason", reason);
    return NextResponse.redirect(url.toString());
  };
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) return redirectError("missing_code");

    const oauthCookies = await readInstagramOAuthCookies();
    await clearInstagramOAuthCookies();
    const expectedState = oauthCookies.state;
    const cookieUserId = oauthCookies.userId;

    if (!expectedState || !state || expectedState !== state) {
      return redirectError("invalid_state");
    }

    const userId = cookieUserId ? String(cookieUserId) : await resolveAuthUserId(req);

    if (!userId) {
      return redirectError("not_logged_in");
    }

    await connectInstagramFromCode({ userId, code, origin });

    return NextResponse.redirect(`${origin}/panel/configuraciones?connected=instagram`);
  } catch (e: any) {
    return redirectError(getInstagramFlowReason(e));
  }
}
