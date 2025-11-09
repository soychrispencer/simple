"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import Input from '@/components/ui/form/Input';
import Select from '@/components/ui/form/Select';
import Button from '@/components/ui/Button';

interface FinancingOption {
  bank: string;
  rate: number;
  term_months: number;
  down_payment_percent: number;
}

interface Bonus {
  type: 'cash' | 'accessory' | 'service';
  description: string;
  value?: number;
}

interface Discount {
  type: 'percentage' | 'fixed_amount';
  value: number;
  description: string;
  valid_until?: string;
}

interface CommercialConditions {
  financing?: FinancingOption[];
  bonuses?: Bonus[];
  discounts?: Discount[];
  additional_conditions?: string;
}

const StepCommercialEnhanced: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const commercial = state.commercial as any;
  const listing_type = state.listing_type;

  // Estado local para condiciones avanzadas
  const [conditions, setConditions] = useState<CommercialConditions>(
    commercial?.advanced_conditions || {}
  );

  // Estado para errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateConditions = useCallback((newConditions: CommercialConditions) => {
    setConditions(newConditions);
    patch('commercial', {
      ...commercial,
      advanced_conditions: newConditions
    });
  }, [commercial, patch]);

  // Validación de condiciones avanzadas
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    // Validar opciones de financiamiento
    if (conditions.financing) {
      conditions.financing.forEach((option, index) => {
        if (!option.bank?.trim()) {
          newErrors[`financing_${index}_bank`] = 'Banco requerido';
        }
        if (option.rate < 0 || option.rate > 100) {
          newErrors[`financing_${index}_rate`] = 'Tasa debe estar entre 0-100%';
        }
        if (option.term_months < 1 || option.term_months > 120) {
          newErrors[`financing_${index}_term`] = 'Plazo debe estar entre 1-120 meses';
        }
        if (option.down_payment_percent < 0 || option.down_payment_percent > 100) {
          newErrors[`financing_${index}_down_payment`] = 'Pie debe estar entre 0-100%';
        }
      });
    }

    // Validar bonos
    if (conditions.bonuses) {
      conditions.bonuses.forEach((bonus, index) => {
        if (!bonus.description?.trim()) {
          newErrors[`bonus_${index}_description`] = 'Descripción requerida';
        }
        if (bonus.type === 'cash' && (!bonus.value || bonus.value <= 0)) {
          newErrors[`bonus_${index}_value`] = 'Valor requerido para bonos en efectivo';
        }
      });
    }

    // Validar descuentos
    if (conditions.discounts) {
      conditions.discounts.forEach((discount, index) => {
        if (!discount.description?.trim()) {
          newErrors[`discount_${index}_description`] = 'Descripción requerida';
        }
        if (discount.value <= 0) {
          newErrors[`discount_${index}_value`] = 'Valor debe ser positivo';
        }
        if (discount.type === 'percentage' && discount.value > 100) {
          newErrors[`discount_${index}_percentage`] = 'Porcentaje máximo 100%';
        }
        if (discount.valid_until) {
          const validUntilDate = new Date(discount.valid_until);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (validUntilDate < today) {
            newErrors[`discount_${index}_valid_until`] = 'Fecha debe ser futura';
          }
        }
      });
    }

    // Validar condiciones adicionales
    if (conditions.additional_conditions && conditions.additional_conditions.length > 2000) {
      newErrors.additional_conditions = 'Máximo 2000 caracteres';
    }

    setErrors(newErrors);

    // Actualizar validez del paso
    const hasErrors = Object.keys(newErrors).length > 0;
    patch('validity', { commercial_enhanced: !hasErrors });

  }, [conditions, patch]);

  // Gestión de financiamiento
  const addFinancingOption = () => {
    const newOption: FinancingOption = {
      bank: '',
      rate: 0,
      term_months: 12,
      down_payment_percent: 20
    };
    updateConditions({
      ...conditions,
      financing: [...(conditions.financing || []), newOption]
    });
  };

  const updateFinancingOption = (index: number, field: keyof FinancingOption, value: any) => {
    const financing = [...(conditions.financing || [])];
    financing[index] = { ...financing[index], [field]: value };
    updateConditions({ ...conditions, financing });
  };

  const removeFinancingOption = (index: number) => {
    const financing = [...(conditions.financing || [])];
    financing.splice(index, 1);
    updateConditions({ ...conditions, financing });
  };

  // Gestión de bonos
  const addBonus = () => {
    const newBonus: Bonus = {
      type: 'cash',
      description: '',
      value: 0
    };
    updateConditions({
      ...conditions,
      bonuses: [...(conditions.bonuses || []), newBonus]
    });
  };

  const updateBonus = (index: number, field: keyof Bonus, value: any) => {
    const bonuses = [...(conditions.bonuses || [])];
    bonuses[index] = { ...bonuses[index], [field]: value };
    updateConditions({ ...conditions, bonuses });
  };

  const removeBonus = (index: number) => {
    const bonuses = [...(conditions.bonuses || [])];
    bonuses.splice(index, 1);
    updateConditions({ ...conditions, bonuses });
  };

  // Gestión de descuentos
  const addDiscount = () => {
    const newDiscount: Discount = {
      type: 'percentage',
      value: 0,
      description: ''
    };
    updateConditions({
      ...conditions,
      discounts: [...(conditions.discounts || []), newDiscount]
    });
  };

  const updateDiscount = (index: number, field: keyof Discount, value: any) => {
    const discounts = [...(conditions.discounts || [])];
    discounts[index] = { ...discounts[index], [field]: value };
    updateConditions({ ...conditions, discounts });
  };

  const removeDiscount = (index: number) => {
    const discounts = [...(conditions.discounts || [])];
    discounts.splice(index, 1);
    updateConditions({ ...conditions, discounts });
  };

  return (
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">
          Condiciones Comerciales Avanzadas
        </h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl">
          Configura opciones de financiamiento, bonos, descuentos y condiciones especiales.
        </p>
      </header>

      {/* Opciones de Financiamiento */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Opciones de Financiamiento
          </h3>
          <Button
            onClick={addFinancingOption}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            + Agregar Opción
          </Button>
        </div>

        {conditions.financing?.map((option, index) => (
          <div key={index} className="grid md:grid-cols-5 gap-4 mb-4 p-4 bg-white dark:bg-gray-800 rounded border">
            <Input
              label="Banco/Entidad"
              value={option.bank}
              onChange={(e) => updateFinancingOption(index, 'bank', e.target.value)}
              placeholder="Banco Estado"
            />
            <Input
              label="Tasa (%)"
              type="number"
              step="0.1"
              value={option.rate}
              onChange={(e) => updateFinancingOption(index, 'rate', parseFloat(e.target.value) || 0)}
              placeholder="5.5"
            />
            <Input
              label="Plazo (meses)"
              type="number"
              value={option.term_months}
              onChange={(e) => updateFinancingOption(index, 'term_months', parseInt(e.target.value) || 12)}
              placeholder="60"
            />
            <Input
              label="Pie (%)"
              type="number"
              value={option.down_payment_percent}
              onChange={(e) => updateFinancingOption(index, 'down_payment_percent', parseFloat(e.target.value) || 20)}
              placeholder="20"
            />
            <div className="flex items-end">
              <Button
                onClick={() => removeFinancingOption(index)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Bonos y Promociones */}
      <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
            Bonos y Promociones
          </h3>
          <Button
            onClick={addBonus}
            variant="outline"
            size="sm"
            className="text-green-600 border-green-300 hover:bg-green-50"
          >
            + Agregar Bono
          </Button>
        </div>

        {conditions.bonuses?.map((bonus, index) => (
          <div key={index} className="grid md:grid-cols-4 gap-4 mb-4 p-4 bg-white dark:bg-gray-800 rounded border">
            <Select
              label="Tipo"
              value={bonus.type}
              onChange={(value) => updateBonus(index, 'type', value)}
              options={[
                { label: 'Efectivo', value: 'cash' },
                { label: 'Accesorio', value: 'accessory' },
                { label: 'Servicio', value: 'service' }
              ]}
            />
            <div className="md:col-span-2">
              <Input
                label="Descripción"
                value={bonus.description}
                onChange={(e) => updateBonus(index, 'description', e.target.value)}
                placeholder="Bono de bienvenida"
              />
            </div>
            {bonus.type === 'cash' && (
              <Input
                label="Valor (CLP)"
                type="number"
                value={bonus.value || ''}
                onChange={(e) => updateBonus(index, 'value', parseInt(e.target.value) || 0)}
                placeholder="50000"
              />
            )}
            <div className="flex items-end">
              <Button
                onClick={() => removeBonus(index)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Descuentos Estructurados */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            Descuentos Estructurados
          </h3>
          <Button
            onClick={addDiscount}
            variant="outline"
            size="sm"
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
          >
            + Agregar Descuento
          </Button>
        </div>

        {conditions.discounts?.map((discount, index) => (
          <div key={index} className="grid md:grid-cols-5 gap-4 mb-4 p-4 bg-white dark:bg-gray-800 rounded border">
            <Select
              label="Tipo"
              value={discount.type}
              onChange={(value) => updateDiscount(index, 'type', value)}
              options={[
                { label: 'Porcentaje', value: 'percentage' },
                { label: 'Monto Fijo', value: 'fixed_amount' }
              ]}
            />
            <Input
              label={discount.type === 'percentage' ? 'Valor (%)' : 'Valor (CLP)'}
              type="number"
              value={discount.value}
              onChange={(e) => updateDiscount(index, 'value', parseFloat(e.target.value) || 0)}
              placeholder={discount.type === 'percentage' ? '10' : '50000'}
            />
            <div className="md:col-span-2">
              <Input
                label="Descripción"
                value={discount.description}
                onChange={(e) => updateDiscount(index, 'description', e.target.value)}
                placeholder="Descuento por pago contado"
              />
            </div>
            <div className="flex items-end gap-2">
              <Input
                label="Válido hasta"
                type="date"
                value={discount.valid_until || ''}
                onChange={(e) => updateDiscount(index, 'valid_until', e.target.value)}
              />
              <Button
                onClick={() => removeDiscount(index)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Condiciones Adicionales */}
      <div className="bg-gray-50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Condiciones Adicionales
        </h3>
        <textarea
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          rows={4}
          value={conditions.additional_conditions || ''}
          onChange={(e) => updateConditions({
            ...conditions,
            additional_conditions: e.target.value
          })}
          placeholder="Especifica cualquier condición especial, términos específicos, o información adicional que los compradores deben conocer..."
        />
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setStep('commercial')}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
        >
          ← Volver a Básico
        </button>
        <button
          type="button"
          onClick={() => setStep('review')}
          className="h-10 px-6 rounded-full text-sm font-semibold shadow-card bg-primary text-white hover:shadow-card-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white"
        >
          Continuar a Revisión
        </button>
      </div>
    </div>
  );
};

export default StepCommercialEnhanced;
