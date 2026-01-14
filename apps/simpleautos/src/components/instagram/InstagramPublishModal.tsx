"use client";

import React, { useEffect, useMemo, useState } from "react";
import { InstagramPublishModalBase } from "@simple/instagram/modal";

export type InstagramPublishVehicle = {
  id: string;
  titulo: string;
  precio?: number | null;
  listing_type?: string | null;
  year?: number | null;
  mileage?: number | null;
  region?: string | null;
  commune?: string | null;
  portada?: string | null;
  imagenes?: string[] | null;
};

function formatClp(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toLocaleString("es-CL");
}

function buildCaption(v: InstagramPublishVehicle): string {
  const parts: string[] = [];
  parts.push(v.titulo);

  const lt = String(v.listing_type || "");
  const typeLabel = lt === "rent" ? "Arriendo" : lt === "auction" ? "Subasta" : "Venta";
  parts.push(typeLabel);

  if (typeof v.precio === "number") {
    parts.push(`Precio: $${formatClp(v.precio)} CLP`);
  }
  if (v.year) parts.push(`Año: ${v.year}`);
  if (typeof v.mileage === "number") parts.push(`Kilometraje: ${v.mileage.toLocaleString("es-CL")} km`);

  const location = [v.commune, v.region].filter(Boolean).join(", ");
  if (location) parts.push(`Ubicación: ${location}`);

  parts.push("");
  parts.push("Contáctanos desde SimpleAutos.");
  parts.push("#autos #vehiculos #chile #simpleautos");

  return parts.join("\n");
}

export function InstagramPublishModal(props: {
  open: boolean;
  onClose: () => void;
  vehicle: InstagramPublishVehicle | null;
}) {
  const { open, onClose, vehicle } = props;

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
    if (!vehicle) return "";

    const params = new URLSearchParams();
    params.set("id", vehicle.id);
    params.set("title", vehicle.titulo || "");
    if (vehicle.year) params.set("year", String(vehicle.year));
    if (typeof vehicle.precio === "number") params.set("price", String(vehicle.precio));
    if (vehicle.listing_type) params.set("listing_type", String(vehicle.listing_type));

    const photo = (vehicle.portada || (vehicle.imagenes?.[0] ?? ""))?.trim();
    if (photo) params.set("photo", photo);

    return `/api/instagram/card?${params.toString()}`;
  }, [vehicle]);

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
      imageUrl={vehicle ? imageUrl : ""}
      alt={vehicle?.titulo || ""}
      defaultCaption={vehicle ? buildCaption(vehicle) : ""}
      filename={`${vehicle?.id || "publicacion"}-instagram.png`}
      enablePublish={igConnected}
      onPublish={publish}
      connectHref="/panel/configuraciones#integraciones"
    />
  );
}
