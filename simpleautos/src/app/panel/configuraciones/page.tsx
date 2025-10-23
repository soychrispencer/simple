"use client";
import React from "react";
import { Button } from "@/components/ui/Button";
import PanelPageLayout from "@/components/panel/PanelPageLayout";

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
  <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6 space-y-6 max-w-3xl mt-8">
  <h2 className="text-2xl font-bold text-lighttext dark:text-darktext">Configuraciones</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-lighttext dark:text-darktext">
            <input type="checkbox" checked={notifEmail} onChange={(e)=>setNotifEmail(e.target.checked)} /> Notificaciones por email
          </label>
          <label className="flex items-center gap-3 text-black dark:text-white">
            <input type="checkbox" checked={notifPush} onChange={(e)=>setNotifPush(e.target.checked)} /> Notificaciones push
          </label>
          <label className="block">
            <span className="block text-sm text-lighttext dark:text-darktext mb-1">Idioma</span>
            <span className="relative inline-block w-full">
              <select
                value={lang}
                onChange={(e)=>setLang(e.target.value)}
                className="w-full h-10 pl-4 pr-9 text-sm rounded-full bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black appearance-none transition-colors"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              <svg className="pointer-events-none absolute top-1/2 right-3 w-4 h-4 text-[var(--field-text)] opacity-70 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </label>
        </div>
        <Button variant="primary" size="md">Guardar</Button>
      </div>

      <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6 space-y-6 max-w-3xl mt-8">
        <h2 className="text-2xl font-bold text-lighttext dark:text-darktext">Feedback</h2>
        <p className="text-lighttext dark:text-darktext">Ayúdanos a mejorar compartiendo tus sugerencias o reportando problemas.</p>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm text-lighttext dark:text-darktext mb-1">Tipo de feedback</span>
            <span className="relative inline-block w-full">
              <select
                value={feedbackType}
                onChange={(e)=>setFeedbackType(e.target.value)}
                className="w-full h-10 pl-4 pr-9 text-sm rounded-full bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black appearance-none transition-colors"
              >
                <option value="suggestion">Sugerencia</option>
                <option value="bug">Reporte de error</option>
                <option value="feature">Nueva funcionalidad</option>
                <option value="other">Otro</option>
              </select>
              <svg className="pointer-events-none absolute top-1/2 right-3 w-4 h-4 text-[var(--field-text)] opacity-70 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </label>
          <label className="block">
            <span className="block text-sm text-lighttext dark:text-darktext mb-1">Mensaje</span>
            <textarea
              value={feedback}
              onChange={(e)=>setFeedback(e.target.value)}
              placeholder="Describe tu feedback aquí..."
              rows={4}
              className="w-full p-4 text-sm rounded-xl bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black transition-colors resize-none"
            />
          </label>
        </div>
        <Button variant="primary" size="md" onClick={handleFeedbackSubmit} disabled={!feedback.trim()}>Enviar Feedback</Button>
      </div>
    </PanelPageLayout>
  );
}
