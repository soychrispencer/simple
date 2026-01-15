import React from "react";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px" }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Simple Plataforma</h1>
      <p style={{ color: "#555", lineHeight: 1.5 }}>
        Esta es una página temporal para soportar la autenticación unificada (emails/OAuth) mientras se construye la
        landing y el admin.
      </p>

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="https://simpleautos.app" rel="noreferrer">Ir a SimpleAutos</a>
        <a href="https://simplepropiedades.app" rel="noreferrer">Ir a SimplePropiedades</a>
      </div>

      <div style={{ marginTop: 24, color: "#777", fontSize: 12 }}>
        Ruta clave: <code>/auth/confirm</code>
      </div>
    </main>
  );
}
