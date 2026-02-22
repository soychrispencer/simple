"use client";
import React from "react";
import { useRouter } from 'next/navigation';
import PersonalDataForm from "@/components/panel/perfil/PersonalDataForm";
import { useAuth } from "@/context/AuthContext";
import { PanelPageLayout } from "@simple/ui";
// Eliminado getJSON y cualquier uso de localStorage

export default function Perfil() {
  const router = useRouter();
  const { user, refresh: refreshAuth, loading } = useAuth();
  React.useEffect(() => {
    if (!loading && !user?.id) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Refrescar datos globales tras guardar perfil
  const handleProfileSave = async () => {
    await refreshAuth(true);
  };

   return (
     <PanelPageLayout
       header={{
         title: "Mi Perfil",
         description: "Gestiona los datos básicos de tu cuenta (perfil privado).",
       }}
     >
         <div className="w-full mt-8" id="datos-personales">
          <div className="card-surface shadow-card p-6">
            <PersonalDataForm user={user} onSave={handleProfileSave} />
          </div>
        </div>
     </PanelPageLayout>
  );
}







