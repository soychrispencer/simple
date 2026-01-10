'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Select, Input, SearchBoxLayout } from '@simple/ui';

const modes = [
  { value: 'todos', label: 'Todos' },
  { value: 'productos', label: 'Productos' },
  { value: 'servicios', label: 'Servicios' },
];

const categories = [
  { value: '', label: 'Categoría' },
  { value: 'moda', label: 'Moda' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'belleza', label: 'Belleza' },
];

const fulfillment = [
  { value: '', label: 'Fulfillment' },
  { value: 'retirarloja', label: 'Retiro en tienda' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'omnicanal', label: 'Omnicanal' },
];

const cities = [
  { value: '', label: 'Ciudad' },
  { value: 'santiago', label: 'Santiago' },
  { value: 'lima', label: 'Lima' },
  { value: 'ciudad-de-mexico', label: 'Ciudad de México' },
  { value: 'bogota', label: 'Bogotá' },
];

export function StoreSearchBox() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    mode: 'todos',
    category: '',
    fulfillment: '',
    city: '',
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
    router.push(qs ? `/tiendas?${qs}` : '/tiendas');
  };

  return (
    <SearchBoxLayout
      tabs={modes.map((mode) => ({ ...mode, className: 'min-w-[110px]' }))}
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
            placeholder={`Buscar ${
              filters.mode === 'productos'
                ? 'productos'
                : filters.mode === 'servicios'
                ? 'servicios'
                : 'tiendas y servicios'
            }...`}
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
          />
          <Select
            value={filters.category}
            onChange={(value) => setFilters((prev) => ({ ...prev, category: String(value) }))}
            options={categories}
          />
          <Select
            value={filters.fulfillment}
            onChange={(value) => setFilters((prev) => ({ ...prev, fulfillment: String(value) }))}
            options={fulfillment}
          />
          <Select
            value={filters.city}
            onChange={(value) => setFilters((prev) => ({ ...prev, city: String(value) }))}
            options={cities}
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

export default StoreSearchBox;
