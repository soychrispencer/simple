"use client";
import React from "react";
import ProfileAvatarCropper from "./ProfileAvatarCropper";
import { IconPlus, IconX, IconUser } from '@tabler/icons-react';
import { CircleButton, useToast } from "@simple/ui";
// Eliminado uso de localStorage para avatar
// dataURLToBlob eliminado (no usado en versión actual)
import { uploadAvatar, deleteAvatar, getAvatarUrl } from "@/lib/supabaseStorage";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { useAuth } from "@/context/AuthContext";
import { logError } from "@/lib/logger";

// Versión inline para superponer el avatar sobre la portada
export default function ProfileAvatarUploader({ hide = false, noBorder = false, inline = false }: { hide?: boolean, noBorder?: boolean, inline?: boolean }) {
	const { user, refresh: refreshAuth } = useAuth();
	const supabase = useSupabase();
	const { addToast } = useToast();
	const [avatar, setAvatar] = React.useState<{ url: string; blob: Blob | null } | null>(null);
	const [cropOpen, setCropOpen] = React.useState(false);
	const [src, setSrc] = React.useState<string | null>(null);

	// Cargar avatar actual al montar (avatar_url) y fallback a public_profiles
	React.useEffect(() => {
		async function loadAvatar() {
			const path = (user as any)?.avatar_url;
			if (path) {
				const url = path.startsWith?.('http') ? path : getAvatarUrl(supabase, path);
				if (url) setAvatar({ url, blob: null });
				return;
			}

			if (!user?.id) return;
			const { data } = await supabase
				.from('public_profiles')
				.select('avatar_url')
				.eq('owner_profile_id', user.id)
				.maybeSingle();
			const p = data?.avatar_url;
			if (!p) return;
			const url = p.startsWith?.('http') ? p : getAvatarUrl(supabase, p);
			if (url) setAvatar({ url, blob: null });
		}
		loadAvatar();
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
			const { data: publicProfile, error: publicErr } = await supabase
				.from('public_profiles')
				.select('id, avatar_url, slug')
				.eq('owner_profile_id', user.id)
				.maybeSingle();
			if (publicErr) throw new Error(publicErr.message);

			const file = new File([blob], `avatar-${user.id}.webp`, { type: 'image/webp' });
			const path = await uploadAvatar(supabase, file, user.id);
			if (!path) throw new Error('No se pudo subir el avatar.');
			if (publicProfile?.avatar_url && publicProfile.avatar_url !== path) {
				await deleteAvatar(supabase, publicProfile.avatar_url);
			}

			// Fuente principal para la app (header, publicaciones, etc.): tabla `profiles`.
			// Mantener en sync con el perfil público.
			const { error: profileUpdateError } = await supabase
				.from('profiles')
				.update({ avatar_url: path })
				.eq('id', user.id);
			if (profileUpdateError) throw profileUpdateError;

			if (publicProfile?.id) {
				const { error: updateError } = await supabase
					.from('public_profiles')
					.update({ avatar_url: path })
					.eq('id', publicProfile.id);
				if (updateError) throw updateError;
			} else {
				const slug = publicProfile?.slug || (user as any)?.username || user.id;
				const { error: insertError } = await supabase
					.from('public_profiles')
					.insert({ owner_profile_id: user.id, profile_type: 'business', slug, avatar_url: path });
				if (insertError) throw insertError;
			}
			refreshAuth();
			addToast("Avatar actualizado", { type: "success" });
		} catch (err) {
			const msg = err instanceof Error ? err.message : JSON.stringify(err);
			logError("avatar upload error", err);
			addToast("Error al actualizar avatar en el perfil público: " + msg, { type: "error" });
		}
	};
	if (hide) return null;
	const avatarSizeClass = inline ? "w-40 h-40" : "w-32 h-32";
	return (
		<div className={inline ? "relative flex flex-col items-center" : "absolute left-12 -bottom-24 z-20 flex flex-col items-center"}>
			<CircleButton aria-label="Avatar" size={inline ? 160 : 128} variant="default" className={`${noBorder ? '' : 'border-4 border-[var(--card-bg)]'} shadow-card`}>
				{avatar?.url ? (
					<img src={avatar.url} alt="avatar" className={`object-cover rounded-full ${avatarSizeClass}`} />
				) : (
					<div className={`flex items-center justify-center ${avatarSizeClass}`}>
						<IconUser size={inline ? 64 : 64} stroke={1.5} className="text-primary" />
					</div>
				)}
			</CircleButton>
			{/* Botón + en la esquina inferior derecha del avatar */}
			<label className="absolute bottom-3 right-3 bg-[var(--field-bg)] hover:bg-[var(--field-bg-hover)] text-[var(--field-text)] rounded-full w-8 h-8 flex items-center justify-center shadow-card cursor-pointer border border-[var(--field-border)] transition-all duration-150 pointer-events-auto z-30">
				<input id="avatar-file-inline" type="file" accept="image/*" className="hidden" onChange={handleFile} />
				<IconPlus size={16} className="text-[var(--field-text)]" />
			</label>
			{/* Botón X para eliminar en la esquina superior derecha del avatar */}
			{avatar && (
				<button
					type="button"
					className="absolute top-3 right-3 bg-[var(--color-danger)] hover:opacity-90 active:opacity-80 text-[var(--color-on-primary)] rounded-full w-7 h-7 flex items-center justify-center border border-[var(--color-danger-subtle-border)] transition-all duration-150 pointer-events-auto z-30"
					onClick={async () => {
						if (avatar.url) URL.revokeObjectURL(avatar.url);
						setAvatar(null);
						// Eliminado almacenamiento local
						try {
							const { data: { user } } = await supabase.auth.getUser();
							if (user) {
								const { data, error } = await supabase
									.from('public_profiles')
									.select('id, avatar_url')
									.eq('owner_profile_id', user.id)
									.maybeSingle();
								if (error) throw error;
								if (data?.avatar_url) await deleteAvatar(supabase, data.avatar_url);
								if (data?.id) {
									await supabase.from('public_profiles').update({ avatar_url: null }).eq('id', data.id);
								}
								await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
								await refreshAuth();
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







