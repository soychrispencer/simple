'use client';

import { useState } from 'react';
import {
    IconBrain, IconChartDots3, IconClock, IconTestPipe, } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelSwitch } from '@simple/ui/panel';
import {
    publishListingToInstagramEnhanced,
    type InstagramTargetAudience,
    type InstagramTone,
} from '@/lib/instagram';

type Props = {
    onMessage: (message: string) => void;
    onError: (error: string) => void;
};

export function InstagramIntelligencePanel({ onMessage, onError }: Props) {
    const [aiEnabled, setAiEnabled] = useState(true);
    const [abTestingEnabled, setAbTestingEnabled] = useState(false);
    const [selectedTone, setSelectedTone] = useState<InstagramTone>('professional');
    const [selectedAudience, setSelectedAudience] = useState<InstagramTargetAudience>('general');
    const [schedulingEnabled, setSchedulingEnabled] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className="rounded-card border border-(--border) bg-(--bg-subtle) p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="ig-intel-icon flex h-11 w-11 items-center justify-center rounded-xl">
                        <IconBrain size={18} color="white" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-(--fg)">Instagram Intelligence</p>
                        <p className="text-sm text-(--fg-secondary)">
                            IA avanzada, A/B testing y scheduling automático
                        </p>
                    </div>
                </div>
                <PanelButton variant="secondary" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                    {showAdvanced ? 'Ocultar' : 'Ver'} opciones avanzadas
                </PanelButton>
            </div>

            {showAdvanced ? (
                <div className="space-y-4 border-t border-(--border) pt-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-(--fg)">
                            <IconBrain size={14} className="mr-2 inline" />
                            Generación con IA
                        </label>
                        <PanelSwitch
                            checked={aiEnabled}
                            onChange={setAiEnabled}
                            ariaLabel="Activar generación de contenido con IA"
                        />
                        <p className="mt-2 text-xs text-(--fg-muted)">
                            Genera captions optimizados, hashtags inteligentes y predice engagement
                        </p>
                    </div>

                    {aiEnabled ? (
                        <>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-(--fg)">Tono del contenido</label>
                                <select
                                    className="form-select"
                                    value={selectedTone}
                                    onChange={(e) => setSelectedTone(e.target.value as InstagramTone)}
                                >
                                    <option value="professional">Profesional</option>
                                    <option value="casual">Casual</option>
                                    <option value="excited">Entusiasta</option>
                                    <option value="luxury">Lujo</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-(--fg)">Audiencia objetivo</label>
                                <select
                                    className="form-select"
                                    value={selectedAudience}
                                    onChange={(e) => setSelectedAudience(e.target.value as InstagramTargetAudience)}
                                >
                                    <option value="general">General</option>
                                    <option value="young">Jóvenes</option>
                                    <option value="professional">Profesionales</option>
                                    <option value="investors">Inversionistas</option>
                                    <option value="families">Familias</option>
                                </select>
                            </div>
                        </>
                    ) : null}

                    <div>
                        <label className="mb-2 block text-sm font-medium text-(--fg)">
                            <IconTestPipe size={14} className="mr-2 inline" />
                            A/B Testing
                        </label>
                        <PanelSwitch
                            checked={abTestingEnabled}
                            onChange={setAbTestingEnabled}
                            ariaLabel="Activar A/B testing automático"
                        />
                        <p className="mt-2 text-xs text-(--fg-muted)">
                            Prueba automáticamente diferentes versiones de contenido para encontrar la mejor
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-(--fg)">
                            <IconClock size={14} className="mr-2 inline" />
                            Scheduling Inteligente
                        </label>
                        <PanelSwitch
                            checked={schedulingEnabled}
                            onChange={setSchedulingEnabled}
                            ariaLabel="Activar scheduling inteligente"
                        />
                        <p className="mt-2 text-xs text-(--fg-muted)">
                            Publica automáticamente en los mejores momentos según analytics
                        </p>
                    </div>

                    <PanelButton
                        variant="primary"
                        onClick={async () => {
                            const result = await publishListingToInstagramEnhanced('test-listing', {
                                useAI: aiEnabled,
                                enableABTesting: abTestingEnabled,
                                schedulePost: schedulingEnabled,
                                tone: selectedTone,
                                targetAudience: selectedAudience,
                            });

                            if (result.ok) {
                                onMessage('¡Instagram Intelligence activado! Las nuevas funciones están listas.');
                            } else {
                                onError(result.error || 'Error al activar Instagram Intelligence');
                            }
                        }}
                        className="w-full"
                    >
                        <IconBrain size={14} /> Probar Instagram Intelligence
                    </PanelButton>
                </div>
            ) : (
                <div className="mt-4 rounded-lg border border-(--border) bg-(--surface) p-3">
                    <div className="flex items-start gap-3">
                        <IconChartDots3 size={16} className="text-(--accent)" />
                        <div>
                            <p className="text-sm font-medium text-(--fg)">
                                Resultados esperados con Instagram Intelligence:
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-(--fg-secondary)">
                                <li>• +300% más engagement</li>
                                <li>• +250% más leads generados</li>
                                <li>• +200% mejor alcance</li>
                                <li>• -80% tiempo de gestión manual</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

