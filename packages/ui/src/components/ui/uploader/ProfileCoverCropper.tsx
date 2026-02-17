"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Button from "../Button";

interface ProfileCoverCropperProps {
	open: boolean;
	imageSrc: string | null;
	onClose: () => void;
	onCropped: (blob: Blob) => void;
}

export default function ProfileCoverCropper({ open, imageSrc, onClose, onCropped }: ProfileCoverCropperProps) {
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		// Reset al cambiar de imagen
		setCrop(undefined);
		setCompletedCrop(undefined);
		setLoadError(null);
	}, [imageSrc]);

	// Prevent body scroll when modal is open
	useEffect(() => {
		document.body.classList.add('overflow-hidden');
		return () => {
			document.body.classList.remove('overflow-hidden');
		};
	}, []);

	// Función para centrar el crop inicial
	function centerAspectCrop(
		mediaWidth: number,
		mediaHeight: number,
		aspect: number,
	) {
		return centerCrop(
			makeAspectCrop(
				{
					unit: '%',
					width: 80, // Ocupar 80% del área disponible inicialmente
				},
				aspect,
				mediaWidth,
				mediaHeight,
			),
			mediaWidth,
			mediaHeight,
		);
	}

	// Cuando se carga la imagen, crear crop inicial
	function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
		setLoadError(null);
		const { width, height } = e.currentTarget;
		// Aspect ratio 32:9 para desktop (móvil usa 32:10 pero cropper es para desktop)
		const aspect = 32 / 9;
		setCrop(centerAspectCrop(width, height, aspect));
	}

	function onImageError() {
		setLoadError('No pudimos cargar la imagen. Intenta con otro archivo.');
	}

	// Función para obtener el blob final
	async function getCroppedBlob(): Promise<Blob> {
		if (!completedCrop || !imgRef.current) {
			throw new Error('No crop completed');
		}

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas not supported');

		const image = imgRef.current;
		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;

		canvas.width = 3840;
		canvas.height = 1080;

		ctx.drawImage(
			image,
			completedCrop.x * scaleX,
			completedCrop.y * scaleY,
			completedCrop.width * scaleX,
			completedCrop.height * scaleY,
			0,
			0,
			3840,
			1080
		);

		return new Promise((resolve) => {
			canvas.toBlob((blob) => {
				if (blob) resolve(blob);
			}, 'image/webp', 0.95);
		});
	}

	async function handleCrop() {
		if (!completedCrop) return;

		setLoading(true);
		try {
			const blob = await getCroppedBlob();
			onCropped(blob);
			onClose();
		} catch (error) {
			console.error('Error cropping image:', error);
		} finally {
			setLoading(false);
		}
	}

	// Preview optimizada
	const previewUrl = useMemo(() => {
		if (!completedCrop || !imgRef.current || !canvasRef.current) return null;
		const image = imgRef.current;
		if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return null;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;

		// Usar dimensiones más pequeñas para preview (mejor rendimiento)
		const previewWidth = 960; // 1/4 de la resolución final
		const previewHeight = 270; // Mantener aspect ratio

		canvas.width = previewWidth;
		canvas.height = previewHeight;

		ctx.drawImage(
			image,
			completedCrop.x * scaleX,
			completedCrop.y * scaleY,
			completedCrop.width * scaleX,
			completedCrop.height * scaleY,
			0,
			0,
			previewWidth,
			previewHeight
		);

		return canvas.toDataURL('image/webp', 0.8); // Calidad más baja para preview
	}, [completedCrop]);

	if (!open) return null;
	const canRenderImage = Boolean(imageSrc);

	return createPortal(
		<div className="fixed top-0 left-0 right-0 bottom-0 z-[10001] flex items-center justify-center bg-[var(--overlay-scrim-80)] backdrop-blur-sm isolate pointer-events-none">
			<div className="card-surface card-surface-raised rounded-3xl shadow-card p-0 w-full max-w-4xl flex flex-col items-center animate-fadein pointer-events-auto m-4">
				{/* Header */}
				<div className="w-full flex flex-row items-center justify-between px-8 pt-8 pb-4">
					<div>
						<h2 className="font-bold text-2xl text-lighttext dark:text-darktext">Recortar portada</h2>
						<p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-1">
							Ajusta la imagen para que se vea perfecta en tu perfil
						</p>
						<p className="text-xs text-primary mt-2">
							💡 Recomendación: Usa imágenes panorámicas de al menos 1920×540 píxeles para obtener mejores resultados.
						</p>
					</div>
					<button
						onClick={onClose}
						className="w-8 h-8 rounded-full bg-[var(--field-bg)] hover:bg-[var(--field-bg-hover)] flex items-center justify-center transition-colors group"
					>
						<span className="text-lighttext/70 dark:text-darktext/70 group-hover:text-lighttext dark:group-hover:text-darktext text-xl font-light">×</span>
					</button>
				</div>

				<div className="w-full flex flex-col lg:flex-row items-start justify-center gap-8 px-8 pb-8">
					{/* Área de edición */}
					<div className="flex-1 flex flex-col items-center">
						<div className="text-center mb-6">
							<h3 className="text-lg font-semibold text-lighttext dark:text-darktext mb-2">
								Selecciona el área
							</h3>
							<p className="text-sm text-lighttext/70 dark:text-darktext/70">
								Arrastra para reposicionar y ajusta los bordes para cambiar el tamaño
							</p>
						</div>

						{/* Cropper */}
						<div className="relative max-w-2xl">
							{canRenderImage ? (
								<ReactCrop
									crop={crop}
									onChange={setCrop}
									onComplete={setCompletedCrop}
									aspect={32 / 9} // 32:9 para portada
									minWidth={100}
									circularCrop={false} // No circular para portada
									renderSelectionAddon={() => null}
									className="rounded-lg overflow-hidden border border-[var(--field-border)] bg-[var(--field-bg)]"
								>
									<img
										ref={imgRef}
										src={imageSrc!}
										alt="Portada"
										onLoad={onImageLoad}
										onError={onImageError}
										className="max-w-full max-h-[60vh] object-contain"
									/>
								</ReactCrop>
							) : (
								<div className="w-full h-40 flex items-center justify-center rounded-lg border border-dashed border-[var(--field-border)] text-sm text-lighttext/70 dark:text-darktext/70">
									Selecciona una imagen válida para comenzar.
								</div>
							)}
						</div>

						{/* Canvas oculto para preview */}
						<canvas ref={canvasRef} className="hidden" />
					</div>

					{/* Vista previa */}
					<div className="w-full lg:w-96 flex flex-col items-center gap-4">
						<div className="text-center">
							<h4 className="text-sm font-medium text-lighttext dark:text-darktext mb-2">
								Vista previa
							</h4>
							<p className="text-xs text-lighttext/70 dark:text-darktext/70">
								Así se verá en tu perfil público
							</p>
							{loadError ? (
								<div className="mt-2 text-xs text-[var(--color-danger)]">{loadError}</div>
							) : null}
						</div>

						{/* Preview container */}
						<div className="relative w-full max-w-sm">
							<div className="card-inset rounded-lg overflow-hidden">
								{/* Portada preview */}
								<div className="relative aspect-[32/9] bg-[var(--field-bg)] overflow-hidden">
									{previewUrl ? (
										<img
											src={previewUrl}
											alt="Portada preview"
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<div className="text-xs text-lighttext/70 dark:text-darktext/70">
												Procesando...
											</div>
										</div>
									)}
								</div>

								{/* Simulación del perfil */}
								<div className="relative px-4 pb-4">
									<div className="absolute -top-8 left-4">
										<div className="w-16 h-16 rounded-full bg-[var(--card-bg)] border-2 border-[var(--field-border)] flex items-center justify-center">
											<span className="text-lighttext/70 dark:text-darktext/70 text-lg">??</span>
										</div>
									</div>
									<div className="pt-10">
										<div className="h-4 bg-[var(--field-bg)] rounded mb-2"></div>
										<div className="h-3 bg-[var(--field-border)] rounded w-3/4"></div>
									</div>
								</div>
							</div>

							<div className="text-center mt-2">
								<span className="text-xs text-lighttext/70 dark:text-darktext/70 bg-[var(--field-bg)] border border-[var(--field-border)] px-2 py-1 rounded-full">
									Tu página pública
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex flex-row gap-3 w-full px-8 pb-8 justify-end">
					<Button
						variant="neutral"
						onClick={onClose}
						disabled={loading}
						className="px-6 py-2.5 rounded-xl font-medium"
					>
						Cancelar
					</Button>
					<Button
						variant="primary"
						onClick={handleCrop}
						loading={loading}
						disabled={!completedCrop}
						className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-primary to-[var(--color-primary-a80)] hover:from-[var(--color-primary-a90)] hover:to-[var(--color-primary-a70)] shadow-card"
					>
						{loading ? 'Guardando...' : 'Guardar portada'}
					</Button>
				</div>
			</div>
		</div>
	, document.body);
}







