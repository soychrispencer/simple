"use client";
import React from "react";
import { Button, PanelPageLayout, Select, Textarea } from "@simple/ui";

export default function Configuraciones() {
  const [notifEmail, setNotifEmail] = React.useState(true);
  const [notifPush, setNotifPush] = React.useState(false);
  const [lang, setLang] = React.useState("es");
  const [feedback, setFeedback] = React.useState("");
  const [feedbackType, setFeedbackType] = React.useState("suggestion");

  const handleFeedbackSubmit = () => {
    // Aquí se podría enviar a una API o Supabase
    alert("¡Gracias por tu feedback! Lo revisaremos pronto.");
    setFeedback("");
  };

  return (
    <PanelPageLayout
      header={{
        title: "Configuraciones",
        description: "Ajusta tus preferencias y notificaciones."
      }}
    >
      <div className="card-surface shadow-card p-6 space-y-6 max-w-3xl mt-8">
        <h2 className="text-2xl font-bold text-lighttext dark:text-darktext">Configuraciones</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-lighttext dark:text-darktext">
            <input
              type="checkbox"
              checked={notifEmail}
              onChange={(e) => setNotifEmail(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-[var(--field-border)] bg-[var(--field-bg)] text-primary focus:ring-0"
            />
            Notificaciones por email
          </label>
          <label className="flex items-center gap-3 text-lighttext dark:text-darktext">
            <input
              type="checkbox"
              checked={notifPush}
              onChange={(e) => setNotifPush(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-[var(--field-border)] bg-[var(--field-bg)] text-primary focus:ring-0"
            />
            Notificaciones push
          </label>
          <div className="space-y-1">
            <span className="block text-sm text-lighttext dark:text-darktext">Idioma</span>
            <Select
              options={[
                { value: "es", label: "Espanol" },
                { value: "en", label: "English" },
              ]}
              value={lang}
              onChange={(v) => setLang(String(v))}
            />
          </div>
        </div>
        <Button variant="primary" size="md">Guardar</Button>
      </div>

      <div className="card-surface shadow-card p-6 space-y-6 max-w-3xl mt-8">
        <h2 className="text-2xl font-bold text-lighttext dark:text-darktext">Feedback</h2>
        <p className="text-lighttext dark:text-darktext">Ayudanos a mejorar compartiendo tus sugerencias o reportando problemas.</p>
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="block text-sm text-lighttext dark:text-darktext">Tipo de feedback</span>
            <Select
              options={[
                { value: "suggestion", label: "Sugerencia" },
                { value: "bug", label: "Reporte de error" },
                { value: "feature", label: "Nueva funcionalidad" },
                { value: "other", label: "Otro" },
              ]}
              value={feedbackType}
              onChange={(v) => setFeedbackType(String(v))}
            />
          </div>
          <div className="space-y-1">
            <span className="block text-sm text-lighttext dark:text-darktext">Mensaje</span>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe tu feedback aqui..."
              rows={4}
            />
          </div>
        </div>
        <Button variant="primary" size="md" onClick={handleFeedbackSubmit} disabled={!feedback.trim()}>Enviar Feedback</Button>
      </div>
    </PanelPageLayout>
  );
}







