"use client";
import React, { useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import { Button } from '@/components/ui/Button';
import { IconCar, IconCalendarTime, IconGavel, IconCurrencyDollar } from '@tabler/icons-react';

// Si framer-motion no está instalado se puede reemplazar por div simple (se añadirá luego si hace falta)
// Para ahora usamos motion.* de forma opcional (Next ignorará si no existe => quitar si hay error)

type IntentCard = {
  key: 'sale' | 'rent' | 'auction';
  title: string;
  tagline: string;
  icon: React.ReactNode;
};

// Iconos Tabler para coherencia visual
// sale: IconCar (podríamos añadir overlay moneda luego si se requiere)
// rent: IconCalendarTime (representa disponibilidad)
// auction: IconGavel
const CARDS: IntentCard[] = [
  {
    key: 'sale',
    title: 'Vender un vehículo',
    tagline: 'Llega rápido a compradores.',
    icon: (
      <div className="relative" aria-hidden="true">
        <IconCar size={42} stroke={1.5} />
        <span className="absolute -top-1 -right-2 rounded-full p-1 shadow-sm ring-1 ring-black/10 dark:ring-white/15 bg-black text-white dark:bg-white dark:text-black transition-colors">
          <IconCurrencyDollar size={14} stroke={1.8} />
        </span>
      </div>
    ),
  },
  {
    key: 'rent',
    title: 'Arrendar un vehículo',
    tagline: 'Genera ingresos constantes.',
    icon: <IconCalendarTime size={42} stroke={1.5} aria-hidden="true" />,
  },
  {
    key: 'auction',
    title: 'Subastar un vehículo',
    tagline: 'Recibe pujas competitivas.',
    icon: <IconGavel size={42} stroke={1.5} aria-hidden="true" />,
  },
];

export const IntentChooser: React.FC = () => {
  const { setListingType, state, setStep } = useWizard();

  const handleSelect = useCallback((key: 'sale' | 'rent' | 'auction') => {
    setListingType(key);
  }, [setListingType]);

  return (
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">
          ¿Qué quieres publicar?
        </h1>
        <p className="mt-3 text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Elige el objetivo de tu publicación. Ajustarás detalles antes de publicar.
        </p>
      </div>
      <div
        className="grid gap-6 md:grid-cols-3"
        role="radiogroup"
        aria-label="Tipo de publicación"
      >
        {CARDS.map((card, idx) => {
          const selected = state.listing_type === card.key;
          return (
            <div
              key={card.key}
              onClick={() => handleSelect(card.key)}
              className={`intent-card-base animate-fade-up-soft ${selected ? 'intent-card-base-selected' : ''}`}
              style={{ animationDelay: `${idx * 50}ms` }}
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(card.key); }
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const order = CARDS.map(c => c.key);
                  const i = order.indexOf(card.key);
                  const next = order[(i + 1) % order.length];
                  handleSelect(next);
                }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const order = CARDS.map(c => c.key);
                  const i = order.indexOf(card.key);
                  const prev = order[(i - 1 + order.length) % order.length];
                  handleSelect(prev);
                }
              }}
              role="radio"
              aria-checked={selected}
            >
              <div className={`intent-card-base-icon ${selected ? 'animate-pop-in' : ''}`}>{card.icon}</div>
              <h2 className="intent-card-base-title">{card.title}</h2>
              <p className="intent-card-base-desc flex-1">{card.tagline}</p>
              {selected && <div className="intent-card-base-check" aria-hidden="true">✔</div>}
            </div>
          );
        })}
      </div>
      <div className="mt-10 flex flex-col items-center gap-4">
        <Button
          onClick={() => state.listing_type && setStep('type')}
          variant="primary"
          size="md"
          className="px-6"
          disabled={!state.listing_type}
        >Continuar</Button>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          {state.listing_type ? 'Puedes cambiar la selección haciendo clic en otra tarjeta.' : 'Selecciona una opción para continuar.'}
        </div>
      </div>
    </div>
  );
};

export default IntentChooser;
