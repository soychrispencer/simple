"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../feedback/ToastProvider";

type Props = {
  /** Si true, redirige automáticamente tras confirmar signup */
  redirectTo?: string;
  /** Delay en ms antes de redirigir */
  redirectDelayMs?: number;
};

export function AuthCallbackToasts({ redirectTo = "/panel", redirectDelayMs = 1200 }: Props) {
  const { addToast } = useToast();
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash?.startsWith("#")
      ? window.location.hash.substring(1)
      : window.location.hash;

    if (!hash) return;

    const params = new URLSearchParams(hash);
    const type = params.get("type");

    // Mostramos mensaje sólo en confirmación de email (signup).
    // OAuth sign-in normalmente no viene con type=signup.
    if (type !== "signup") return;

    shown.current = true;

    addToast("Verificación exitosa. Tu cuenta ya está activa.", { type: "success" });

    // Limpia el hash para evitar repetir el toast al recargar.
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      // ignore
    }

    // Si venía de registro, limpiamos flag de "pendiente".
    try {
      window.localStorage.removeItem("simple_pending_verification_email");
    } catch {
      // ignore
    }

    if (redirectTo) {
      window.setTimeout(() => {
        router.replace(redirectTo);
      }, redirectDelayMs);
    }
  }, [addToast, redirectDelayMs, redirectTo, router]);

  return null;
}
