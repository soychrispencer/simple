"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase/useSupabase";

type PubItem = { id: string; titulo: string; precio: number; estado: string; portada?: string };

export default function PanelHome() {
  const [mounted, setMounted] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [totalPublicaciones, setTotalPublicaciones] = React.useState(0);
  const [totalVentas, setTotalVentas] = React.useState(0);
  const [recientes, setRecientes] = React.useState<PubItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [profileStatus, setProfileStatus] = React.useState({
    profileComplete: false,
    accountVerified: false,
    planActive: false,
    documentsVerified: false
  });
  const { user } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();

  React.useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Primero obtener el perfil del usuario para conseguir su profile.id
        let profileQuery = supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (user.id) {
          console.log('[Panel] Usuario tiene ID, buscando por user_id:', user.id);
          // Usuario autenticado - buscar por user_id
          profileQuery = profileQuery.eq('user_id', user.id);
        } else if (user.email) {
          console.log('[Panel] Usuario no tiene ID, buscando por email:', user.email);
          // Usuario legacy - buscar por email
          profileQuery = profileQuery.eq('email', user.email);
        } else {
          // No hay información suficiente para identificar al usuario
          console.error('[Panel] No se puede identificar al usuario: no hay id ni email');
          console.log('[Panel] Objeto user completo:', user);
          setLoading(false);
          setMounted(true);
          return;
        }

        let { data: profiles, error: profileError } = await profileQuery;

        console.log('[Panel] Resultado consulta perfil:', { profiles, profileError });

        // Si no se encontró perfil por user_id, intentar por email (para usuarios con perfiles huérfanos)
        if ((!profiles || profiles.length === 0) && user.email && user.id) {
          console.log('[Panel] No se encontró perfil por user_id, intentando por email:', user.email);
          const { data: emailProfiles, error: emailError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', user.email)
            .limit(1);

          if (!emailError && emailProfiles && emailProfiles.length > 0) {
            console.log('[Panel] Encontrado perfil huérfano por email:', emailProfiles[0]);
            profiles = emailProfiles;
            profileError = null;
          }
        }

        if (profileError) {
          console.error('[Panel] Error obteniendo perfil:', profileError);
          setLoading(false);
          setMounted(true);
          return;
        }

        if (!profiles || profiles.length === 0) {
          console.log('[Panel] No se encontró perfil para el usuario, usando valores por defecto');
          // Usuario no tiene perfil, mostrar valores por defecto
          setTotalPublicaciones(0);
          setTotalVentas(0);
          setRecientes([]);
          setUnread(0);
          setProfileStatus({
            profileComplete: false,
            accountVerified: false,
            planActive: false,
            documentsVerified: false
          });
          setLoading(false);
          setMounted(true);
          return;
        }

        const profileId = profiles[0].id;
        console.log('[Panel] Usando profileId:', profileId);

        // Obtener total de publicaciones activas
        let totalPublicaciones = 0;
        try {
          const { count: totalCount, error: countError } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', profileId)
            .eq('status', 'active')
            .not('published_at', 'is', null);

          if (countError) {
            console.error('Error obteniendo total publicaciones:', countError);
            totalPublicaciones = 0;
          } else {
            totalPublicaciones = totalCount || 0;
          }
        } catch (error) {
          console.error('Error en consulta de publicaciones:', error);
          totalPublicaciones = 0;
        }

        // Obtener publicaciones recientes (últimas 5)
        const { data: vehicles, error: vehiclesError } = await supabase
          .from('vehicles')
          .select(`
            id, title, price, published_at, created_at,
            vehicle_media(url, is_primary)
          `)
          .eq('owner_id', profileId)
          .eq('status', 'active')
          .not('published_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5);

        if (vehiclesError) {
          console.error('Error obteniendo publicaciones recientes:', vehiclesError);
        } else {
          const mappedRecientes: PubItem[] = (vehicles || []).map((v: any) => {
            // Encontrar la imagen primaria o la primera disponible
            const primaryImage = v.vehicle_media?.find((img: any) => img.is_primary)?.url ||
                               v.vehicle_media?.[0]?.url || '';
            
            return {
              id: v.id,
              titulo: v.title,
              precio: v.price || 0,
              estado: 'Publicado',
              portada: primaryImage
            };
          });
          setRecientes(mappedRecientes);
        }

        // Obtener ventas recientes del usuario
        let totalVentas = 0;
        try {
          const { count: salesCount, error: salesError } = await supabase
            .from('vehicle_sales')
            .select('*', { count: 'exact', head: true })
            .eq('seller_profile_id', user.id);

          if (salesError) {
            console.error('Error obteniendo ventas:', salesError);
            totalVentas = 0;
          } else {
            totalVentas = salesCount || 0;
          }
        } catch (error) {
          console.error('Error en consulta de ventas:', error);
          totalVentas = 0;
        }

        // Actualizar estado con los valores obtenidos
        setTotalPublicaciones(totalPublicaciones);
        setTotalVentas(totalVentas);

        // Verificar suscripción activa del usuario
        let planActive = false;
        try {
          const { data: subscriptions, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('status, current_period_end')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1);

          if (subscriptionError) {
            console.error('Error verificando suscripción:', subscriptionError);
            planActive = false;
          } else {
            planActive = subscriptions && subscriptions.length > 0 && subscriptions[0].status === 'active';
          }
        } catch (error) {
          console.error('Error verificando suscripción:', error);
          planActive = false;
        }

        // Mensajes no leídos: por ahora 0 hasta implementar tabla de mensajes
        setUnread(0); // TODO: implementar tabla de mensajes/notifications

        // Evaluar estado del perfil
        const profileComplete = user?.user_metadata?.full_name && user?.user_metadata?.phone;
        const accountVerified = user?.email_confirmed_at !== null;
        const documentsVerified = false; // TODO: implementar verificación de documentos

        setProfileStatus({
          profileComplete: !!profileComplete,
          accountVerified: !!accountVerified,
          planActive,
          documentsVerified
        });

      } catch (error) {
        console.error('Error en fetchData:', error);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    fetchData();
  }, [user, supabase]);

  return (
    <PanelPageLayout
      header={{
        title: "Mi Panel",
        description: "Bienvenido. Aquí tienes un resumen.",
      }}
    >

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200 ring-1 ring-black/5 dark:ring-white/5 p-5">
          <div className="text-sm text-gray-600 dark:text-gray-300">Publicaciones Activas</div>
          <div className="text-3xl font-bold text-black dark:text-white">{loading ? '...' : totalPublicaciones}</div>
          <Link className="link-base link-plain text-sm mt-2 inline-block" href="/panel/publicaciones">Ver todas</Link>
        </div>

        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition-shadow ring-1 ring-black/5 dark:ring-white/5 p-5">
          <div className="text-sm text-gray-600 dark:text-gray-300">Mensajes</div>
          <div className="text-3xl font-bold text-black dark:text-white">{mounted ? unread : 0}</div>
          <Link className="link-base link-plain text-sm mt-2 inline-block" href="/panel/mensajes">Ir a mensajes</Link>
        </div>

        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition-shadow ring-1 ring-black/5 dark:ring-white/5 p-5">
          <div className="text-sm text-gray-600 dark:text-gray-300">En Marketplaces</div>
          <div className="text-3xl font-bold text-black dark:text-white">{loading ? '...' : 0}</div>
          <Link className="link-base link-plain text-sm mt-2 inline-block" href="/panel/marketplaces">Gestionar</Link>
        </div>

        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition-shadow ring-1 ring-black/5 dark:ring-white/5 p-5">
          <div className="text-sm text-gray-600 dark:text-gray-300">Ventas Recientes</div>
          <div className="text-3xl font-bold text-black dark:text-white">{loading ? '...' : totalVentas}</div>
          <Link className="link-base link-plain text-sm mt-2 inline-block" href="/ventas">Ver ventas</Link>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition-shadow ring-1 ring-black/5 dark:ring-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-black dark:text-white">Estado de la Cuenta</h3>
            </div>
            <div className="space-y-3">
              {/* Completar Perfil */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${profileStatus.profileComplete ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  <div>
                    <div className="text-sm font-medium text-black dark:text-white">Completar perfil</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {profileStatus.profileComplete ? 'Perfil completo' : 'Falta información personal'}
                    </div>
                  </div>
                </div>
                {!profileStatus.profileComplete && (
                  <Button variant="primary" size="sm" onClick={() => router.push('/panel/perfil')}>
                    Completar
                  </Button>
                )}
              </div>

              {/* Verificar Cuenta */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${profileStatus.accountVerified ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <div className="text-sm font-medium text-black dark:text-white">Verificar cuenta</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {profileStatus.accountVerified ? 'Cuenta verificada' : 'Confirma tu email'}
                    </div>
                  </div>
                </div>
                {!profileStatus.accountVerified && (
                  <Button variant="primary" size="sm">
                    Verificar
                  </Button>
                )}
              </div>

              {/* Plan Activo */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${profileStatus.planActive ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <div>
                    <div className="text-sm font-medium text-black dark:text-white">Plan de publicación</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {profileStatus.planActive ? 'Plan activo - Publicación ilimitada' : 'Sin plan activo - Limitado'}
                    </div>
                  </div>
                </div>
                {!profileStatus.planActive && (
                  <Button variant="primary" size="sm">
                    Activar Plan
                  </Button>
                )}
              </div>

              {/* Documentos Verificados */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${profileStatus.documentsVerified ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <div className="text-sm font-medium text-black dark:text-white">Documentos verificados</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {profileStatus.documentsVerified ? 'Documentos verificados' : 'Subir documentos para verificación'}
                    </div>
                  </div>
                </div>
                {!profileStatus.documentsVerified && (
                  <Button variant="primary" size="sm">
                    Subir
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition-shadow ring-1 ring-black/5 dark:ring-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-black dark:text-white">Publicaciones recientes</h3>
              <Link className="link-base link-plain text-sm" href="/panel/publicaciones">Ver todas</Link>
            </div>
            {!mounted || loading || recientes.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {loading ? 'Cargando...' : 'Aún no tienes publicaciones.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {recientes.map((i: PubItem) => (
                  <div key={i.id} className="py-3 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                      {i.portada ? (
                        <img src={i.portada} alt={i.titulo} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-gray-400">Sin imagen</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-black dark:text-white">{i.titulo}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">${i.precio}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{i.estado}</div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/panel/publicaciones/${i.id}`)}
                    >
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Tarjeta de horarios de atención eliminada por solicitud */}
      </PanelPageLayout>
    );
  }
