"use client";
import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWizard } from '../context/WizardContext';
import { Button } from '@simple/ui';
import { WizardStepLayout } from '../layout/WizardStepLayout';
import { IconCar, IconCalendarTime, IconGavel } from '@tabler/icons-react';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';

// Si framer-motion no está instalado se puede reemplazar por un div simple (se añadirá luego si hace falta)
// Por ahora usamos motion.* de forma opcional (Next ignorará si no existe => quitar si hay error)

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
    icon: <IconCar size={42} stroke={1.5} aria-hidden="true" />,
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

const STAGGER_CLASSES = ['wizard-stagger-0', 'wizard-stagger-1', 'wizard-stagger-2'];

export const IntentChooser: React.FC = () => {
  const { setListingType, state, setStep } = useWizard();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const router = useRouter();

  const handleSelect = useCallback((key: 'sale' | 'rent' | 'auction') => {
    setListingType(key);
  }, [setListingType]);

  return (
    <WizardStepLayout
      title="¿Qué quieres publicar?"
      description="Elige el objetivo de tu publicación. Ajustarás detalles antes de publicar."
      summary={state.listing_type
        ? `Seleccionado: ${state.listing_type === 'sale' ? 'Venta' : state.listing_type === 'rent' ? 'Arriendo' : 'Subasta'}`
        : 'Selecciona una opción para continuar.'}
      align="center"
      footer={(
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center justify-between gap-4 flex-wrap w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCancelOpen(true)}
            >Cancelar</Button>
            <Button
              onClick={() => state.listing_type && setStep('type')}
              variant="primary"
              size="md"
              className="px-6"
              disabled={!state.listing_type}
            >Continuar</Button>
          </div>
          <div className="type-caption text-lighttext/70 dark:text-darktext/70 text-center">
            {state.listing_type ? 'Puedes cambiar la selección haciendo clic en otra tarjeta.' : 'Selecciona una opción para continuar.'}
          </div>
        </div>
      )}
      showFooterDivider={false}
    >
      <ConfirmCancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          router.push('/panel/mis-publicaciones');
        }}
      />
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
              className={`intent-card-base animate-fade-up-soft ${STAGGER_CLASSES[idx] || ''} ${selected ? 'intent-card-base-selected' : ''}`}
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
              {selected && <div className="intent-card-base-check" aria-hidden="true">✓</div>}
            </div>
          );
        })}
      </div>
    </WizardStepLayout>
  );
};

export default IntentChooser;







