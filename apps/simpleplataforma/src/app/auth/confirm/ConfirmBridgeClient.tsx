"use client";

import React, { useEffect, useMemo, useState } from "react";

function isAllowedRedirectHost(hostname: string) {
  const allowed = [
    "simpleautos.app",
    "www.simpleautos.app",
    "simplepropiedades.app",
    "www.simplepropiedades.app",
    "localhost",
  ];
  return allowed.includes(hostname);
}

function pickTargetBase(): string {
  // 1) redirect_to (si vino en query). Supabase a veces incluye redirect_to en enlaces.
  try {
    const url = new URL(window.location.href);
    const redirectTo = url.searchParams.get("redirect_to") || url.searchParams.get("redirectTo");
    if (redirectTo) {
      const parsed = new URL(redirectTo);
      if (isAllowedRedirectHost(parsed.hostname)) {
        return `${parsed.protocol}//${parsed.host}`;
      }
    }
  } catch {
    // ignore
  }

  // 2) fallback: SimpleAutos
  return "https://simpleautos.app";
}

export default function ConfirmBridgeClient() {
  const [dest, setDest] = useState<string | null>(null);

  const destination = useMemo(() => {
    if (typeof window === "undefined") return null;
    const base = pickTargetBase();

    // Preservar query y hash (en OAuth/Supabase el access_token llega en #...)
    const query = window.location.search || "";
    const hash = window.location.hash || "";

    return `${base}/auth/confirm${query}${hash}`;
  }, []);

  useEffect(() => {
    if (!destination) return;
    setDest(destination);
    window.location.replace(destination);
  }, [destination]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>Confirmando acceso…</h1>
      <p style={{ color: "#555", lineHeight: 1.5 }}>
        Redirigiendo a la vertical para completar el inicio de sesión.
      </p>
      {dest ? (
        <p style={{ marginTop: 16, fontSize: 12, color: "#777" }}>
          Si no te redirige automáticamente, abre: <a href={dest}>{dest}</a>
        </p>
      ) : null}
    </main>
  );
}
