import { Suspense } from "react";
import FoodSearchResults from "@/components/search/FoodSearchResults";

export const metadata = {
  title: "Todos los restaurantes | SimpleFood",
  description: "Explora la oferta completa de restaurantes, dark kitchens y franquicias digitales del ecosistema SimpleFood.",
};

export default function RestaurantesPage() {
  return (
    <main className="min-h-screen bg-lightbg dark:bg-darkbg">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-lighttext/60 dark:text-darktext/60">Cargando catálogo...</p>
            </div>
          </div>
        }
      >
        <FoodSearchResults />
      </Suspense>
    </main>
  );
}
