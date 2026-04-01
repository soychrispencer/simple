'use client';

import { useState } from 'react';
import { IconSparkles, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui';
import type { QuickBasicData, GeneratedText } from './types';

interface Props {
    data: QuickBasicData;
    generatedText: GeneratedText | null;
    isGenerating: boolean;
    onUpdateText: (titulo: string, descripcion: string) => void;
    onGenerateText: () => void;
    isExtended?: boolean;
    errors?: Record<string, string>;
}

function LoadingDots() {
    return (
        <div className="flex items-center justify-center gap-2 py-8">
            <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-2 w-2 rounded-full"
                        style={{ background: 'var(--accent)', animation: 'bounce 0.8s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
            <span className="ml-2 text-xs font-medium text-(--fg-muted)">Generando con IA…</span>
            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.4; }
                    50% { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export default function Step3Text({ data, generatedText, isGenerating, onUpdateText, onGenerateText, isExtended = false, errors = {} }: Props) {
    const [editing, setEditing] = useState(false);
    const [editTitulo, setEditTitulo] = useState('');
    const [editDesc, setEditDesc] = useState('');

    function startEdit() {
        if (!generatedText) return;
        setEditTitulo(generatedText.titulo);
        setEditDesc(generatedText.descripcion);
        setEditing(true);
    }

    function saveEdit() {
        onUpdateText(editTitulo, editDesc);
        setEditing(false);
    }

    return (
        <div className="flex flex-col gap-4">
            {isGenerating ? (
                <LoadingDots />
            ) : generatedText ? (
                <div className="rounded-2xl border p-4 bg-(--accent-soft) border-(--accent-border) animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <IconSparkles size={14} className="text-(--accent)" />
                            <span className="text-xs font-semibold text-(--accent)">Generado con IA</span>
                        </div>
                        {!editing && (
                            <div className="flex items-center gap-1.5 text-(--accent)">
                                <button type="button" onClick={onGenerateText} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border border-(--border) bg-(--surface) text-(--fg-muted) hover:text-(--fg)">
                                    <IconSparkles size={11} /> Regenerar
                                </button>
                                <button type="button" onClick={startEdit} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border border-(--accent-border) bg-(--surface)">
                                    <IconEdit size={11} /> Editar
                                </button>
                            </div>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-(--fg-muted) block mb-1">TÍTULO</label>
                                <input className="form-input" value={editTitulo} maxLength={70} onChange={(e) => setEditTitulo(e.target.value)} />
                                <p className="text-[10px] mt-1 text-(--fg-muted) text-right">{editTitulo.length}/70</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-(--fg-muted) block mb-1">DESCRIPCIÓN</label>
                                <textarea className="form-textarea resize-none" value={editDesc} rows={6} maxLength={2000} onChange={(e) => setEditDesc(e.target.value)} />
                                <p className="text-[10px] mt-1 text-(--fg-muted) text-right">{editDesc.length}/2000</p>
                            </div>
                            <button type="button" onClick={saveEdit} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold bg-(--accent) text-(--accent-contrast) hover:opacity-90 transition-opacity">
                                <IconCheck size={14} /> Guardar cambios
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-(--accent) mb-1">Título</p>
                                <p className="text-[15px] font-semibold leading-tight text-(--fg)">{generatedText.titulo}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-(--fg-muted) mb-1">Descripción</p>
                                <p className="text-sm leading-relaxed text-(--fg-secondary) whitespace-pre-wrap">{generatedText.descripcion}</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-3 text-center bg-(--accent-soft) border-(--accent-border)">
                    <IconSparkles size={28} className="text-(--accent)" />
                    <div>
                        <p className="text-sm font-semibold text-(--fg)">Generar anuncio profesional</p>
                        <p className="text-xs mt-1 text-(--fg-muted) max-w-[280px]">Utilizamos IA para crear el título y la descripción optimizada basándonos en los datos del vehículo.</p>
                    </div>
                    <PanelButton variant="primary" onClick={onGenerateText} className="shadow-lg">
                        <IconSparkles size={14} /> Generar con IA
                    </PanelButton>
                </div>
            )}
        </div>
    );
}
