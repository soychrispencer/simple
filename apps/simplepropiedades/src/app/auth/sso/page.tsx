"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, ssoUtils } from "@simple/auth";

function SSOAuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get("token") || "";
  const from = searchParams.get("from") || "";
  const returnTo = useMemo(() => {
    return from.startsWith("/") ? from : "/panel";
  }, [from]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (!token) {
          router.replace("/?error=invalid_sso_token");
          return;
        }

        const validation = await ssoUtils.validateSSOToken(token, window.location.origin);
        if (!validation.valid || !validation.session?.accessToken || !validation.session?.refreshToken) {
          const reason = validation.reason || "invalid_sso_token";
          router.replace(`/?error=${encodeURIComponent(reason)}`);
          return;
        }

        const bridgeRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: validation.session.accessToken }),
        });
        if (!bridgeRes.ok) {
          setErrorMessage("No pudimos crear tu sesión en esta vertical.");
          return;
        }

        try {
          localStorage.setItem("simple_access_token", validation.session.accessToken);
        } catch {
          // ignore localStorage errors
        }
        await refresh(true);

        router.replace(returnTo);
      } catch (error) {
        console.error("[SSOAuthPage] bootstrap failed", error);
        if (active) {
          setErrorMessage("No pudimos completar el acceso cruzado.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refresh, returnTo, router, token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-border/60 bg-background/80 p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Conectando tu sesión...</h1>
        <p className="text-sm text-muted-foreground">
          Estamos validando tu acceso entre verticales.
        </p>
        {errorMessage ? (
          <p className="mt-4 text-sm text-red-500">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function SSOAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SSOAuthPageContent />
    </Suspense>
  );
}
