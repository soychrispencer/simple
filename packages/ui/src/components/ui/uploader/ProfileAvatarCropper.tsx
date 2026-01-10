"use client";

import React, { useState, useRef } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Button from "../Button";

interface ProfileAvatarCropperProps {
	open: boolean;
	imageSrc: string | null;
	onClose: () => void;
	onCropped: (blob: Blob) => void;
}

export default function ProfileAvatarCropper({ open, imageSrc, onClose, onCropped }: ProfileAvatarCropperProps) {
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const [loading, setLoading] = useState(false);
	const imgRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// Función para centrar el crop inicial (cuadrado para avatar circular)
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
		const { width, height } = e.currentTarget;
		// Aspect ratio 1:1 para avatar circular
		const aspect = 1;
		setCrop(centerAspectCrop(width, height, aspect));
	}

	// Generar preview del crop (circular)
	function generatePreview() {
		if (!completedCrop || !imgRef.current || !canvasRef.current) return null;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		const image = imgRef.current;
		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;

		// Crear canvas cuadrado para el preview
		const previewSize = 160; // Tamaño del preview circular
		canvas.width = previewSize;
		canvas.height = previewSize;

		// Dibujar la porción recortada
		ctx.drawImage(
			image,
			completedCrop.x * scaleX,
			completedCrop.y * scaleY,
			completedCrop.width * scaleX,
			completedCrop.height * scaleY,
			0,
			0,
			previewSize,
			previewSize
		);

		// Crear máscara circular
		ctx.globalCompositeOperation = 'destination-in';
		ctx.beginPath();
		ctx.arc(previewSize / 2, previewSize / 2, previewSize / 2, 0, 2 * Math.PI);
		ctx.fill();

		return canvas.toDataURL('image/webp', 0.95);
	}

	// Función para obtener el blob final (cuadrado, el círculo se aplica en el display)
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

		// Dimensiones finales cuadradas para avatar
		canvas.width = 1080;
		canvas.height = 1080;

		ctx.drawImage(
			image,
			completedCrop.x * scaleX,
			completedCrop.y * scaleY,
			completedCrop.width * scaleX,
			completedCrop.height * scaleY,
			0,
			0,
			1080,
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

	if (!open) return null;

	const previewUrl = generatePreview();

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim-80)] backdrop-blur-sm">
			<div className="card-surface card-surface-raised rounded-3xl shadow-card p-0 w-full max-w-4xl flex flex-col items-center animate-fadein">
				{/* Header */}
				<div className="w-full flex flex-row items-center justify-between px-8 pt-8 pb-4">
					<div>
						<h2 className="font-bold text-2xl text-lighttext dark:text-darktext">Recortar avatar</h2>
						<p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-1">
							Ajusta la imagen para que se vea perfecta en tu perfil
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
							<ReactCrop
								crop={crop}
								onChange={setCrop}
								onComplete={setCompletedCrop}
								aspect={1} // 1:1 para avatar cuadrado
								minWidth={100}
								circularCrop={true} // Activar crop circular
								className="rounded-lg overflow-hidden border border-[var(--field-border)] bg-[var(--field-bg)]"
							>
								<img
									ref={imgRef}
									src={imageSrc!}
									alt="Avatar"
									onLoad={onImageLoad}
									className="max-w-full max-h-[60vh] object-contain"
								/>
							</ReactCrop>
						</div>

						{/* Canvas oculto para preview */}
						<canvas ref={canvasRef} className="hidden" />
					</div>

					{/* Vista previa */}
					<div className="w-full lg:w-80 flex flex-col items-center gap-4">
						<div className="text-center">
							<h4 className="text-sm font-medium text-lighttext dark:text-darktext mb-2">
								Vista previa
							</h4>
							<p className="text-xs text-lighttext/70 dark:text-darktext/70">
								Así se verá tu avatar en el perfil
							</p>
						</div>

						{/* Preview container */}
						<div className="relative w-full max-w-sm">
							<div className="card-inset rounded-lg overflow-hidden">
								{/* Espacio para simular el perfil */}
								<div className="relative px-6 pt-6 pb-4">
									{/* Avatar preview circular */}
									<div className="flex justify-center mb-4">
										<div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--field-border)]">
											{previewUrl ? (
												<img
													src={previewUrl}
													alt="Avatar preview"
													className="w-full h-full object-cover"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center bg-[var(--field-bg)]">
													<div className="text-xs text-lighttext/70 dark:text-darktext/70">
														Procesando...
													</div>
												</div>
											)}
										</div>
									</div>

									{/* Simulación del perfil */}
									<div className="text-center">
										<div className="h-4 bg-[var(--field-bg)] rounded mb-2 w-3/4 mx-auto"></div>
										<div className="h-3 bg-[var(--field-border)] rounded w-1/2 mx-auto"></div>
									</div>
								</div>
							</div>

							<div className="text-center mt-2">
								<span className="text-xs text-lighttext/70 dark:text-darktext/70 bg-[var(--field-bg)] border border-[var(--field-border)] px-2 py-1 rounded-full">
									Tu perfil público
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
						{loading ? 'Guardando...' : 'Guardar avatar'}
					</Button>
				</div>
			</div>
		</div>
	);
}







