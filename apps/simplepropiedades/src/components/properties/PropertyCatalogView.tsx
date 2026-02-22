import { Suspense } from "react";
import PropertyAdvancedFilters from "@/components/filters/PropertyAdvancedFilters";
import PropertySearchResults from "@/components/search/PropertySearchResults";

interface PropertyCatalogViewProps {
  defaultListingType?: "sale" | "rent" | "all" | "todos";
}

type ListingFilter = "sale" | "rent";

export default async function PropertyCatalogView({ defaultListingType = "all" }: PropertyCatalogViewProps) {
  const normalizedDefault = (defaultListingType === "todos" ? "all" : defaultListingType) as ListingFilter | "all";
  const initialData = { properties: [], count: 0 };

  return (
    <div className="w-full px-4 md:px-8 lg:px-8">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row gap-8 pb-10">
        <div className="w-full md:w-64 flex-shrink-0">
          <PropertyAdvancedFilters defaultListingType={defaultListingType} />
        </div>
        <div className="flex-1 min-w-0">
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-lighttext/60 dark:text-darktext/60">Cargando propiedades...</p>
                </div>
              </div>
            }
          >
            <PropertySearchResults
              defaultListingType={normalizedDefault}
              initialProperties={initialData.properties}
              initialCount={initialData.count}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
