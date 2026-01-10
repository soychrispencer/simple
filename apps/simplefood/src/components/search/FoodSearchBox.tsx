'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Select, Input, SearchBoxLayout } from '@simple/ui';

const orderModes = [
  { value: 'todos', label: 'Todos' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Retiro' },
  { value: 'suscripcion', label: 'Planes' },
];

const cuisines = [
  { value: '', label: 'Cocina' },
  { value: 'fusion', label: 'Fusión' },
  { value: 'vegana', label: 'Vegana' },
  { value: 'regional', label: 'Regional' },
  { value: 'fast-casual', label: 'Fast casual' },
];

const serviceWindows = [
  { value: '', label: 'Horario' },
  { value: 'manana', label: 'Mañana' },
  { value: 'mediodia', label: 'Almuerzo' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Cena' },
];

const sectors = [
  { value: '', label: 'Sector' },
  { value: 'centro', label: 'Centro' },
  { value: 'empresarial', label: 'Distritos empresariales' },
  { value: 'residencial', label: 'Residencial' },
  { value: 'costero', label: 'Costero' },
];

export function FoodSearchBox() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    mode: 'todos',
    cuisine: '',
    schedule: '',
    sector: '',
    keyword: '',
  });

  const handleSubmit = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      if (key === 'mode' && value === 'todos') return;
      params.append(key, value);
    });
    const qs = params.toString();
    router.push(qs ? `/restaurantes?${qs}` : '/restaurantes');
  };

  return (
    <SearchBoxLayout
      tabs={orderModes.map((mode) => ({ ...mode, className: 'min-w-[110px]' }))}
      activeTab={filters.mode}
      onTabChange={(value) => setFilters((prev) => ({ ...prev, mode: value }))}
      panelProps={{
        as: 'form',
        onSubmit: (event) => {
          event.preventDefault();
          handleSubmit();
        },
      }}
    >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-1 md:gap-2 items-center grid-equal-cols">
          <Input
            type="text"
            placeholder="Buscar restaurantes, cocinas cloud..."
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
          />
          <Select
            value={filters.cuisine}
            onChange={(value) => setFilters((prev) => ({ ...prev, cuisine: String(value) }))}
            options={cuisines}
          />
          <Select
            value={filters.schedule}
            onChange={(value) => setFilters((prev) => ({ ...prev, schedule: String(value) }))}
            options={serviceWindows}
          />
          <Select
            value={filters.sector}
            onChange={(value) => setFilters((prev) => ({ ...prev, sector: String(value) }))}
            options={sectors}
          />
          <div className="flex gap-2">
            <Button className="w-full" type="submit">
              Buscar
            </Button>
          </div>
        </div>
    </SearchBoxLayout>
  );
}

export default FoodSearchBox;
