"use client";
import React from "react";
import { Button } from "../Button";
import { useToast } from "../toast/ToastProvider";
import { fileToWebp } from "../../../lib/image";
import { deleteVehicleImage, extractPathFromUrl } from "../../../lib/storage";

type ImageItem = {
	id: string;
	url: string; // object URL o URL remota
	file: File;
	cover?: boolean;
	dataUrl?: string; // persisted base64 for reloads
	remoteUrl?: string; // URL de backend legado si ya está subida
};

type Props = {
	value?: ImageItem[];
	onChange?: (items: ImageItem[]) => void;
	multiple?: boolean;
	max?: number;
};

export default function GalleryImageUploader({ value = [], onChange, multiple = true, max = 12 }: Props) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [items, setItems] = React.useState<ImageItem[]>(() => {
		// reconstruct object URLs from persisted dataUrl if present
		return (value || []).map((v: any) => ({ ...v }));
	});
	const { addToast } = useToast();

	React.useEffect(() => {
		// when value updates, ensure object URLs exist for previews
		(async () => {
			const next: ImageItem[] = [];
			for (const v of (value as any[])) {
				if (v.url) { next.push(v as any); continue; }
				if (v.dataUrl) {
					const res = await fetch(v.dataUrl);
					const blob = await res.blob();
					const file = new File([blob], v.file?.name || `image-${v.id || crypto.randomUUID()}.webp`, { type: blob.type || 'image/webp' });
					const url = URL.createObjectURL(file);
					next.push({ ...(v as any), file, url });
				}
			}
			if (next.length) setItems(next);
			else setItems(value as any);
		})();
	}, [value]);

	const addFiles = async (files: FileList | null) => {
		if (!files) return;
		const current = [...items];
		for (let i = 0; i < files.length && current.length < max; i++) {
			const original = files[i];
			const webp = await fileToWebp(original);
			const id = crypto.randomUUID();
			const url = URL.createObjectURL(webp);
			current.push({ id, url, file: webp, cover: current.length === 0 });
		}
		setItems(current);
		onChange?.(current);
		addToast("Imágenes agregadas", { type: "success" });
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		addFiles(e.dataTransfer.files);
	};

	const onRemove = async (id: string) => {
		const removed = items.find((it) => it.id === id);
		
		// Si la imagen ya está subida a backend legado, eliminarla
		if (removed?.remoteUrl) {
			const path = extractPathFromUrl(removed.remoteUrl);
			if (path) {
				await deleteVehicleImage(null, path);
				console.log('[GalleryImageUploader] Imagen eliminada del storage:', path);
			}
		}
		
		// Liberar object URLs locales
		if (removed?.url && !removed.url.startsWith('http')) {
			URL.revokeObjectURL(removed.url);
		}
		
		const next = items.filter((it) => it.id !== id);
		
		// Asegurar que haya una imagen de portada
		if (!next.some((it) => it.cover) && next[0]) next[0].cover = true;
		
		setItems(next);
		onChange?.(next);
		addToast("Imagen eliminada", { type: "info" });
	};

	const setCover = (id: string) => {
		const next = items.map((it) => ({ ...it, cover: it.id === id }));
		setItems(next);
		onChange?.(next);
	};

	const move = (from: number, to: number) => {
		if (to < 0 || to >= items.length) return;
		const next = [...items];
		const [spliced] = next.splice(from, 1);
		next.splice(to, 0, spliced);
		setItems(next);
		onChange?.(next);
	};

	return (
		<div>
			<div
				className="border-2 border-dashed rounded-xl p-6 text-center bg-[var(--field-bg)] border-[var(--field-border)] text-lighttext/70 dark:text-darktext/70"
				onDragOver={(e) => e.preventDefault()}
				onDrop={onDrop}
			>
				<p className="mb-3">Arrastra imágenes aquí o</p>
				<Button type="button" variant="primary" size="md" onClick={() => inputRef.current?.click()}>
					Selecciona archivos
				</Button>
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					multiple={multiple}
					className="hidden"
					onChange={(e) => addFiles(e.target.files)}
				/>
			</div>

			{items.length > 0 && (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
					{items.map((it, idx) => (
						<div key={it.id} className="relative group">
							<img src={it.url} alt="Imagen" className="w-full h-36 object-cover rounded-lg" />
							<div className="absolute inset-0 bg-[var(--overlay-scrim-0)] group-hover:bg-[var(--overlay-scrim-40)] transition rounded-lg flex items-end p-2 gap-2 opacity-0 group-hover:opacity-100">
								<Button type="button" size="sm" className={`${it.cover ? 'bg-primary text-[var(--color-on-primary)]' : 'bg-[var(--field-bg)] border border-[var(--field-border)] text-[var(--text-primary)]'} px-2 py-1 text-xs`} onClick={() => setCover(it.id)}>
									{it.cover ? 'Portada' : 'Hacer portada'}
								</Button>
								<Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs" onClick={() => move(idx, idx - 1)}>←</Button>
								<Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs" onClick={() => move(idx, idx + 1)}>→</Button>
								<Button type="button" size="sm" variant="danger" className="ml-auto px-2 py-1 text-xs" onClick={() => onRemove(it.id)}>Eliminar</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

