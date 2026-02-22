"use client";

import React from 'react';
import { IconPlus, IconUser, IconX } from '@tabler/icons-react';
import ProfileAvatarCropper from './ProfileAvatarCropper';
import CircleButton from '../CircleButton';
import { deleteAvatar, getAvatarUrl, uploadAvatar } from '../../../lib/storage';

type ProfileUser = {
  id: string;
  email?: string | null;
  avatar_url?: string | null;
};

interface ProfileAvatarUploaderProps {
	hide?: boolean;
	noBorder?: boolean;
	inline?: boolean;
	user: ProfileUser | null;
	onAuthRefresh: () => Promise<void>;
	onToast: (message: string, options?: { type: 'success' | 'error' | 'info' }) => void;
}

export default function ProfileAvatarUploader({
	hide = false,
	noBorder = false,
	inline = false,
	user,
	onAuthRefresh,
	onToast,
}: ProfileAvatarUploaderProps) {
	const [avatar, setAvatar] = React.useState<{ url: string; blob: Blob | null } | null>(null);
	const [cropOpen, setCropOpen] = React.useState(false);
	const [src, setSrc] = React.useState<string | null>(null);
	const inputId = React.useId();

	React.useEffect(() => {
		const path = user?.avatar_url;
		if (!path) return;
		const url = path.startsWith?.('http') ? path : getAvatarUrl(null, path);
		if (url) setAvatar({ url, blob: null });
	}, [user?.avatar_url]);

	React.useEffect(() => {
		return () => {
			if (avatar?.url) URL.revokeObjectURL(avatar.url);
			if (src) URL.revokeObjectURL(src);
		};
	}, [avatar?.url, src]);

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
		setCropOpen(false);
		try {
			const currentUserId = String(user?.id || "").trim();
			if (!currentUserId) throw new Error('No autenticado');

			let previousAvatarUrl = "";
			try {
				const prevResponse = await fetch("/api/profile/avatar", { method: "GET", cache: "no-store" });
				const prevPayload = await prevResponse.json().catch(() => ({} as Record<string, unknown>));
				previousAvatarUrl = String((prevPayload as { avatar_url?: unknown }).avatar_url || "");
			} catch {
				previousAvatarUrl = "";
			}

			const file = new File([blob], `avatar-${currentUserId}.webp`, { type: 'image/webp' });
			const path = await uploadAvatar(null, file, currentUserId);
			if (path) {
				const persistResponse = await fetch("/api/profile/avatar", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ avatar_url: path }),
				});
				if (!persistResponse.ok) {
					throw new Error("No se pudo guardar el avatar");
				}
				if (previousAvatarUrl && previousAvatarUrl !== path) {
					await deleteAvatar(null, previousAvatarUrl);
				}
				onAuthRefresh();
			}
			onToast('Avatar actualizado', { type: 'success' });
		} catch {
			onToast('Error al actualizar avatar en el perfil público', { type: 'error' });
		}
	};

	const handleDelete = async () => {
		if (avatar?.url) URL.revokeObjectURL(avatar.url);
		setAvatar(null);
		try {
			const response = await fetch("/api/profile/avatar", {
				method: "DELETE",
				cache: "no-store",
			});
			const payload = await response.json().catch(() => ({} as Record<string, unknown>));
			if (response.ok) {
				const previousAvatarUrl = String((payload as { previous_avatar_url?: unknown }).previous_avatar_url || "");
				if (previousAvatarUrl) {
					await deleteAvatar(null, previousAvatarUrl);
				}
				await onAuthRefresh();
			}
		} catch {}
		onToast('Eliminada con éxito', { type: 'success' });
	};

	if (hide) return null;
	const avatarSizeClass = inline ? 'w-40 h-40' : 'w-32 h-32';

	return (
		<div className={inline ? 'relative flex flex-col items-center' : 'absolute left-12 -bottom-24 z-20 flex flex-col items-center'}>
			<div className="relative">
				<CircleButton
					aria-label="Avatar"
					size={inline ? 160 : 128}
					variant="default"
					className={`${noBorder ? '' : ''} shadow-card`}
				>
					{avatar?.url ? (
						<img
							src={avatar.url}
							alt="avatar"
							className={`object-cover rounded-full ${avatarSizeClass}`}
						/>
					) : (
						<div className={`flex items-center justify-center ${avatarSizeClass}`}>
							<IconUser size={inline ? 64 : 64} stroke={1.5} className="text-primary" />
						</div>
					)}
				</CircleButton>

				<label
					htmlFor={inputId}
					className="absolute -bottom-2 right-2 w-10 h-10 rounded-full bg-[var(--field-bg)] flex items-center justify-center cursor-pointer hover:bg-[var(--field-bg-hover)]"
					aria-label="Subir avatar"
				>
					<IconPlus size={16} className="text-[var(--field-text)]" />
				</label>

				{avatar && (
					<button
						type="button"
						className="absolute top-2 right-2 bg-[var(--color-danger)] hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] rounded-full w-7 h-7 flex items-center justify-center shadow-md transition-opacity duration-150"
						onClick={handleDelete}
						aria-label="Eliminar avatar"
					>
						<IconX size={13} />
					</button>
				)}
			</div>

			<input
				id={inputId}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleFile}
			/>

			<ProfileAvatarCropper
				open={cropOpen}
				onClose={() => setCropOpen(false)}
				imageSrc={src}
				onCropped={onCropped}
			/>
		</div>
	);
}







