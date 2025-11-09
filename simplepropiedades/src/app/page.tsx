"use client";
import PropertyCard from "@/components/PropertyCard";
import Filters from "@/components/Filters";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-lightbg dark:bg-darkbg">
      {/* Hero con buscador principal */}
      <section className="w-full flex flex-col items-center justify-center pb-4">
        <div className="w-full px-4 md:px-8 lg:px-8">
          <div className="relative mb-16">
            <div className="relative w-full bg-white dark:bg-darkcard rounded-3xl shadow-card hover:shadow-card-hover transition ring-1 ring-black/5 dark:ring-white/5 overflow-hidden flex flex-col items-center justify-center min-h-[420px] md:min-h-[520px] px-6 md:px-32 pb-16 md:pb-24">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[url('/assets/hero-propiedades.svg')] bg-cover bg-center animate-hero-zoom will-change-transform" />
                <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-[1px]" />
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-extrabold mb-2 text-center text-white">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">Encuentra la propiedad perfecta</span>
                </h1>
                <p className="text-lg text-white/80 mb-6 text-center font-medium max-w-2xl">
                  Simple, rápido y seguro. Publica o encuentra propiedades con total confianza.
                </p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 w-full max-w-4xl z-30 px-4">
              <Filters />
            </div>
          </div>
        </div>
      </section>

      {/* Listado de propiedades destacadas */}
      <div className="space-y-12 px-4 md:px-8 lg:px-8">
        {/* Propiedades en Venta */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Propiedades en Venta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Placeholder para PropertyCard */}
            <PropertyCard />
            <PropertyCard />
            <PropertyCard />
          </div>
        </section>

        {/* Propiedades en Arriendo */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Propiedades en Arriendo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PropertyCard />
            <PropertyCard />
            <PropertyCard />
          </div>
        </section>
      </div>
    </main>
  );
}