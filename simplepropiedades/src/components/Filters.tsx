import React from "react";

// Icon components
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconFilter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Filters() {
  return (
    <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card p-6 w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar ubicación..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lighttext/40 dark:text-darktext/40">
            <IconSearch />
          </div>
        </div>
        <select className="px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg">
          <option>Tipo de propiedad</option>
          <option>Casa</option>
          <option>Departamento</option>
        </select>
        <select className="px-4 py-3 rounded-lg border border-lightborder dark:border-darkborder bg-lightbg dark:bg-darkbg">
          <option>Operación</option>
          <option>Venta</option>
          <option>Arriendo</option>
        </select>
        <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <IconFilter />
          <span>Buscar</span>
        </button>
      </div>
    </div>
  );
}