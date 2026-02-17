import { ImageResponse } from "next/og";
import * as React from "react";

export type InstagramCardOptions = {
  brandName: string;
  domain: string;
  footerLeft?: string;
};

function clampText(input: string, max: number) {
  const str = String(input || "");
  if (str.length <= max) return str;
  return str.slice(0, Math.max(0, max - 1)) + "…";
}

function formatClp(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toLocaleString("es-CL");
}

function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arrayBuffer).toString("base64");
  }
  if (typeof btoa === "function") {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  throw new Error("No base64 encoder available");
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch image: ${res.status} ${res.statusText}`, { url });
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const contentType = (res.headers.get("content-type") || "image/jpeg").toLowerCase();

    // next/og can fail with some source formats (notably webp) when embedded as data URL.
    // For those cases we simply omit background photo and still render a valid card.
    if (!contentType.startsWith("image/") || contentType.includes("webp") || contentType.includes("avif")) {
      return null;
    }

    const base64 = arrayBufferToBase64(arrayBuffer);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching or converting image:", { url, error });
    return null;
  }
}

function buildCardElement(input: {
  title: string;
  year: string | null;
  priceText: string | null;
  typeLabel: string;
  photoDataUrl: string | null;
  options: InstagramCardOptions;
}) {
  const { title, year, priceText, typeLabel, photoDataUrl, options } = input;

  return React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0B0F19",
        color: "#FFFFFF",
        padding: 48,
        position: "relative",
        fontFamily: "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      },
    },
    photoDataUrl
      ? React.createElement("img", {
          src: photoDataUrl,
          style: {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.9,
          },
        })
      : null,
    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, rgba(11,15,25,0.2) 0%, rgba(11,15,25,0.75) 55%, rgba(11,15,25,0.92) 100%)",
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgba(255, 196, 0, 0.18)",
            border: "1px solid rgba(255, 196, 0, 0.38)",
            color: "#FFC400",
            padding: "10px 14px",
            borderRadius: 999,
            fontSize: 18,
            letterSpacing: 1.2,
            fontWeight: 700,
          },
        },
        typeLabel
      ),
      React.createElement(
        "div",
        { style: { fontSize: 18, opacity: 0.92, fontWeight: 600 } },
        options.brandName
      )
    ),
    React.createElement(
      "div",
      { style: { position: "relative", display: "flex", flex: 1, alignItems: "flex-end" } },
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.05,
              textShadow: "0 10px 35px rgba(0,0,0,0.5)",
            },
          },
          title
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } },
          priceText
            ? React.createElement(
                "div",
                {
                  style: {
                    fontSize: 42,
                    fontWeight: 900,
                    backgroundColor: "rgba(0, 0, 0, 0.45)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    padding: "12px 16px",
                    borderRadius: 18,
                  },
                },
                `$${priceText}`
              )
            : null,
          year
            ? React.createElement(
                "div",
                {
                  style: {
                    fontSize: 26,
                    fontWeight: 700,
                    backgroundColor: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    padding: "10px 14px",
                    borderRadius: 18,
                  },
                },
                year
              )
            : null
        )
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 18, opacity: 0.9 } },
        options.footerLeft || "Publica más rápido desde tu panel"
      ),
      React.createElement("div", { style: { fontSize: 18, opacity: 0.9 } }, options.domain)
    )
  );
}

export async function handleInstagramCardGET(req: Request, options: InstagramCardOptions) {
  try {
    const { searchParams } = new URL(req.url);

    const title = clampText(searchParams.get("title") || "Publicación", 60);
    const year = searchParams.get("year");
    const priceRaw = searchParams.get("price");
    const listingType = searchParams.get("listing_type") || "sale";
    const photo = searchParams.get("photo") || "";

    const price = priceRaw ? Number(priceRaw) : null;
    const priceText = formatClp(price);
    const typeLabel = listingType === "rent" ? "ARRIENDO" : listingType === "auction" ? "SUBASTA" : "VENTA";

    const photoDataUrl = photo ? await fetchImageAsDataUrl(photo) : null;
    const root = buildCardElement({
      title,
      year,
      priceText,
      typeLabel,
      photoDataUrl,
      options,
    });

    return new ImageResponse(root, {
      width: 1080,
      height: 1080,
    });
  } catch (error) {
    console.error("Error rendering instagram card. Falling back to safe card.", error);
    const fallback = buildCardElement({
      title: "Publicación",
      year: null,
      priceText: null,
      typeLabel: "VENTA",
      photoDataUrl: null,
      options,
    });
    return new ImageResponse(fallback, {
      width: 1080,
      height: 1080,
    });
  }
}
