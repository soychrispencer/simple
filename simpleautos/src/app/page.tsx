"use client";
import SearchBox from "@/components/search/SearchBox";
import FeaturedVehiclesSlider from "@/components/slider/FeaturedVehiclesSlider";
import CategoryFeaturedSlider from "@/components/slider/CategoryFeaturedSlider";

export default function Home() {

  return (
  <main className="min-h-screen flex flex-col bg-lightbg dark:bg-darkbg">
      {/* Hero con buscador principal */}
  <section className="w-full flex flex-col items-center justify-center pb-4">
        <div className="w-full px-4 md:px-8 lg:px-8">
          <div className="relative mb-16">
            <div className="relative w-full bg-white dark:bg-darkcard rounded-3xl shadow-card hover:shadow-card-hover transition ring-1 ring-black/5 dark:ring-white/5 overflow-hidden flex flex-col items-center justify-center min-h-[420px] md:min-h-[520px] px-6 md:px-32 pb-16 md:pb-24">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[url('/hero-cars.jpg')] bg-cover bg-center animate-hero-zoom will-change-transform" />
                <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-[1px]" />
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-extrabold mb-2 text-center text-white">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">Encuentra el vehículo perfecto</span>
                </h1>
                <p className="text-lg text-white/80 mb-6 text-center font-medium max-w-2xl">
                  Simple, rápido y seguro. Publica o encuentra autos con total confianza.
                </p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 w-full max-w-4xl z-30 px-4">
              <SearchBox showListType />
            </div>
          </div>
        </div>
      </section>



      {/* Sliders de vehículos por tipo de publicación */}
      <div className="space-y-12 px-4 md:px-8 lg:px-8">
        {/* Vehículos en Venta */}
        <CategoryFeaturedSlider listingType="sale" limit={12} />

        {/* Vehículos en Arriendo */}
        <CategoryFeaturedSlider listingType="rent" limit={12} />

        {/* Vehículos en Subasta */}
        <CategoryFeaturedSlider listingType="auction" limit={12} />
      </div>

    </main>
  );
}
