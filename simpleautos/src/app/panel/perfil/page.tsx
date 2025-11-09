"use client";
import React from "react";
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ui/toast/ToastProvider";
import { Button } from "@/components/ui/Button";
import ProfileCoverUploader from "@/components/ui/uploader/ProfileCoverUploader";
import PersonalDataForm from "@/components/panel/perfil/PersonalDataForm";
import CompanyDataForm from "@/components/panel/perfil/CompanyDataForm";
import PublicPageForm from "@/components/panel/perfil/PublicPageForm";
import { useAuth } from "@/context/AuthContext";
import CircleButton from "@/components/ui/CircleButton";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { IconEye, IconChartBar, IconEyeCheck, IconCircleCheck, IconClock, IconCalendar, IconShieldCheck, IconBuilding, IconWorld } from "@tabler/icons-react";
// Eliminado getJSON y cualquier uso de localStorage

export default function Perfil() {
  const { addToast } = useToast();
  const router = useRouter();
  const { user, refresh: refreshAuth, loading } = useAuth();
  const [coverCropOpen, setCoverCropOpen] = React.useState(false);
  React.useEffect(() => {
    if (!loading && !user?.id) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Calcular completitud del perfil usando todos los campos de datos personales
  const camposPersonales = [
    user?.first_name,
    user?.last_name,
    user?.rut,
    user?.birth_date,
    user?.gender,
    user?.occupation,
    user?.nationality,
    user?.phone,
    user?.email,
    user?.address,
    user?.region_id,
    user?.commune_id
  ];

  // Calcular completitud por secciones (opcional)
  const completadosPersonales = camposPersonales.filter(c => c && String(c).trim().length > 0).length;
  const porcentajePersonales = Math.round((completadosPersonales / camposPersonales.length) * 100);

  // Completitud de empresa (opcional - solo si tiene empresa)
  const camposEmpresa = user?.empresa ? [
    user.empresa.legal_name,
    user.empresa.tax_id,
    user.empresa.business_activity,
    user.empresa.address,
    user.empresa.region_id,
    user.empresa.commune_id,
    user.empresa.phone,
    user.empresa.email
  ] : [];
  const completadosEmpresa = camposEmpresa.filter(c => c && String(c).trim().length > 0).length;
  const porcentajeEmpresa = camposEmpresa.length > 0 ? Math.round((completadosEmpresa / camposEmpresa.length) * 100) : null;

  // Completitud de página pública (opcional - solo si tiene username)
  const camposPagina = user?.username ? [
    user.public_name,
    user.website,
    user.description,
    user.address,
    user.region_id,
    user.commune_id
  ] : [];
  const completadosPagina = camposPagina.filter(c => c && String(c).trim().length > 0).length;
  const porcentajePagina = camposPagina.length > 0 ? Math.round((completadosPagina / camposPagina.length) * 100) : null;

  // Completitud total (promedio ponderado)
  const totalCampos = camposPersonales.length;
  const completados = completadosPersonales;
  const porcentaje = Math.round((completados / totalCampos) * 100);

  // Eliminado copyPublicUrl no usado actualmente

  // Refrescar datos globales tras guardar perfil
  const handleProfileSave = async () => {
    const currentTab = activeTab;
    await refreshAuth(true);
    setActiveTab(currentTab);
  };

  // Mostrar el nombre desde profile o desde los metadatos si no existe
  // name local eliminado (no usado)
   const [activeTab, setActiveTab] = React.useState<'perfil' | 'empresa' | 'pagina'>(() => {
     if (typeof window !== 'undefined') {
       return (localStorage.getItem('perfilActiveTab') as 'perfil' | 'empresa' | 'pagina') || 'perfil';
     }
     return 'perfil';
   });

   return (
     <PanelPageLayout
       header={{
         title: "Mi Perfil",
         description: "Gestiona tus datos personales, información de empresa y página pública.",
         actions: (
           <div className="flex items-center gap-2">
             <Button
               variant={activeTab === 'perfil' ? 'primary' : 'neutral'}
               size="md"
               onClick={() => {
                 setActiveTab('perfil');
                 if (typeof window !== 'undefined') localStorage.setItem('perfilActiveTab', 'perfil');
               }}
             >
               Datos Personales
             </Button>
             <Button
               variant={activeTab === 'empresa' ? 'primary' : 'neutral'}
               size="md"
               onClick={() => {
                 setActiveTab('empresa');
                 if (typeof window !== 'undefined') localStorage.setItem('perfilActiveTab', 'empresa');
               }}
             >
               Mi Empresa
             </Button>
             <Button
               variant={activeTab === 'pagina' ? 'primary' : 'neutral'}
               size="md"
               onClick={() => {
                 setActiveTab('pagina');
                 if (typeof window !== 'undefined') localStorage.setItem('perfilActiveTab', 'pagina');
               }}
             >
               Mi Página
             </Button>
             <CircleButton
               aria-label="Ver Página"
               variant="default"
               size={40}
               onClick={() => {
                 if (user?.username) {
                   router.push(`/perfil/${user.username}`);
                 } else {
                   addToast('Agrega un nombre de usuario para activar tu perfil público.', { type: 'info' });
                 }
               }}
             >
               <IconEye size={20} stroke={1} />
             </CircleButton>
           </div>
         ),
         children: (
           <div className="flex justify-between items-center gap-3 w-full flex-wrap">
             {/* Completitud General */}
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
               <IconChartBar className="text-primary" size={16} stroke={1.5} />
               <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Perfil</span>
               <span className="text-sm font-bold text-lighttext dark:text-darktext">{porcentaje}%</span>
             </div>

             {/* Completitud Empresa (solo si tiene empresa) */}
             {porcentajeEmpresa !== null && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
                 <IconBuilding className="text-blue-600 dark:text-blue-400" size={16} stroke={1.5} />
                 <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Empresa</span>
                 <span className="text-sm font-bold text-lighttext dark:text-darktext">{porcentajeEmpresa}%</span>
               </div>
             )}

             {/* Completitud Página (solo si tiene username) */}
             {porcentajePagina !== null && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
                 <IconWorld className="text-green-600 dark:text-green-400" size={16} stroke={1.5} />
                 <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Página</span>
                 <span className="text-sm font-bold text-lighttext dark:text-darktext">{porcentajePagina}%</span>
               </div>
             )}
             
             {/* Visitas */}
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
               <IconEyeCheck className="text-blue-600 dark:text-blue-400" size={16} stroke={1.5} />
               <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Visitas</span>
               <span className="text-sm font-bold text-lighttext dark:text-darktext">{user?.visitas ?? 0}</span>
             </div>
             
             {/* Estado */}
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
               <IconCircleCheck className={user?.username ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'} size={16} stroke={1.5} />
               <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Estado</span>
               <span className={`text-sm font-bold ${user?.username ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                 {user?.username ? 'Público' : 'Privado'}
               </span>
             </div>
             
             {/* Actualizado */}
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
               <IconClock className="text-primary" size={16} stroke={1.5} />
               <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Actualizado</span>
               <span className="text-sm font-bold text-lighttext dark:text-darktext">
                 {user?.updated_at ? new Date(user.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'N/A'}
               </span>
             </div>
             
             {/* Miembro desde */}
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
               <IconCalendar className="text-gray-600 dark:text-gray-400" size={16} stroke={1.5} />
               <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Miembro</span>
               <span className="text-sm font-bold text-lighttext dark:text-darktext">
                 {user?.created_at ? new Date(user.created_at).getFullYear() : 'N/A'}
               </span>
             </div>
             
             {/* Verificación */}
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-darkcard border border-lightborder/20 dark:border-darkborder/20 hover:shadow-sm transition-shadow">
               <IconShieldCheck className={user?.verified || user?.email_verified ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'} size={16} stroke={1.5} />
               <span className="text-xs font-medium text-lighttext/60 dark:text-darktext/60">Verificado</span>
               <span className={`text-sm font-bold ${user?.verified || user?.email_verified ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                 {user?.verified || user?.email_verified ? 'Sí' : 'No'}
               </span>
             </div>
           </div>
         )
       }}
     >
         {/* Portada visual y avatar solo en Mi Página */}
         {activeTab === 'pagina' && (
           <section className="relative w-full aspect-[32/10] md:aspect-[32/9] rounded-2xl overflow-hidden group shadow-token-lg mt-6">
             <ProfileCoverUploader cropOpen={coverCropOpen} setCropOpen={setCoverCropOpen} />
             {/* Avatar movido a la preview en PublicPageForm */}
           </section>
         )}
         {/* Formularios según pestaña activa */}
         <div className="w-full mt-8">
           {activeTab === 'perfil' && <PersonalDataForm user={user} onSave={handleProfileSave} />}
           {activeTab === 'empresa' && (
             <CompanyDataForm empresa={{ ...(user?.empresa || {}), user_id: user?.user_id || user?.id }} onSave={handleProfileSave} />
           )}
           {activeTab === 'pagina' && (
             <PublicPageForm
               user={{
                 ...user,
                 user_id: user?.user_id || user?.id
               }}
               onSave={handleProfileSave}
               coverModalOpen={coverCropOpen}
             />
           )}
         </div>
     </PanelPageLayout>
  );
}
