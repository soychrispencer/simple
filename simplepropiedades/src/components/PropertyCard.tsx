import React from "react";

// Icon components
const IconLocation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="w-4 h-4">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const IconHeart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="w-4 h-4">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PropertyCard() {
  return (
    <div className="bg-lightcard dark:bg-darkcard rounded-xl shadow-card p-4 hover:shadow-card-hover transition-shadow cursor-pointer">
      <div className="relative">
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
        <button className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-black/50 rounded-full hover:bg-white dark:hover:bg-black/70 transition-colors">
          <IconHeart />
        </button>
      </div>
      <h3 className="text-lg font-semibold mb-2">Propiedad de Ejemplo</h3>
      <div className="flex items-center gap-1 text-sm text-lighttext/60 dark:text-darktext/60 mb-2">
        <IconLocation />
        <span>Santiago, Chile</span>
      </div>
      <p className="text-xl font-bold text-primary">$1.000.000</p>
    </div>
  );
}