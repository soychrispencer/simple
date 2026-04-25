'use client';

import { useState } from 'react';
import { 
    IconPlus, 
    IconUser, 
    IconTrash,
    IconMicrophone,
    IconCheck,
    IconX,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface Musician {
    id: string;
    name: string;
    instrument: string;
    phone?: string;
    isActive: boolean;
}

const instruments = [
    'Trompeta', 'Voz', 'Guitarra', 'Vihuela', 'Guitarrón', 
    'Violín', 'Acordeón', 'Percusión'
];

export default function CuadrillaPage() {
    const { captainProfile } = useAuth();
    const [musicians, setMusicians] = useState<Musician[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMusician, setNewMusician] = useState({
        name: '',
        instrument: '',
        phone: '',
    });

    const handleAddMusician = () => {
        if (!newMusician.name || !newMusician.instrument) return;
        
        const musician: Musician = {
            id: Math.random().toString(36).substr(2, 9),
            ...newMusician,
            isActive: true,
        };
        
        setMusicians([...musicians, musician]);
        setNewMusician({ name: '', instrument: '', phone: '' });
        setShowAddForm(false);
    };

    const handleRemoveMusician = (id: string) => {
        setMusicians(musicians.filter(m => m.id !== id));
    };

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100">
                <h1 className="text-xl font-bold text-zinc-900">Mi Cuadrilla</h1>
                <p className="text-sm text-zinc-500">{musicians.length} musicos</p>
            </div>

            {/* Add Button */}
            <div className="px-6 py-4">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full bg-rose-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors"
                >
                    <IconPlus size={20} />
                    Agregar musico
                </button>
            </div>

            {/* Musicians List */}
            <div className="px-6 space-y-3">
                {musicians.length === 0 ? (
                    <div className="text-center py-8">
                        <IconUser size={48} className="mx-auto text-zinc-300 mb-3" />
                        <p className="text-zinc-500">No tienes musicos en tu cuadrilla</p>
                        <p className="text-sm text-zinc-400 mt-1">Agrega musicos para gestionar tu grupo</p>
                    </div>
                ) : (
                    musicians.map((musician) => (
                        <div key={musician.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                                    <IconMicrophone size={20} className="text-rose-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-zinc-900">{musician.name}</p>
                                    <p className="text-sm text-zinc-500">{musician.instrument}</p>
                                    {musician.phone && (
                                        <p className="text-xs text-zinc-400">{musician.phone}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveMusician(musician.id)}
                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                            >
                                <IconTrash size={18} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
                    <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-zinc-900">Agregar musico</h2>
                            <button onClick={() => setShowAddForm(false)}>
                                <IconX size={24} className="text-zinc-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={newMusician.name}
                                    onChange={(e) => setNewMusician({ ...newMusician, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                                    placeholder="Nombre del musico"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Instrumento</label>
                                <select
                                    value={newMusician.instrument}
                                    onChange={(e) => setNewMusician({ ...newMusician, instrument: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                                >
                                    <option value="">Selecciona instrumento</option>
                                    {instruments.map(i => (
                                        <option key={i} value={i}>{i}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Telefono (opcional)</label>
                                <input
                                    type="tel"
                                    value={newMusician.phone}
                                    onChange={(e) => setNewMusician({ ...newMusician, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>

                            <button
                                onClick={handleAddMusician}
                                disabled={!newMusician.name || !newMusician.instrument}
                                className="w-full bg-rose-500 text-white py-3 rounded-xl font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
