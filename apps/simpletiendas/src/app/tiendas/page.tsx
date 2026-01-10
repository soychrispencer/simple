import { Suspense } from "react";
import StoreSearchResults from "@/components/search/StoreSearchResults";

export default function TiendasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <StoreSearchResults />
    </Suspense>
  );
}
