'use client';

import { useState, useEffect } from 'react';
import { IconPalette, IconX } from '@tabler/icons-react';
import { PanelButton, PanelNotice } from '@simple/ui';
import type { QuickBasicData, GeneratedText } from './types';
import Step3Text from './Step3Text';

interface Props {
    basicData: QuickBasicData;
    generatedText: GeneratedText | null;
    isGenerating: boolean;
    isPublishing: boolean;
    publishError: string | null;
    detectedColor: string | null;
    onUpdateText: (titulo: string, descripcion: string) => void;
    onGenerateText: () => void;
    onPublish: () => void;
    onBack: () => void;
}

export default function Step3Preview({
    basicData,
    generatedText,
    isGenerating,
    isPublishing,
    publishError,
    detectedColor,
    onUpdateText,
    onGenerateText,
    onPublish,
    onBack,
}: Props) {
    const [colorBannerDismissed, setColorBannerDismissed] = useState(false);

    useEffect(() => {
        if (detectedColor) setColorBannerDismissed(false);
    }, [detectedColor]);

    return (
        <div className="flex flex-col gap-6">

            {/* ANUNCIO (IA) */}
            <div className="flex flex-col gap-3">
                <p className="type-overline text-(--fg-muted)">Anuncio</p>

                {detectedColor && !colorBannerDismissed && generatedText && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs bg-(--bg-subtle) border border-(--border)">
                        <IconPalette size={13} className="text-(--fg-muted) shrink-0" />
                        <span className="text-(--fg-secondary)">
                            Color detectado: <strong className="text-(--fg)">{detectedColor}</strong>
                        </span>
                        <button type="button" onClick={() => setColorBannerDismissed(true)} className="ml-auto shrink-0">
                            <IconX size={12} className="text-(--fg-muted)" />
                        </button>
                    </div>
                )}

                <Step3Text
                    data={basicData}
                    generatedText={generatedText}
                    isGenerating={isGenerating}
                    onUpdateText={onUpdateText}
                    onGenerateText={onGenerateText}
                />
            </div>

            {/* ERROR */}
            {publishError && <PanelNotice tone="error">{publishError}</PanelNotice>}

            {/* ACTIONS */}
            <div className="flex flex-col gap-3 pt-3 border-t border-(--border)">
                {!generatedText && !isGenerating && (
                    <p className="text-[11px] text-center text-(--fg-muted)">
                        Se publicará con un título básico si no generas uno con IA.
                    </p>
                )}
                <div className="flex flex-col-reverse gap-2">
                    <PanelButton variant="ghost" onClick={onBack} disabled={isPublishing} className="w-full">
                        ← Volver
                    </PanelButton>
                    <PanelButton variant="primary" onClick={onPublish} disabled={isPublishing} className="w-full shadow-lg">
                        {isPublishing ? (
                            <div className="flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Publicando…
                            </div>
                        ) : 'Publicar ahora 🚀'}
                    </PanelButton>
                </div>
            </div>
        </div>
    );
}
