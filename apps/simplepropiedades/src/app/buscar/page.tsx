import { Suspense } from "react";
import PropertyCatalogView from "@/components/properties/PropertyCatalogView";

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando propiedades...</div>}>
      <PropertyCatalogView defaultListingType="sale" />
    </Suspense>
  );
}