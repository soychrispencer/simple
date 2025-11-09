import PropertyCard from "@/components/PropertyCard";
import Filters from "@/components/Filters";

export default function PropiedadesPage() {
  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Propiedades</h1>

        {/* Filtros */}
        <div className="mb-8">
          <Filters />
        </div>

        {/* Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PropertyCard />
          <PropertyCard />
          <PropertyCard />
          <PropertyCard />
          <PropertyCard />
          <PropertyCard />
        </div>

        {/* Paginación */}
        <div className="mt-12 flex justify-center">
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border border-lightborder dark:border-darkborder hover:bg-lightbg dark:hover:bg-darkbg transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 rounded-lg bg-primary text-white">1</button>
            <button className="px-4 py-2 rounded-lg border border-lightborder dark:border-darkborder hover:bg-lightbg dark:hover:bg-darkbg transition-colors">
              2
            </button>
            <button className="px-4 py-2 rounded-lg border border-lightborder dark:border-darkborder hover:bg-lightbg dark:hover:bg-darkbg transition-colors">
              3
            </button>
            <button className="px-4 py-2 rounded-lg border border-lightborder dark:border-darkborder hover:bg-lightbg dark:hover:bg-darkbg transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}