import { Suspense } from "react";
import PropertyCatalogView from "@/components/properties/PropertyCatalogView";

export default function PropiedadesArriendoPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando propiedades...</div>}>
      <PropertyCatalogView defaultListingType="rent" />
    </Suspense>
  );
}
