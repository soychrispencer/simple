"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import ProfileAvatarCropper from "./ProfileAvatarCropper";
import { IconPlus, IconX, IconUser } from '@tabler/icons-react';
import CircleButton from "@/components/ui/CircleButton";
import { useToast } from "@/components/ui/toast/ToastProvider";
// Eliminado uso de localStorage para avatar
// dataURLToBlob eliminado (no usado en versión actual)
import { uploadAvatar, deleteAvatar, getAvatarUrl } from "@/lib/supabaseStorage";
import { useSupabase } from "@/lib/supabase/useSupabase";

// Versión inline para superponer el avatar sobre la portada
export default function ProfileAvatarUploader({ hide = false, noBorder = false, inline = false }: { hide?: boolean, noBorder?: boolean, inline?: boolean }) {
	const { user, refresh: refreshAuth } = useAuth();
	const supabase = useSupabase();
	const { addToast } = useToast();
	const [avatar, setAvatar] = React.useState<{ url: string; blob: Blob | null } | null>(null);
	const [cropOpen, setCropOpen] = React.useState(false);
	const [src, setSrc] = React.useState<string | null>(null);

	// Cargar avatar actual al montar (avatar_url)
	React.useEffect(() => {
		const path = (user as any)?.avatar_url;
		if (!path) return;
		const url = path.startsWith?.('http') ? path : getAvatarUrl(supabase, path);
		if (url) setAvatar({ url, blob: null });
	}, [user?.avatar_url, supabase, user]);

  React.useEffect(() => {
    return () => { if (avatar?.url) URL.revokeObjectURL(avatar.url); };
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
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error("No autenticado");
			// Housekeeping: obtener avatar previo para borrarlo si existe
			const prev = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
			const file = new File([blob], `avatar-${user.id}.webp`, { type: 'image/webp' });
			const path = await uploadAvatar(supabase, file, user.id);
			if (path) {
				if (prev.data?.avatar_url && prev.data.avatar_url !== path) {
					await deleteAvatar(supabase, prev.data.avatar_url);
				}
				await supabase.from('profiles').update({ avatar_url: path }).eq('id', user.id);
				// Patch optimista (sin esperar refresh completo)
				refreshAuth(true); // mantener refresh para mantener consistencia general
			}
			addToast("Avatar actualizado", { type: "success" });
		} catch {
			addToast("Error al actualizar avatar en el perfil público", { type: "error" });
		}
	};
		if (hide) return null;
				return (
					<div className={inline ? "relative flex flex-col items-center" : "absolute left-12 -bottom-24 z-20 flex flex-col items-center"}>
								  <CircleButton aria-label="Avatar" size={inline ? 160 : 128} variant="default" className={`${noBorder ? '' : 'border-4 border-white dark:border-black'} shadow-xl`}>
									{avatar?.url ? (
										<img src={avatar.url} alt="avatar" className="object-cover rounded-full" style={{ width: inline ? 160 : 128, height: inline ? 160 : 128 }} />
									) : (
										<div className="flex items-center justify-center" style={{ width: inline ? 160 : 128, height: inline ? 160 : 128 }}>
											<IconUser size={inline ? 64 : 64} stroke={1.5} className="text-primary" />
										</div>
									)}
								</CircleButton>
						{/* Botón + en la esquina inferior derecha del avatar */}
						<label className="absolute bottom-3 right-3 bg-white hover:bg-gray-200 text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg cursor-pointer border border-gray-300 transition-all duration-150 pointer-events-auto z-30">
							<input id="avatar-file-inline" type="file" accept="image/*" className="hidden" onChange={handleFile} />
							<IconPlus size={16} className="text-black" />
						</label>
						{/* Botón X para eliminar en la esquina superior derecha del avatar */}
						{avatar && (
							<button
								type="button"
								className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md border border-red-700/30 transition-all duration-150 pointer-events-auto z-30"
								onClick={async () => {
									if (avatar.url) URL.revokeObjectURL(avatar.url);
									setAvatar(null);
									// Eliminado almacenamiento local
									try {
										const { data: { user } } = await supabase.auth.getUser();
										if (user) {
											// Obtener el path actual del avatar
										const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
											if (data?.avatar_url) await deleteAvatar(supabase, data.avatar_url);
										await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
											await refreshAuth(true);
										}
									} catch {}
									addToast("Eliminada con éxito", { type: "success" });
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
