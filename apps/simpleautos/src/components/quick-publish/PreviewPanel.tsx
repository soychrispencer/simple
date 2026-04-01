'use client';

import Image from 'next/image';
import { IconCamera, IconSparkles, IconCar, IconCheck } from '@tabler/icons-react';
import type { QuickPhoto, QuickBasicData, GeneratedText, QuickPublishStep } from './types';

interface Props {
    step: QuickPublishStep;
    photos: QuickPhoto[];
    basicData: QuickBasicData | null;
    generatedText: GeneratedText | null;
}

const STEP_TIPS: Record<number, { title: string; tips: string[] }> = {
    1: {
        title: 'Consejos para las fotos',
        tips: [
            'Fotografía con buena luz natural',
            'Incluye ángulos: frente, lado, trasera e interior',
            'Fotos de calidad aumentan hasta 3x las consultas',
            'Mínimo 5 fotos para destacar en búsquedas',
        ],
    },
    2: {
        title: 'Datos que más importan',
        tips: [
            'Marca, modelo y año son obligatorios',
            'El kilometraje influye mucho en el precio',
            'La versión ayuda a los compradores a comparar',
            'Más detalles = mayor confianza del comprador',
        ],
    },
    3: {
        title: 'Antes de publicar',
        tips: [
            'La IA genera el texto en segundos',
            'Puedes editar el título y descripción',
            'El precio puede marcarse como negociable',
            'Podrás editar todos los datos después',
        ],
    },
};

function completenessItems(photos: QuickPhoto[], basicData: QuickBasicData | null, generatedText: GeneratedText | null) {
    return [
        { label: 'Fotos', done: photos.length > 0, hint: `${photos.length} foto${photos.length !== 1 ? 's' : ''}` },
        { label: 'Marca y modelo', done: !!(basicData?.brandId && basicData?.modelId) },
        { label: 'Año y precio', done: !!(basicData?.year && basicData?.price) },
        { label: 'Título con IA', done: !!generatedText },
    ];
}

export default function PreviewPanel({ step, photos, basicData, generatedText }: Props) {
    const cover = photos.find((p) => p.isCover) ?? photos[0];
    const stepNum = step === 'success' ? 4 : (step as number);
    const tips = STEP_TIPS[stepNum];
    const items = completenessItems(photos, basicData, generatedText);
    const doneCount = items.filter((i) => i.done).length;

    const brandName = basicData?.brandId === '__custom__' ? basicData.customBrand : basicData?.brandId ?? '';
    const modelName = basicData?.modelId === '__custom__' ? basicData.customModel : basicData?.modelId ?? '';

    return (
        <div className="space-y-4">
            {/* Mini listing card preview */}
            <div
                className="rounded-2xl overflow-hidden border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
            >
                {/* Cover image */}
                <div
                    className="relative w-full aspect-[16/10]"
                    style={{ background: 'var(--bg-muted)' }}
                >
                    {cover ? (
                        <Image
                            src={cover.previewUrl}
                            alt="Foto portada del vehículo"
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center flex-col gap-2">
                            <IconCamera size={24} style={{ color: 'var(--fg-muted)' }} />
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Sin foto aún</span>
                        </div>
                    )}

                    {photos.length > 1 && (
                        <div
                            className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ background: 'rgba(0,0,0,0.55)' }}
                        >
                            {photos.length} fotos
                        </div>
                    )}
                </div>

                {/* Card info */}
                <div className="p-3">
                    {generatedText ? (
                        <>
                            <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--fg)' }}>
                                {generatedText.titulo}
                            </p>
                            <p className="mt-1 text-xs line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                                {generatedText.descripcion}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold" style={{ color: brandName ? 'var(--fg)' : 'var(--fg-muted)' }}>
                                {brandName && modelName
                                    ? `${brandName} ${modelName}${basicData?.year ? ` ${basicData.year}` : ''}`
                                    : 'Vista previa del aviso'}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {basicData?.price || 'Precio por confirmar'}
                            </p>
                        </>
                    )}

                    {basicData?.transmission && (
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                            {[basicData.transmission, basicData.year, basicData.mileage ? `${basicData.mileage} km` : null]
                                .filter(Boolean)
                                .map((tag, i) => (
                                    <span
                                        key={i}
                                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Completeness */}
            <div
                className="rounded-2xl border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
            >
                <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Completitud</span>
                    <span className="text-xs font-semibold" style={{ color: '#FF3600' }}>
                        {doneCount}/{items.length}
                    </span>
                </div>
                <div className="space-y-1.5">
                    {items.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div
                                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                                style={{ background: item.done ? '#ecfdf5' : 'var(--bg-muted)' }}
                            >
                                {item.done
                                    ? <IconCheck size={10} style={{ color: '#059669' }} />
                                    : <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--border)' }} />
                                }
                            </div>
                            <span
                                className="text-xs flex-1"
                                style={{ color: item.done ? 'var(--fg)' : 'var(--fg-muted)' }}
                            >
                                {item.label}
                            </span>
                            {item.hint && (
                                <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{item.hint}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step tips */}
            {tips && (
                <div
                    className="rounded-2xl border p-3"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <IconSparkles size={13} style={{ color: '#FF3600' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{tips.title}</span>
                    </div>
                    <ul className="space-y-1.5">
                        {tips.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                <IconCar size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
