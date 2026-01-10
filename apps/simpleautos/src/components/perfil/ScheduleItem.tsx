"use client";
import React from 'react';
import { Chip } from '@simple/ui';

export interface WeeklySchedule {
  dia: string; // 'lunes' ... 'domingo'
  inicio?: string | null;
  fin?: string | null;
  cerrado?: boolean;
}

export interface SpecialSchedule {
  id: string | number;
  fecha: string; // ISO date
  inicio?: string | null;
  fin?: string | null;
  cerrado?: boolean;
}

interface ScheduleItemProps {
  label: string;
  range?: { inicio?: string | null; fin?: string | null };
  cerrado?: boolean;
  especial?: boolean;
  dateRaw?: string;
  is247?: boolean;
}

export function ScheduleItem({ label, range, cerrado, especial, dateRaw, is247 }: ScheduleItemProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 card-inset radius-md text-sm transition-base">
      <span className="font-medium text-lighttext dark:text-darktext min-w-[88px] capitalize">{label}</span>
      <span className="flex-1 text-lighttext dark:text-darktext">
        {cerrado ? (
          <span className="italic text-lighttext/60 dark:text-darktext/60">Cerrado</span>
        ) : is247 ? (
          <span className="text-primary font-medium">Abierto</span>
        ) : (
          <>{(range?.inicio || '') && (range?.fin || '') ? `${range?.inicio} - ${range?.fin}` : <span className="text-lighttext/60 dark:text-darktext/60">Sin horario</span>}</>
        )}
      </span>
      <span className="flex items-center gap-2">
        {especial && (
          <Chip
            variant="subtle"
            size="sm"
            className="bg-[var(--color-primary-a10)] border border-[var(--color-primary-a30)] text-primary"
          >
            Especial
          </Chip>
        )}
        {dateRaw && <Chip variant="subtle" size="sm">{new Date(dateRaw).toLocaleDateString()}</Chip>}
      </span>
    </div>
  );
}

interface ScheduleListProps {
  weekly: WeeklySchedule[];
  specials: SpecialSchedule[];
  diasSemana: string[]; // ['Lunes', ...]
  is247?: boolean;
}

export function ScheduleList({ weekly, specials, diasSemana, is247 }: ScheduleListProps) {
  return (
    <div className="space-y-4">
      {weekly.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-lighttext/70 dark:text-darktext/70 pl-1">Horario Semanal</h4>
          <div className="space-y-1">
            {diasSemana.map(diaLabel => {
              const entry = weekly.find(w => w.dia === diaLabel.toLowerCase());
              return (
                <ScheduleItem
                  key={diaLabel}
                  label={diaLabel}
                  range={{ inicio: entry?.inicio, fin: entry?.fin }}
                  cerrado={entry?.cerrado}
                  is247={is247}
                />
              );
            })}
          </div>
        </div>
      )}
      {specials.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-lighttext/70 dark:text-darktext/70 pl-1">Días Especiales</h4>
          <div className="space-y-1">
            {specials.map(s => (
              <ScheduleItem
                key={s.id}
                label={new Date(s.fecha).toLocaleDateString(undefined, { weekday: 'long' })}
                range={{ inicio: s.inicio, fin: s.fin }}
                cerrado={s.cerrado}
                especial
                dateRaw={s.fecha}
              />
            ))}
          </div>
        </div>
      )}
      {weekly.length === 0 && specials.length === 0 && (
        <div className="text-center text-sm text-lighttext/60 dark:text-darktext/60">No hay horarios configurados.</div>
      )}
    </div>
  );
}

export default ScheduleItem;







