import { Suspense } from "react";
import PropertyCatalogView from "@/components/properties/PropertyCatalogView";

export default function ArriendosPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando arriendos...</div>}>
      <PropertyCatalogView defaultListingType="rent" />
    </Suspense>
  );
}
