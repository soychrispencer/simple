"use client";
import React from "react";

interface SearchResultsProps {
  data: any[];
}

export default function SearchResults({ data }: SearchResultsProps) {
  if (!data || data.length === 0) return <div className="p-4 text-center text-sm text-muted">No se encontraron resultados</div>;
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item: any) => (
        <div key={item.id} className="card-surface shadow-card rounded-lg p-4">
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-sm text-muted">{item.price ? `${item.price}` : 'Precio no disponible'}</p>
          <p className="text-sm text-muted">{item.regions?.name || ''} {item.communes?.name ? `· ${item.communes.name}` : ''}</p>
        </div>
      ))}
    </div>
  );
}
