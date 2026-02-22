"use client";
import React from "react";
import ProfileAvatarCropper from "./ProfileAvatarCropper";
import { IconPlus, IconX, IconUser } from '@tabler/icons-react';
import { CircleButton, useToast } from "@simple/ui";
import { uploadAvatar, deleteAvatar, getAvatarUrl } from "@/lib/storageMedia";
import { useAuth } from "@/context/AuthContext";
import { logError } from "@/lib/logger";

export default function ProfileAvatarUploader({ hide = false, noBorder = false, inline = false }: { hide?: boolean, noBorder?: boolean, inline?: boolean }) {
  const { user, refresh: refreshAuth } = useAuth();
  const { addToast } = useToast();
  const [avatar, setAvatar] = React.useState<{ url: string; blob: Blob | null } | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function loadAvatar() {
      const directPath = (user as any)?.avatar_url;
      if (directPath) {
        const url = directPath.startsWith?.('http') ? directPath : getAvatarUrl(null, directPath);
        if (url && active) setAvatar({ url, blob: null });
        return;
      }

      const response = await fetch('/api/profile/avatar', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!active || !response.ok) return;
      const path = String((payload as any)?.avatar_url || '').trim();
      if (!path) return;
      const url = path.startsWith('http') ? path : getAvatarUrl(null, path);
      if (url && active) {
        setAvatar({ url, blob: null });
      }
    }

    void loadAvatar();
    return () => {
      active = false;
    };
  }, [user?.avatar_url]);

  React.useEffect(() => {
    return () => {
      if (avatar?.url) URL.revokeObjectURL(avatar.url);
    };
  }, [avatar?.url]);

  const openFor = (file: File) => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCropOpen(true);
  };

  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (f) openFor(f);
  };

  const onCropped = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const view = { url, blob };
    if (avatar?.url) URL.revokeObjectURL(avatar.url);
    setAvatar(view);

    try {
      if (!user?.id) {
        throw new Error('No autenticado');
      }

      const file = new File([blob], `avatar-${user.id}.webp`, { type: 'image/webp' });
      const path = await uploadAvatar(null, file, user.id);
      if (!path) {
        throw new Error('No se pudo subir el avatar.');
      }

      const saveResponse = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: path }),
      });
      const savePayload = await saveResponse.json().catch(() => ({} as Record<string, unknown>));
      if (!saveResponse.ok) {
        throw new Error(String((savePayload as any)?.error || 'No se pudo actualizar avatar'));
      }

      const previousPath = String((savePayload as any)?.previous_avatar_url || '').trim();
      if (previousPath && previousPath !== path) {
        await deleteAvatar(null, previousPath);
      }

      await refreshAuth(true);
      addToast('Avatar actualizado', { type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      logError('avatar upload error', err);
      addToast('Error al actualizar avatar en el perfil público: ' + msg, { type: 'error' });
    }
  };

  if (hide) return null;
  const avatarSizeClass = inline ? "w-40 h-40" : "w-32 h-32";

  return (
    <div className={inline ? "relative flex flex-col items-center" : "absolute left-12 -bottom-24 z-20 flex flex-col items-center"}>
      <CircleButton aria-label="Avatar" size={inline ? 160 : 128} variant="default" className={`${noBorder ? '' : ''} shadow-card`}>
        {avatar?.url ? (
          <img src={avatar.url} alt="avatar" className={`object-cover rounded-full ${avatarSizeClass}`} />
        ) : (
          <div className={`flex items-center justify-center ${avatarSizeClass}`}>
            <IconUser size={inline ? 64 : 64} stroke={1.5} className="text-primary" />
          </div>
        )}
      </CircleButton>

      <label className="absolute bottom-3 right-3 bg-[var(--field-bg)] hover:bg-[var(--field-bg-hover)] text-[var(--field-text)] rounded-full w-8 h-8 flex items-center justify-center shadow-card cursor-pointer border border-[var(--field-border)] transition-all duration-150 pointer-events-auto z-30">
        <input id="avatar-file-inline" type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <IconPlus size={16} className="text-[var(--field-text)]" />
      </label>

      {avatar && (
        <button
          type="button"
          className="absolute top-3 right-3 bg-[var(--color-danger)] hover:opacity-90 active:opacity-80 text-[var(--color-on-primary)] rounded-full w-7 h-7 flex items-center justify-center border border-[var(--color-danger-subtle-border)] transition-all duration-150 pointer-events-auto z-30"
          onClick={async () => {
            if (avatar.url) URL.revokeObjectURL(avatar.url);
            setAvatar(null);
            try {
              const response = await fetch('/api/profile/avatar', { method: 'DELETE' });
              const payload = await response.json().catch(() => ({} as Record<string, unknown>));
              const previousPath = String((payload as any)?.previous_avatar_url || '').trim();
              if (previousPath) {
                await deleteAvatar(null, previousPath);
              }
              await refreshAuth(true);
            } catch (error) {
              logError('avatar delete error', error);
            }
            addToast('Eliminada con éxito', { type: 'success' });
          }}
          aria-label="Eliminar avatar"
        >
          <IconX size={13} />
        </button>
      )}

      <ProfileAvatarCropper
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        imageSrc={src}
        onCropped={onCropped}
      />
    </div>
  );
}
