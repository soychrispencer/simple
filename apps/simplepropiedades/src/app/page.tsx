import PropertySearchBox from '@/components/search/PropertySearchBox';
import CategoryFeaturedSlider from '@/components/slider/CategoryFeaturedSlider';

export default async function Home() {

  return (
    <main className="min-h-screen flex flex-col bg-lightbg dark:bg-darkbg">
      {/* Hero con buscador principal */}
      <section className="hero-stack w-full flex flex-col items-center justify-center pb-6">
        <div className="w-full px-4 md:px-8 lg:px-8">
          <div className="relative mb-16">
            <div className="hero-shell hero-card relative w-full text-center">
              <div className="absolute inset-0 bg-lightcard/70 dark:bg-darkcard/70" />
              <div className="hero-content relative z-10 flex flex-col items-center gap-6 text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold text-lighttext dark:text-darktext">
                  <span className="drop-shadow-none">Encuentra tu hogar ideal</span>
                </h1>
                
              </div>
            </div>
            <div className="hero-floating-panel w-full">
              <PropertySearchBox />
            </div>
          </div>
        </div>
      </section>

      {/* Sección de categorías */}
      <section className="w-full px-4 py-16 bg-lightcard/40 dark:bg-darkcard/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-lighttext dark:text-darktext mb-4">
              Explora por Categoría
            </h2>
            <p className="text-lighttext/60 dark:text-darktext/60 max-w-2xl mx-auto">
              Encuentra el tipo de propiedad perfecta para ti, disponible en venta y arriendo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Categoría: Casas */}
            <a
              href="/buscar?property_type=casa"
              className="group card-surface rounded-2xl p-8 shadow-sm hover:shadow-lg ring-1 ring-border/60 hover:ring-[color:var(--color-primary-a20)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary-a20)] dark:group-hover:bg-[var(--color-primary-a30)] transition-colors">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-lighttext dark:text-darktext mb-2 group-hover:text-primary transition-colors">
                  Casas
                </h3>
                <p className="text-lighttext/70 dark:text-darktext/70 text-sm leading-relaxed">
                  Encuentra la casa de tus sueños con jardín, terraza o vista panorámica
                </p>
              </div>
            </a>

            {/* Categoría: Apartamentos */}
            <a
              href="/buscar?property_type=apartamento"
              className="group card-surface rounded-2xl p-8 shadow-sm hover:shadow-lg ring-1 ring-border/60 hover:ring-[color:var(--color-primary-a20)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary-a20)] dark:group-hover:bg-[var(--color-primary-a30)] transition-colors">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-lighttext dark:text-darktext mb-2 group-hover:text-primary transition-colors">
                  Apartamentos
                </h3>
                <p className="text-lighttext/70 dark:text-darktext/70 text-sm leading-relaxed">
                  Vive en el corazón de la ciudad con todas las comodidades modernas
                </p>
              </div>
            </a>

            {/* Categoría: Comercial */}
            <a
              href="/buscar?property_type=comercial"
              className="group card-surface rounded-2xl p-8 shadow-sm hover:shadow-lg ring-1 ring-border/60 hover:ring-[color:var(--color-primary-a20)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary-a20)] dark:group-hover:bg-[var(--color-primary-a30)] transition-colors">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-lighttext dark:text-darktext mb-2 group-hover:text-primary transition-colors">
                  Comercial
                </h3>
                <p className="text-lighttext/70 dark:text-darktext/70 text-sm leading-relaxed">
                  Espacios ideales para tu negocio, oficina o local comercial
                </p>
              </div>
            </a>

            {/* Categoría: Terrenos */}
            <a
              href="/buscar?property_type=terreno"
              className="group card-surface rounded-2xl p-8 shadow-sm hover:shadow-lg ring-1 ring-border/60 hover:ring-[color:var(--color-primary-a20)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary-a20)] dark:group-hover:bg-[var(--color-primary-a30)] transition-colors">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-lighttext dark:text-darktext mb-2 group-hover:text-primary transition-colors">
                  Terrenos
                </h3>
                <p className="text-lighttext/70 dark:text-darktext/70 text-sm leading-relaxed">
                  Construye tu futuro en el terreno perfecto para tu proyecto
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Sliders de Propiedades Destacadas */}
      <CategoryFeaturedSlider listingType="sale" limit={8} slidesPerView={4} />
      <CategoryFeaturedSlider listingType="rent" limit={8} slidesPerView={4} />
      <CategoryFeaturedSlider listingType="auction" limit={8} slidesPerView={4} />

      {/* Sección de características */}
      <section className="w-full px-4 py-16 card-surface">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-lighttext dark:text-darktext mb-12 text-center">
            ¿Por qué SimplePropiedades?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Simple</h3>
              <p className="text-lighttext/70 dark:text-darktext/70">
                Interfaz intuitiva y fácil de usar para encontrar tu propiedad ideal
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Rápido</h3>
              <p className="text-lighttext/70 dark:text-darktext/70">
                Publica tu propiedad en minutos y empieza a recibir ofertas
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Seguro</h3>
              <p className="text-lighttext/70 dark:text-darktext/70">
                Verificamos cada publicación para garantizar tu seguridad
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
