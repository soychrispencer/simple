"use client";
import SearchBox from "@/components/search/SearchBox";
import CategoryFeaturedSlider from "@/components/slider/CategoryFeaturedSlider";

export default function Home() {

  return (
  <main className="min-h-screen flex flex-col">
      {/* Hero con buscador principal */}
  <section className="hero-stack w-full flex flex-col items-center justify-center pb-6">
        <div className="w-full px-4 md:px-8 lg:px-8">
          <div className="relative mb-16">
            <div className="hero-shell hero-card relative w-full text-center">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[url('/hero-cars.jpg')] bg-cover bg-center animate-hero-zoom will-change-transform" />
                <div className="absolute inset-0 bg-[var(--overlay-scrim-60)] dark:bg-[var(--overlay-scrim-70)] backdrop-blur-[1px]" />
              </div>
              <div className="hero-content relative z-10 flex flex-col items-center gap-6 text-center text-[var(--color-on-primary)]">
                <h1 className="type-display-hero text-[var(--color-on-primary)]">
                  <span className="drop-shadow-none">Encuentra el vehículo perfecto</span>
                </h1>
                
              </div>
            </div>
              <div className="hero-floating-panel w-full">
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







