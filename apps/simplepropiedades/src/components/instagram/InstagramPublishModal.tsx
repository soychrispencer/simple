"use client";

import React, { useEffect, useMemo, useState } from "react";
import { InstagramPublishModalBase } from "@simple/instagram/modal";

export type InstagramPublishProperty = {
  id: string;
  title: string;
  price?: number | null;
  currency?: string | null;
  listing_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_m2?: number | null;
  city?: string | null;
  region?: string | null;
  thumbnail_url?: string | null;
  image_urls?: string[] | null;
};

function formatCurrency(value: number | null | undefined, currency: string | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const curr = currency || "CLP";
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$${value.toLocaleString("es-CL")}`;
  }
}

function buildCaption(p: InstagramPublishProperty): string {
  const parts: string[] = [];
  parts.push(p.title);

  const lt = String(p.listing_type || "");
  const typeLabel = lt === "rent" ? "Arriendo" : lt === "auction" ? "Subasta" : "Venta";
  parts.push(typeLabel);

  if (typeof p.price === "number") {
    parts.push(`Precio: ${formatCurrency(p.price, p.currency)}`);
  }

  const specs: string[] = [];
  if (typeof p.bedrooms === "number" && p.bedrooms > 0) specs.push(`${p.bedrooms} habs`);
  if (typeof p.bathrooms === "number" && p.bathrooms > 0) specs.push(`${p.bathrooms} baños`);
  if (typeof p.area_m2 === "number" && p.area_m2 > 0) specs.push(`${p.area_m2} m²`);
  if (specs.length) parts.push(`Detalle: ${specs.join(" · ")}`);

  const location = [p.city, p.region].filter(Boolean).join(", ");
  if (location) parts.push(`Ubicación: ${location}`);

  parts.push("");
  parts.push("Contáctanos desde SimplePropiedades.");
  parts.push("#propiedades #arriendo #venta #chile #simplepropiedades");

  return parts.join("\n");
}

export function InstagramPublishModal(props: {
  open: boolean;
  onClose: () => void;
  property: InstagramPublishProperty | null;
}) {
  const { open, onClose, property } = props;

  const [igConnected, setIgConnected] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/instagram/status");
        const json = await res.json();
        if (!cancelled) setIgConnected(!!json?.connected);
      } catch {
        if (!cancelled) setIgConnected(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const imageUrl = useMemo(() => {
    if (!property) return "";

    const params = new URLSearchParams();
    params.set("id", property.id);
    params.set("title", property.title || "");
    if (typeof property.price === "number") params.set("price", String(property.price));
    if (property.listing_type) params.set("listing_type", String(property.listing_type));

    const photo = (property.thumbnail_url || (property.image_urls?.[0] ?? ""))?.trim();
    if (photo) params.set("photo", photo);

    return `/api/instagram/card?${params.toString()}`;
  }, [property]);

  const publish = async (input: { imageUrl: string; caption: string }) => {
    const res = await fetch("/api/instagram/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: input.imageUrl, caption: input.caption }),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  };

  return (
    <InstagramPublishModalBase
      open={open}
      onClose={onClose}
      heading="Publicar en Instagram"
      description="Genera una imagen lista para Instagram y un texto sugerido. Para publicar, Instagram debe estar conectado y el sitio debe ser accesible desde internet (prod o túnel)."
      imageUrl={property ? imageUrl : ""}
      alt={property?.title || ""}
      defaultCaption={property ? buildCaption(property) : ""}
      filename={`${property?.id || "publicacion"}-instagram.png`}
      enablePublish={igConnected}
      onPublish={publish}
      connectHref="/panel/configuraciones#integraciones"
    />
  );
}
