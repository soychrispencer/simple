"use client";
import React from "react";
import { useWizard } from "../context/WizardContext";

function StepBasic() {
  const { state, patchSection } = useWizard();
  const { title, description } = state.data.basic;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-lighttext dark:text-darktext">Título</span>
          <input
            type="text"
            value={title}
            onChange={(event) => patchSection("basic", { title: event.target.value })}
            placeholder="Casa en Ñuñoa con patio y quincho"
            className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
          />
        </label>
        <p className="text-xs text-lighttext/70 dark:text-darktext/70">
          Usa un título claro con el barrio o atributo principal. Ej: &quot;Departamento 3D/2B con vista despejada en Las Condes&quot;.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-lighttext dark:text-darktext">Descripción</span>
          <textarea
            value={description}
            onChange={(event) => patchSection("basic", { description: event.target.value })}
            placeholder="Describe distribución, terminaciones, equipamiento y puntos de interés cercanos."
            rows={8}
            className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
          />
        </label>
        <div className="text-xs text-lighttext/70 dark:text-darktext/70">
          <span>{description.length} caracteres</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Estado del texto"
          value={description.length > 400 ? "Completo" : "Incompleto"}
          hint="Apunta a más de 400 caracteres para aparecer mejor en las búsquedas."
        />
        <TextField
          label="Guías disponibles"
          value="Plantilla Simple"
          hint="En próximos sprints podrás reutilizar textos ganadores."
        />
      </div>
    </div>
  );
}

function TextField({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl card-surface ring-1 ring-border/60 p-4">
      <p className="text-xs uppercase tracking-wide text-lighttext/60 dark:text-darktext/60">{label}</p>
      <p className="text-sm font-medium text-lighttext dark:text-darktext">{value}</p>
      <p className="text-xs text-lighttext/70 dark:text-darktext/70">{hint}</p>
    </div>
  );
}

export default StepBasic;
