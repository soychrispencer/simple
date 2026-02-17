"use client";
import React from "react";
import ProfileCoverCropper from "./ProfileCoverCropper";
import { IconPlus, IconX } from '@tabler/icons-react';
import { useToast } from "../toast/ToastProvider";
import { useSupabase } from "../../../lib/supabase";
import { uploadPortada, deletePortada, getPortadaUrl } from "../../../lib/storage";
import { useAuth } from "@simple/auth";
// import duplicado eliminado

export default function ProfileCoverUploader({ cropOpen, setCropOpen }: { cropOpen?: boolean, setCropOpen?: (open: boolean) => void }) {
  const { addToast } = useToast();
  const supabase = useSupabase();
  const { user, refresh } = useAuth();
  const [cover, setCover] = React.useState<{ url: string; blob: Blob | null } | null>(null);
  const [internalCropOpen, internalSetCropOpen] = React.useState(false);
  // Si se pasan props externas, usarlas, si no, usar estado interno
  const isControlled = typeof cropOpen === 'boolean' && typeof setCropOpen === 'function';
  const open = isControlled ? cropOpen : internalCropOpen;
  const setOpen = isControlled ? setCropOpen! : internalSetCropOpen;
  const [src, setSrc] = React.useState<string | null>(null);

  // Cargar cover actual al montar (cover_url)
  React.useEffect(() => {
    async function loadCover() {
      const path = (user as any)?.cover_url;
      if (path) {
        const url = path.startsWith('http') ? path : (path ? getPortadaUrl(supabase, path) : null);
        if (url) setCover({ url, blob: null });
        return;
      }

      if (!user?.id) return;
      const { data } = await supabase
        .from('public_profiles')
        .select('cover_url')
        .eq('owner_profile_id', user.id)
        .maybeSingle();
      const p = data?.cover_url;
      if (!p) return;
      const url = p.startsWith?.('http') ? p : getPortadaUrl(supabase, p);
      if (url) setCover({ url, blob: null });
    }
    loadCover();
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
      const { data: publicProfile, error: publicErr } = await supabase
        .from('public_profiles')
        .select('id, cover_url, slug')
        .eq('owner_profile_id', user.id)
        .maybeSingle();
      if (publicErr) throw new Error(publicErr.message);
      const file = new File([blob], `portada-${user.id}.webp`, { type: 'image/webp' });
      const path = await uploadPortada(supabase, file, user.id);
      if (!path) {
        throw new Error('No se recibió la ruta de la portada subida');
      }

      if (publicProfile?.cover_url && publicProfile.cover_url !== path) {
        await deletePortada(supabase, publicProfile.cover_url);
      }

      if (publicProfile?.id) {
        const { error: updateError } = await supabase
          .from('public_profiles')
          .update({ cover_url: path })
          .eq('id', publicProfile.id);
        if (updateError) throw updateError;
      } else {
        const slug = publicProfile?.slug || (user as any)?.username || user.id;
        const { error: insertError } = await supabase
          .from('public_profiles')
          .insert({ owner_profile_id: user.id, profile_type: 'business', slug, cover_url: path });
        if (insertError) throw insertError;
      }

      const publicUrl = path.startsWith('http') ? path : getPortadaUrl(supabase, path);
      setCover({ url: publicUrl, blob: null });

      if (typeof refresh === "function") {
        await refresh(true);
      }
      addToast("Portada actualizada", { type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('cover upload error', err, { message: (err as any)?.message, status: (err as any)?.status, code: (err as any)?.code });
      addToast(`Error al actualizar portada: ${msg}`, { type: "error" });
    }
  };
  return (
    <div className="absolute left-0 top-0 w-full z-10 flex flex-col items-center">
      <div className="w-full aspect-[32/10] md:aspect-[32/9] bg-[var(--field-bg)] overflow-hidden border border-[var(--field-border)] group relative rounded-[var(--card-radius)]">
        {cover?.url ? (
          <img src={cover.url} alt="portada" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg text-lighttext dark:text-darktext">Sin portada</span>
          </div>
        )}
      </div>
      {/* Botón + en la esquina inferior derecha de la portada */}
  	  <label className="absolute bottom-3 right-3 card-surface card-surface-raised bg-[var(--field-bg)] hover:bg-[var(--field-bg-hover)] text-[var(--field-text)] rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-150 pointer-events-auto z-30">
        <input id="cover-file-inline" type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <IconPlus size={16} className="text-[var(--field-text)]" />
      </label>
      {/* Botón X para eliminar en la esquina superior derecha de la portada */}
      {cover && (
        <button
          type="button"
          className="absolute top-3 right-3 bg-[var(--color-danger)] hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] rounded-full w-7 h-7 flex items-center justify-center shadow-md transition-opacity duration-150 pointer-events-auto z-30"
          onClick={async () => {
            if (cover?.url && typeof cover.url !== "string") URL.revokeObjectURL(cover.url);
            setCover(null);
            // Eliminado almacenamiento local
            setSrc(null);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                // Obtener el path actual de la portada
                const { data, error } = await supabase
                  .from('public_profiles')
                  .select('id, cover_url')
                  .eq('owner_profile_id', user.id)
                  .maybeSingle();
                if (error) throw error;
                if (data?.cover_url) await deletePortada(supabase, data.cover_url);
                if (data?.id) {
                  await supabase.from('public_profiles').update({ cover_url: null }).eq('id', data.id);
                }
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







