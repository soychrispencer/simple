'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconBell, 
  IconCheck, 
  IconTrash, 
  IconArrowLeft,
  IconLoader2,
  IconMusic,
  IconUsers,
  IconRoute,
  IconCurrencyDollar,
  IconInfoCircle
} from '@tabler/icons-react';
import Link from 'next/link';
import { useNotifications } from '@/hooks';

const typeConfig = {
  new_request: { icon: IconMusic, color: 'bg-rose-100 text-rose-600', label: 'Nueva solicitud' },
  group_invite: { icon: IconUsers, color: 'bg-blue-100 text-blue-600', label: 'Invitación' },
  route_update: { icon: IconRoute, color: 'bg-green-100 text-green-600', label: 'Actualización de ruta' },
  payment: { icon: IconCurrencyDollar, color: 'bg-amber-100 text-amber-600', label: 'Pago' },
  system: { icon: IconInfoCircle, color: 'bg-zinc-100 text-zinc-600', label: 'Sistema' },
};

export default function NotificacionesPage() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = activeFilter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.serenataId) {
      router.push(`/serenata/${notification.serenataId}`);
    } else if (notification.groupId) {
      router.push(`/grupo/${notification.groupId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <IconLoader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/inicio"
              className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <IconArrowLeft className="w-5 h-5 text-zinc-700" />
            </Link>
            <div className="flex-1">
              <h1 className="font-semibold text-zinc-900">Notificaciones</h1>
              <p className="text-sm text-zinc-500">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-sm text-rose-600 font-medium hover:text-rose-700"
              >
                <IconCheck className="w-4 h-4" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === 'all'
                  ? 'bg-rose-500 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === 'unread'
                  ? 'bg-rose-500 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              Sin leer {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <IconBell className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">
              {activeFilter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
            </h3>
            <p className="text-zinc-500">
              {activeFilter === 'unread' 
                ? '¡Estás al día!' 
                : 'Las notificaciones aparecerán aquí cuando tengas actividad'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.system;
              const Icon = config.icon;
              
              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all ${
                    notification.isRead 
                      ? 'border-zinc-100' 
                      : 'border-rose-200 bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-zinc-500 mb-1">
                            {config.label}
                          </p>
                          <h4 className={`font-medium ${notification.isRead ? 'text-zinc-700' : 'text-zinc-900'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-zinc-500 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-zinc-400">
                            {new Date(notification.createdAt).toLocaleDateString('es-CL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          
                          <div className="flex gap-1">
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors"
                                title="Marcar como leída"
                              >
                                <IconCheck className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors"
                              title="Eliminar"
                            >
                              <IconTrash className="w-4 h-4 text-zinc-400 hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {(notification.serenataId || notification.groupId) && (
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="mt-3 text-sm text-rose-600 font-medium hover:text-rose-700"
                        >
                          Ver detalles →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
