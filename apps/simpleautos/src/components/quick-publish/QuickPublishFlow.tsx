'use client';

import { useState } from 'react';
import { useQuickPublish } from '@/hooks/useQuickPublish';
import { useAuth } from '@/context/auth-context';
import { PanelButton, PanelNotice } from '@simple/ui';
import ProgressBar from './ProgressBar';
import Step1Photos from './Step1Photos';
import Step2BasicData from './Step2BasicData';
import Step3Preview from './Step3Preview';
import StepSuccess from './StepSuccess';
import type { QuickBasicData } from './types';

function ResetConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm rounded-2xl border p-6 flex flex-col gap-4 shadow-xl"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>¿Empezar de nuevo?</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Se perderán todos los datos ingresados.</p>
                </div>
                <div className="flex gap-2 justify-end">
                    <PanelButton variant="ghost" className="w-full md:w-auto" onClick={onCancel}>
                        Cancelar
                    </PanelButton>
                    <PanelButton variant="danger" className="w-full md:w-auto" onClick={onConfirm}>
                        Reiniciar
                    </PanelButton>
                </div>
            </div>
        </div>
    );
}

export default function QuickPublishFlow() {
    const qp = useQuickPublish();
    const { user, requireAuth } = useAuth();
    const [showResetModal, setShowResetModal] = useState(false);

    function handleBack() {
        if (qp.step === 2) qp.goToStep(1);
        else if (qp.step === 3) qp.goToStep(2);
    }

    function handleAfterPhotos() {
        if (!requireAuth(() => qp.goToStep(2))) return;
        qp.goToStep(2);
    }

    function handleStep2Submit(data: QuickBasicData) {
        if (!requireAuth(() => void qp.submitBasicData(data))) return;
        void qp.submitBasicData(data);
    }

    return (
        <div className="container-app panel-page max-w-3xl py-8">
            {/* Reset confirmation modal */}
            {showResetModal && (
                <ResetConfirmModal
                    onConfirm={() => { setShowResetModal(false); qp.reset(); }}
                    onCancel={() => setShowResetModal(false)}
                />
            )}

            {/* Progress bar */}
            {qp.step !== 'success' && (
                <div
                    className="rounded-2xl border px-4 py-3 mb-6 flex items-center gap-3"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                >
                    <div className="flex-1">
                        <ProgressBar step={qp.step} />
                    </div>
                    {(qp.step === 2 || qp.step === 3) && (
                        <button
                            type="button"
                            className="shrink-0 text-xs transition-colors hover:underline"
                            style={{ color: 'var(--fg-muted)' }}
                            onClick={() => setShowResetModal(true)}
                        >
                            Reiniciar
                        </button>
                    )}
                </div>
            )}

            {qp.step === 1 && !user ? (
                <PanelNotice className="mb-5" tone="neutral">
                    Publicarás este vehículo dentro de tu cuenta. Puedes empezar con las fotos ahora, pero antes de pasar a la ficha te pediremos iniciar sesión para guardar el aviso.
                </PanelNotice>
            ) : null}

            {qp.step === 1 && (
                <Step1Photos
                    photos={qp.photos}
                    onAddPhotos={qp.addPhotos}
                    onRemovePhoto={qp.removePhoto}
                    onReorderPhotos={qp.reorderPhotos}
                    onNext={handleAfterPhotos}
                    restoredPhotoCount={qp.restoredPhotoCount}
                />
            )}

            {qp.step === 2 && (
                <Step2BasicData
                    initialData={qp.basicData}
                    onSubmit={handleStep2Submit}
                    onBack={handleBack}
                />
            )}

            {qp.step === 3 && qp.basicData && (
                <Step3Preview
                    basicData={qp.basicData}
                    generatedText={qp.generatedText}
                    isGenerating={qp.isGenerating}
                    isPublishing={qp.isPublishing}
                    publishError={qp.publishError}
                    detectedColor={qp.detectedColor}
                    initialLocation={qp.savedLocation}
                    onUpdateText={qp.updateGeneratedText}
                    onUpdatePricing={qp.updatePricing}
                    onUpdateLocation={qp.updateLocation}
                    onGenerateText={() => void qp.generateText()}
                    onPublish={() => void qp.publish()}
                    onBack={handleBack}
                />
            )}

            {qp.step === 'success' && qp.publishedId && qp.publishedHref && (
                <StepSuccess
                    listingId={qp.publishedId}
                    listingHref={qp.publishedHref}
                    listingTitle={qp.publishedTitle ?? ''}
                    onPublishAnother={qp.reset}
                />
            )}
        </div>
    );
}
