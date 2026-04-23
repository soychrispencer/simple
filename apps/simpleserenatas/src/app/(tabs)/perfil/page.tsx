'use client';

import { useState, useEffect } from 'react';
import { 
  IconUser, 
  IconMapPin,
  IconStar,
  IconSettings,
  IconChevronRight,
  IconLogout,
  IconEdit,
  IconMusic,
  IconBriefcase,
  IconClock
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';

interface ProfileStats {
  rating: number;
  totalSerenatas: number;
  completedSerenatas: number;
}

const menuItems = [
  { icon: IconUser, label: 'Editar Perfil', href: '/musician/edit' },
  { icon: IconMusic, label: 'Mi Instrumento', href: '/musician/edit' },
  { icon: IconMapPin, label: 'Mi Ubicación', href: '/musician/edit' },
  { icon: IconClock, label: 'Disponibilidad', href: '/musician/edit' },
  { icon: IconBriefcase, label: 'Historial de Trabajo', href: '/agenda' },
  { icon: IconStar, label: 'Mis Calificaciones', href: '/perfil' },
  { icon: IconSettings, label: 'Configuración', href: '/perfil' },
];

export default function PerfilPage() {
  const { user, musicianProfile, logout } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/stats`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.ok && data.stats) {
          setStats(data.stats);
        }
      } catch {
        showToast('Error al cargar estadísticas', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [showToast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <IconUser size={40} className="text-zinc-400" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{user?.name || 'Usuario'}</h2>
                <p className="text-zinc-500 capitalize">{musicianProfile?.instrument || 'Músico'} · {musicianProfile?.experienceYears || 0} años exp.</p>
              </div>
              <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <IconEdit size={20} className="text-zinc-500" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                musicianProfile?.isAvailable 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-zinc-100 text-zinc-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  musicianProfile?.isAvailable ? 'bg-green-500' : 'bg-zinc-400'
                }`} />
                {musicianProfile?.isAvailable ? 'Disponible' : 'No disponible'}
              </span>
              <span className="text-sm text-zinc-500">{musicianProfile?.comuna || 'Sin ubicación'}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900">{stats?.rating || musicianProfile?.rating || 0}</p>
            <p className="text-xs text-zinc-500">Calificación</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900">{stats?.completedSerenatas || 0}</p>
            <p className="text-xs text-zinc-500">Serenatas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900">{(stats?.totalSerenatas || 0) - (stats?.completedSerenatas || 0)}</p>
            <p className="text-xs text-zinc-500">Pendientes</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-zinc-100' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                  <Icon size={20} className="text-zinc-600" />
                </div>
                <span className="font-medium text-zinc-900">{item.label}</span>
              </div>
              <IconChevronRight size={20} className="text-zinc-400" />
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <button className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-medium hover:bg-red-50 rounded-2xl transition-colors">
        <IconLogout size={20} />
        Cerrar Sesión
      </button>

      {/* Version */}
      <p className="text-center text-xs text-zinc-400">
        SimpleSerenatas v1.0.0
      </p>
    </div>
  );
}
