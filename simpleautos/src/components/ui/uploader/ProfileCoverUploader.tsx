"use client";
import React from "react";
import { useSupabase } from "@/lib/supabase/useSupabase";
import ProfileCoverCropper from "./ProfileCoverCropper";
// Button eliminado (no usado)
import { IconPlus, IconX } from '@tabler/icons-react';
import { useToast } from "@/components/ui/toast/ToastProvider";
// Eliminado uso de localStorage (getJSON/setJSON/remove)
import { uploadPortada, deletePortada, getPortadaUrl } from "@/lib/supabaseStorage";
import { useAuth } from "@/context/AuthContext";
// import duplicado eliminado

export default function ProfileCoverUploader({ cropOpen, setCropOpen }: { cropOpen?: boolean, setCropOpen?: (open: boolean) => void }) {
  const { addToast } = useToast();
  const supabase = useSupabase();
  const { user } = useAuth();
  const [cover, setCover] = React.useState<{ url: string; blob: Blob | null } | null>(null);
  const [internalCropOpen, internalSetCropOpen] = React.useState(false);
  // Si se pasan props externas, usarlas, si no, usar estado interno
  const isControlled = typeof cropOpen === 'boolean' && typeof setCropOpen === 'function';
  const open = isControlled ? cropOpen : internalCropOpen;
  const setOpen = isControlled ? setCropOpen! : internalSetCropOpen;
  const [src, setSrc] = React.useState<string | null>(null);

  // Cargar cover actual al montar (cover_url)
  React.useEffect(() => {
    const path = (user as any)?.cover_url;
    if (!path) return;
    const url = path.startsWith('http') ? path : (path ? getPortadaUrl(supabase, path) : null);
    if (url) setCover({ url, blob: null });
  }, [user?.cover_url, supabase, user]);

  // Eliminado efecto de restauración desde localStorage

  const openFor = (file: File) => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setOpen(true);
  };
  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (f) openFor(f);
  };
  const onCropped = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const view = { url, blob };
    if (cover?.url && typeof cover.url !== "string") URL.revokeObjectURL(cover.url);
    setCover(view);
    // Subir a Supabase y actualizar el perfil
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      // Housekeeping: obtener portada previa para borrarla después de subir la nueva
      const { data: oldData } = await supabase.from('profiles').select('cover_url').eq('id', user.id).single();
      const file = new File([blob], `portada-${user.id}.webp`, { type: 'image/webp' });
      const path = await uploadPortada(supabase, file, user.id);
      if (path) {
        // Solo borrar la anterior si la nueva se subió correctamente
        if (oldData?.cover_url && oldData.cover_url !== path) {
          await deletePortada(supabase, oldData.cover_url);
        }
        await supabase.from('profiles').update({ cover_url: path }).eq('id', user.id);
      }
      addToast("Portada actualizada", { type: "success" });
    } catch {
      addToast("Error al actualizar portada en el perfil público", { type: "error" });
    }
  };
  return (
    <div className="absolute left-0 top-0 w-full z-10 flex flex-col items-center">
      <div className="w-full aspect-[32/10] md:aspect-[32/9] rounded-2xl bg-lightbg dark:bg-darkbg overflow-hidden shadow-2xl group relative">
        {cover?.url ? (
          <img src={cover.url} alt="portada" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg text-lighttext dark:text-darktext">Sin portada</span>
          </div>
        )}
      </div>
      {/* Botón + en la esquina inferior derecha de la portada */}
      <label className="absolute bottom-3 right-3 bg-white hover:bg-gray-200 text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg cursor-pointer border border-gray-300 transition-all duration-150 pointer-events-auto z-30">
        <input id="cover-file-inline" type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <IconPlus size={16} className="text-black" />
      </label>
      {/* Botón X para eliminar en la esquina superior derecha de la portada */}
      {cover && (
        <button
          type="button"
          className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md border border-red-700/30 transition-all duration-150 pointer-events-auto z-30"
          onClick={async () => {
            if (cover?.url && typeof cover.url !== "string") URL.revokeObjectURL(cover.url);
            setCover(null);
            // Eliminado almacenamiento local
            setSrc(null);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                // Obtener el path actual de la portada
                const { data } = await supabase.from('profiles').select('cover_url').eq('id', user.id).single();
                if (data?.cover_url) await deletePortada(supabase, data.cover_url);
                await supabase.from('profiles').update({ cover_url: null }).eq('id', user.id);
              }
              } catch {}
            addToast("Eliminada con éxito", { type: "success" });
            // Para reflejar globalmente, un refreshAuth(true) externo puede emplearse si es necesario.
          }}
          aria-label="Eliminar portada"
        >
          <IconX size={13} />
        </button>
      )}
      <ProfileCoverCropper
        open={open}
        onClose={() => setOpen(false)}
        imageSrc={src}
        onCropped={onCropped}
      />
    </div>
  );
}
