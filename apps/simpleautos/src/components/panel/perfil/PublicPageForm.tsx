import React, { useEffect, useState } from "react";
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
import { Input, Select, Button, Modal, useToast, TextArea } from "@simple/ui";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { useAuth } from "@/context/AuthContext";
import { IconUser, IconGlobe, IconMapPin, IconShare, IconClock } from "@tabler/icons-react";
import ProfileAvatarUploader from "../../ui/uploader/ProfileAvatarUploader";
import { logError } from "@/lib/logger";
import { sortRegionsNorthToSouth } from "@/lib/geo/sortRegionsNorthToSouth";

function isPlaceholderSlug(value: string | null | undefined) {
  if (!value) return false;
  return /^u-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 20);
}

function isValidSlug(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,19}$/.test(value) && !isPlaceholderSlug(value);
}

type HorarioMap = Record<string, { inicio: string; fin: string; cerrado: boolean }>;
type Especial = { id?: string; fecha: string; inicio: string; fin: string; cerrado: boolean };

type FormState = {
  horarioEspecial: Especial[];
  nombre_publico: string;
  username: string;
  pagina_web: string;
  descripcion: string;
  horario: HorarioMap;
  ubicacion_mapa?: string;
  direccion: string;
  region_id: string;
  commune_id: string;
  tiktok: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  whatsapp: string;
  whatsapp_type: string;
  youtube: string;
  twitter: string;
  anios_rubro?: string;
  puntuacion?: string;
  galeria?: any[];
};

const PublicPageForm: React.FC<{ user: any; onSave?: (data: any) => void; coverModalOpen?: boolean }> = ({ user: userProp, onSave: _onSave, coverModalOpen = false }) => {
  const { addToast } = useToast();
  const { user: ctxUser, refresh: _refreshAuth } = useAuth();
  const supabase = useSupabase();

  const hasCompanyInfo = Boolean(
    userProp?.company_id ||
      userProp?.company ||
      String(userProp?.user_type || '') === 'company' ||
      ['dealer', 'company'].includes(String(userProp?.user_role || ''))
  );

  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [publicPreferences, setPublicPreferences] = useState<Record<string, any>>({});
  const [horario247, setHorario247] = useState<boolean>(!!userProp?.horario247);

  const initialHorario: HorarioMap = (userProp?.horario && typeof userProp.horario === 'object') ? userProp.horario : {};

  const [form, setForm] = useState<FormState>({
    horarioEspecial: [],
    nombre_publico: userProp?.public_name || userProp?.nombre_publico || "",
    username: userProp?.username || "",
    pagina_web: userProp?.website || userProp?.pagina_web || "",
    descripcion: userProp?.description || userProp?.descripcion || "",
    horario: initialHorario,
    ubicacion_mapa: userProp?.ubicacion_mapa || "",
    direccion: userProp?.address || userProp?.direccion || "",
    region_id: typeof userProp?.region_id === 'string' ? userProp.region_id : userProp?.region_id ? String(userProp.region_id) : "",
    commune_id: typeof userProp?.commune_id === 'string'
      ? userProp.commune_id
      : userProp?.commune_id
      ? String(userProp.commune_id)
      : (typeof userProp?.comuna_id === 'string'
        ? userProp.comuna_id
        : userProp?.comuna_id
        ? String(userProp.comuna_id)
        : ""),
    tiktok: userProp?.tiktok || "",
    facebook: userProp?.facebook || "",
    instagram: userProp?.instagram || "",
    linkedin: userProp?.linkedin || "",
    whatsapp: userProp?.whatsapp || "",
    whatsapp_type: userProp?.whatsapp_type || (hasCompanyInfo ? "empresa" : "personal"),
    youtube: userProp?.youtube || "",
    twitter: userProp?.twitter || "",
    anios_rubro: userProp?.anios_rubro || "",
    puntuacion: userProp?.puntuacion || "",
    galeria: userProp?.galeria || [],
  });

  const [eliminadosEspecial, setEliminadosEspecial] = useState<string[]>([]);
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [regiones, setRegiones] = useState<{ label: string; value: string }[]>([]);
  const [comunas, setComunas] = useState<{ label: string; value: string }[]>([]);

  const [usernameEditorOpen, setUsernameEditorOpen] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const effectiveUserId = userProp?.id || ctxUser?.id;
      if (!effectiveUserId) return;

      const { data: publicProfile, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('owner_profile_id', effectiveUserId)
        .maybeSingle();

      if (error) {
        logError('Error cargando perfil público', error);
        return;
      }

      if (!publicProfile?.id) return;

      setPublicProfileId(publicProfile.id);
      const preferences = (publicProfile as any)?.preferences || {};
      setPublicPreferences(preferences);
      setHorario247(Boolean(preferences?.horario247));

      const [especialesRes, horarioRes] = await Promise.all([
        supabase
          .from('special_schedules')
          .select('id, date, start_time, end_time, closed')
          .eq('public_profile_id', publicProfile.id)
          .order('date', { ascending: true }),
        supabase
          .from('schedules')
          .select('*')
          .eq('public_profile_id', publicProfile.id),
      ]);

      const horarioObj: { [dia: string]: { inicio: string; fin: string; cerrado: boolean } } = {};
      const horarioData: any[] | null = Array.isArray(horarioRes.data) ? horarioRes.data : null;
      if (horarioData) {
        for (const h of horarioData) {
          horarioObj[h.weekday] = { inicio: h.start_time || '', fin: h.end_time || '', cerrado: !!h.closed };
        }
      }

      const especialesData: any[] | null = Array.isArray(especialesRes.data) ? especialesRes.data : null;
      const especiales: Especial[] = [];
      if (especialesData) {
        const uniq: Record<string, Especial> = {};
        for (const e of especialesData) {
          if (!e.date || uniq[e.date]) continue;
          uniq[e.date] = {
            id: e.id,
            fecha: e.date,
            inicio: e.start_time || '',
            fin: e.end_time || '',
            cerrado: !!e.closed,
          };
        }
        especiales.push(...Object.values(uniq));
      }

      setForm((f) => ({
        ...f,
        nombre_publico: f.nombre_publico || publicProfile.public_name || '',
        username: (() => {
          const candidate = f.username || publicProfile.slug || '';
          return isPlaceholderSlug(candidate) ? '' : candidate;
        })(),
        pagina_web: f.pagina_web || publicProfile.website || '',
        descripcion: f.descripcion || publicProfile.headline || publicProfile.bio || '',
        direccion: f.direccion || publicProfile.address || '',
        region_id: f.region_id || (publicProfile.region_id ? String(publicProfile.region_id) : ''),
        commune_id: f.commune_id || (publicProfile.commune_id ? String(publicProfile.commune_id) : ''),
        facebook: publicProfile.facebook || f.facebook,
        instagram: publicProfile.instagram || f.instagram,
        linkedin: publicProfile.linkedin || f.linkedin,
        tiktok: publicProfile.tiktok || f.tiktok,
        whatsapp: f.whatsapp || publicProfile.whatsapp || ctxUser?.whatsapp || userProp?.whatsapp || '',
        whatsapp_type:
          publicProfile.whatsapp_type
          || f.whatsapp_type
          || (hasCompanyInfo ? 'empresa' : (ctxUser?.whatsapp || userProp?.whatsapp ? 'personal' : 'personal')),
        youtube: publicProfile.youtube || f.youtube,
        twitter: publicProfile.twitter || f.twitter,
        horario: horarioObj,
        horarioEspecial: especiales,
      }));
    }

    fetchData();
  }, [hasCompanyInfo, userProp, ctxUser, supabase]);

  async function handleCheckUsernameAvailability() {
    const effectiveUserId = userProp?.id || ctxUser?.id;
    const candidate = normalizeSlug(form.username || '');

    if (!candidate) {
      setUsernameStatus('idle');
      setUsernameMessage('Escribe un nombre de usuario');
      return;
    }

    if (!isValidSlug(candidate)) {
      setUsernameStatus('unavailable');
      setUsernameMessage('Formato inválido. Usa 3-20: letras, números, puntos, guiones y guion bajo.');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage(null);

    const { data, error } = await supabase
      .from('public_profiles')
      .select('owner_profile_id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) {
      setUsernameStatus('idle');
      setUsernameMessage('No se pudo verificar. Intenta nuevamente.');
      return;
    }

    const ownerId = (data as any)?.owner_profile_id as string | null | undefined;
    if (!ownerId || (effectiveUserId && ownerId === effectiveUserId)) {
      setUsernameStatus('available');
      setUsernameMessage('Disponible');
      // Normalizamos el input para que lo que se guarde sea coherente
      setForm((f) => ({ ...f, username: candidate }));
      return;
    }

    setUsernameStatus('unavailable');
    setUsernameMessage('No disponible');
  }

  async function handleSaveUsername() {
    if (savingUsername) return;
    setSavingUsername(true);
    try {
      const effectiveUserId = userProp?.id || ctxUser?.id;
      if (!effectiveUserId) {
        addToast('Usuario no disponible aún.', { type: 'error' });
        setSavingUsername(false);
        return;
      }

      const candidate = normalizeSlug(form.username || '');
      if (!isValidSlug(candidate) || usernameStatus !== 'available') {
        addToast('Primero verifica disponibilidad.', { type: 'error' });
        setSavingUsername(false);
        return;
      }

      // Find or create public profile
      let targetId = publicProfileId;
      if (!targetId) {
        const { data: existing } = await supabase
          .from('public_profiles')
          .select('id')
          .eq('owner_profile_id', effectiveUserId)
          .maybeSingle();
        targetId = existing?.id || null;
      }

      if (!targetId) {
        const { data: created, error: insertError } = await supabase
          .from('public_profiles')
          .insert({
            owner_profile_id: effectiveUserId,
            profile_type: 'business',
            slug: candidate,
          })
          .select('id')
          .single();
        if (insertError || !created?.id) {
          throw new Error(insertError?.message || 'No se pudo crear el perfil público');
        }
        targetId = created.id;
      } else {
        const { error: updateError } = await supabase
          .from('public_profiles')
          .update({ slug: candidate })
          .eq('id', targetId);
        if (updateError) throw new Error(updateError.message);
      }

      // Sync profiles.username (para que links no vuelvan a u-<uuid>)
      await supabase
        .from('profiles')
        .upsert({ id: effectiveUserId, username: candidate }, { onConflict: 'id' });

      setPublicProfileId(targetId);
      setUsernameEditorOpen(false);
      addToast('Nombre de usuario guardado', { type: 'success' });
      await _refreshAuth?.(true);
      _onSave?.({ slug: candidate, username: candidate });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      addToast('Error guardando nombre de usuario: ' + message, { type: 'error' });
    } finally {
      setSavingUsername(false);
    }
  }

  // Guardar redes sociales en la tabla redes_sociales (flujo robusto con verificación de user_id y profile_id)

  async function handleSaveSocial(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (savingSocial) return;
    setSavingSocial(true);

    try {
      const effectiveUserId = userProp?.id || ctxUser?.id;
      if (!effectiveUserId) {
        addToast('Usuario no disponible aún.', { type: 'error' });
        setSavingSocial(false);
        return;
      }

      const candidate = normalizeSlug(form.username || '');
      const slug = isValidSlug(candidate) ? candidate : null;

      // Ensure the base profile exists with core fields
      await supabase
        .from('profiles')
        .upsert({
          id: effectiveUserId,
          whatsapp: form.whatsapp || null,
          ...(slug ? { username: slug } : {}),
        }, { onConflict: 'id' });

      // Find or create a public_profile row
      let targetId = publicProfileId;
      if (!targetId) {
        const { data: existing } = await supabase
          .from('public_profiles')
          .select('id')
          .eq('owner_profile_id', effectiveUserId)
          .maybeSingle();
        targetId = existing?.id || null;
      }

      if (!targetId) {
        if (!slug) {
          addToast('Define un nombre de usuario válido en Información Pública.', { type: 'error' });
          setSavingSocial(false);
          return;
        }
        const { data: created, error: insertError } = await supabase
          .from('public_profiles')
          .insert({
            owner_profile_id: effectiveUserId,
            profile_type: 'business',
            slug,
            public_name: form.nombre_publico || userProp?.public_name || null,
            headline: form.descripcion || null,
            bio: form.descripcion || null,
            website: form.pagina_web || null,
            address: form.direccion || null,
            region_id: form.region_id || null,
            commune_id: form.commune_id || null,
            whatsapp: form.whatsapp || null,
            whatsapp_type: form.whatsapp_type || 'personal',
            facebook: form.facebook || null,
            instagram: form.instagram || null,
            linkedin: form.linkedin || null,
            tiktok: form.tiktok || null,
            twitter: form.twitter || null,
            youtube: form.youtube || null,
          })
          .select('id')
          .single();
        if (insertError || !created?.id) {
          throw new Error(insertError?.message || 'No se pudo crear el perfil público');
        }
        targetId = created.id;
      } else {
        const { error: updateError } = await supabase
          .from('public_profiles')
          .update({
            ...(slug ? { slug } : {}),
            public_name: form.nombre_publico || null,
            headline: form.descripcion || null,
            bio: form.descripcion || null,
            website: form.pagina_web || null,
            address: form.direccion || null,
            region_id: form.region_id || null,
            commune_id: form.commune_id || null,
            whatsapp: form.whatsapp || null,
            whatsapp_type: form.whatsapp_type || 'personal',
            facebook: form.facebook || null,
            instagram: form.instagram || null,
            linkedin: form.linkedin || null,
            tiktok: form.tiktok || null,
            twitter: form.twitter || null,
            youtube: form.youtube || null,
          })
          .eq('id', targetId);
        if (updateError) throw new Error(updateError.message);
      }

      setPublicProfileId(targetId);
      addToast('Redes sociales actualizadas', { type: 'success' });
      _onSave?.({ slug: slug || undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      addToast('Error guardando redes: ' + message, { type: 'error' });
    } finally {
      setSavingSocial(false);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (savingPublic) return;
    setSavingPublic(true);

    try {
      const effectiveUserId = userProp?.id || ctxUser?.id;
      if (!effectiveUserId) {
        addToast('Usuario no disponible aún.', { type: 'error' });
        setSavingPublic(false);
        return;
      }

      const candidate = normalizeSlug(form.username || '');
      const slug = isValidSlug(candidate) ? candidate : null;

      // Upsert base profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: effectiveUserId,
          whatsapp: form.whatsapp || null,
          ...(slug ? { username: slug } : {}),
        }, { onConflict: 'id' });
      if (profileError) throw new Error(profileError.message);

      // Find or create public profile
      let targetId = publicProfileId;
      if (!targetId) {
        const { data: existing } = await supabase
          .from('public_profiles')
          .select('id')
          .eq('owner_profile_id', effectiveUserId)
          .maybeSingle();
        targetId = existing?.id || null;
      }

      if (!targetId) {
        if (!slug) {
          addToast('Define un nombre de usuario válido en Información Pública.', { type: 'error' });
          setSavingPublic(false);
          return;
        }
        const { data: created, error: insertError } = await supabase
          .from('public_profiles')
          .insert({
            owner_profile_id: effectiveUserId,
            profile_type: 'business',
            slug,
            public_name: form.nombre_publico || userProp?.public_name || null,
            headline: form.descripcion || null,
            bio: form.descripcion || null,
            website: form.pagina_web || null,
            address: form.direccion || null,
            region_id: form.region_id || null,
            commune_id: form.commune_id || null,
            whatsapp: form.whatsapp || null,
            whatsapp_type: form.whatsapp_type || 'personal',
            facebook: form.facebook || null,
            instagram: form.instagram || null,
            linkedin: form.linkedin || null,
            tiktok: form.tiktok || null,
            twitter: form.twitter || null,
            youtube: form.youtube || null,
          })
          .select('id')
          .single();
        if (insertError || !created?.id) {
          throw new Error(insertError?.message || 'No se pudo crear el perfil público');
        }
        targetId = created.id;
      } else {
        const { error: updateError } = await supabase
          .from('public_profiles')
          .update({
            ...(slug ? { slug } : {}),
            public_name: form.nombre_publico || null,
            headline: form.descripcion || null,
            bio: form.descripcion || null,
            website: form.pagina_web || null,
            address: form.direccion || null,
            region_id: form.region_id || null,
            commune_id: form.commune_id || null,
            whatsapp: form.whatsapp || null,
            whatsapp_type: form.whatsapp_type || 'personal',
            facebook: form.facebook || null,
            instagram: form.instagram || null,
            linkedin: form.linkedin || null,
            tiktok: form.tiktok || null,
            twitter: form.twitter || null,
            youtube: form.youtube || null,
          })
          .eq('id', targetId);
        if (updateError) throw new Error(updateError.message);
      }

      setPublicProfileId(targetId);
      addToast('Información pública actualizada', { type: 'success' });
      _onSave?.({ slug: slug || undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      addToast('Error guardando información pública: ' + message, { type: 'error' });
    } finally {
      setSavingPublic(false);
    }
  }
  // Helper: eliminar día especial por índice
  async function handleRemoveEspecial(idx: number) {
    const target = form.horarioEspecial[idx];
    if (!target) return;
    if (!publicProfileId) {
      addToast('Primero guarda tu información pública.', { type: 'error' });
      return;
    }
    let delErr = null;
    let eliminado = false;
    if (target.id) {
      // Eliminar por id
      const { error } = await supabase
        .from('special_schedules')
        .delete()
        .eq('id', target.id)
        .eq('public_profile_id', publicProfileId);
      delErr = error;
      eliminado = !error;
    } else if (target.fecha) {
      // Eliminar por fecha si no hay id
      const { error } = await supabase
        .from('special_schedules')
        .delete()
        .eq('public_profile_id', publicProfileId)
        .eq('date', target.fecha);
      delErr = error;
      eliminado = !error;
    }
    if (delErr) {
      addToast('Error eliminando día especial: ' + delErr.message, { type: 'error' });
    } else if (eliminado) {
      addToast('Día especial eliminado', { type: 'success' });
      // Eliminar del estado local inmediatamente y marcar como eliminado
      setForm(f => ({
        ...f,
  horarioEspecial: f.horarioEspecial.filter((h) => {
          if (target.id) return h.id !== target.id;
          return h.fecha !== target.fecha;
        })
      }));
      setEliminadosEspecial(arr => [...arr, target.fecha]);
    }
  }

  // Función para guardar el horario (simulada)
  async function handleSaveHorario() {
    if (savingHorario) return;
    setSavingHorario(true);
    
    try {
      if (!publicProfileId) {
        addToast('Primero crea y guarda tu página pública.', { type: 'error' });
        setSavingHorario(false);
        return;
      }

      const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      // Si está en modo 24/7, setear todos los días abiertos y sin duplicados
      let horarioFinal = { ...form.horario };
      if (horario247) {
        horarioFinal = {};
        for (const dia of diasSemana) {
          horarioFinal[dia] = { inicio: '00:00', fin: '23:59', cerrado: false };
        }
      }
      
      // Validar horarios
      for (const dia of dias) {
        const h = horarioFinal?.[dia];
        if (h && !h.cerrado && h.inicio && h.fin && h.inicio >= h.fin) {
          addToast('El horario de inicio debe ser menor al de fin en ' + dia, { type: 'error' });
          setSavingHorario(false);
          return;
        }
      }
      // Guardar horario semanal en tabla horario
      // Esperar a que la eliminación se complete antes de insertar
      const { error: errorDeleteHorario } = await supabase
        .from('schedules')
        .delete()
        .eq('public_profile_id', publicProfileId);
    if (errorDeleteHorario) {
      addToast('Error eliminando horario anterior: ' + errorDeleteHorario.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }
    
    const horarioInsert = diasSemana.map(dia => ({
      public_profile_id: publicProfileId,
      weekday: dia,
      start_time: horarioFinal?.[dia]?.inicio || null,
      end_time: horarioFinal?.[dia]?.fin || null,
      closed: !!horarioFinal?.[dia]?.cerrado
    }));
    
  const { error: errorHorarioInsert } = await supabase.from('schedules').insert(horarioInsert);
    if (errorHorarioInsert) {
      addToast('Error guardando horario semanal: ' + errorHorarioInsert.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }
    
    // Guardar días especiales en horario_especial
    // Obtener días especiales actuales de la base de datos
    const { data: actuales, error: actualesError } = await supabase
      .from('special_schedules')
      .select('id, date, public_profile_id')
      .eq('public_profile_id', publicProfileId);

    if (actualesError) {
      addToast('Error consultando días especiales: ' + actualesError.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }

    // Eliminar días especiales que fueron eliminados localmente
    if (eliminadosEspecial.length > 0) {
      const { error: errorEliminar } = await supabase
        .from('special_schedules')
        .delete()
        .eq('public_profile_id', publicProfileId)
        .in('date', eliminadosEspecial);
      
      // Si no funcionó eliminar por fecha, intentar eliminar por ID directamente
      if (errorEliminar) {
        // Buscar IDs de registros que coincidan con las fechas a eliminar
  const registrosParaEliminar = (actuales || []).filter((item: any) =>
    eliminadosEspecial.includes(item.date)
        );
        
        if (registrosParaEliminar.length > 0) {
          const idsParaEliminar = registrosParaEliminar.map((item: any) => item.id);
          
          const { error: errorEliminarId } = await supabase
            .from('special_schedules')
            .delete()
            .in('id', idsParaEliminar);
          
          if (errorEliminarId) {
            addToast('Error eliminando días especiales: ' + errorEliminarId.message, { type: 'error' });
            setSavingHorario(false);
            return;
          }
        }
      }
      
      if (errorEliminar) {
        addToast('Error eliminando días especiales: ' + errorEliminar.message, { type: 'error' });
        setSavingHorario(false);
        return;
      }
    }

    // Obtener fechas que actualmente están en el estado local
    const fechasLocales = (form.horarioEspecial || []).map(h => h.fecha);
    
    // Eliminar de la base de datos cualquier día que no está en el estado local
    // (esto maneja eliminaciones que podrían haberse perdido)
    const idsEliminarExtra = (actuales || [])
  .filter((e: any) => !fechasLocales.includes(e.date))
  .map((e: any) => e.id);
    
    if (idsEliminarExtra.length > 0) {
  const { error: errorEliminarExtra } = await supabase.from('special_schedules').delete().in('id', idsEliminarExtra);
      if (errorEliminarExtra) {
        addToast('Error eliminando registros extra: ' + errorEliminarExtra.message, { type: 'error' });
        setSavingHorario(false);
        return;
      }
    }

    // Insertar solo los días nuevos (sin id)
    const vistos = new Set();
    const nuevos = (form.horarioEspecial || []).filter(h => 
      !h.id && 
      h.fecha && 
      !vistos.has(h.fecha) && 
      (vistos.add(h.fecha) || true)
    );
    
    if (nuevos.length > 0) {
      const especialesInsert = nuevos.map(h => ({
        public_profile_id: publicProfileId,
        date: h.fecha,
        start_time: h.inicio || null,
        end_time: h.fin || null,
        closed: !!h.cerrado
      }));
      const { error: errorInsertEspeciales } = await supabase.from('special_schedules').insert(especialesInsert);
      if (errorInsertEspeciales) {
        addToast('Error insertando días especiales: ' + errorInsertEspeciales.message, { type: 'error' });
        setSavingHorario(false);
        return;
      }
    }

    // Guardar el estado de horario247 en preferencias del perfil público (jsonb)
    const mergedPreferences = { ...(publicPreferences || {}), horario247 };
    const { error: errorUpdatePreferences } = await supabase
      .from('public_profiles')
      .update({ preferences: mergedPreferences })
      .eq('id', publicProfileId);
    if (errorUpdatePreferences) {
      addToast('Error guardando estado 24/7: ' + errorUpdatePreferences.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }
    setPublicPreferences(mergedPreferences);

    // Recargar datos desde Supabase y actualizar estado (robusto)
    const { data: horarioActualizado, error: errorHorarioActualizado } = await supabase
      .from('schedules')
      .select('*')
      .eq('public_profile_id', publicProfileId);
      
    if (errorHorarioActualizado) {
      addToast('Error recargando horario: ' + errorHorarioActualizado.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }
    
    const horarioObj: { [dia: string]: { inicio: string; fin: string; cerrado: boolean } } = {};
    if (Array.isArray(horarioActualizado)) {
      for (const h of horarioActualizado) {
        horarioObj[h.weekday] = {
          inicio: h.start_time || '',
          fin: h.end_time || '',
          cerrado: !!h.closed
        };
      }
    }
    
    // Refrescar días especiales desde la base, nunca desde el estado local
    const { data: especialesActualizados, error: errorEspecialesActualizados } = await supabase
      .from('special_schedules')
      .select('id, date, start_time, end_time, closed')
      .eq('public_profile_id', publicProfileId)
      .order('date', { ascending: true });
      
    if (errorEspecialesActualizados) {
      addToast('Error recargando días especiales: ' + errorEspecialesActualizados.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }
      
    const especialesClean: any[] = [];
    if (Array.isArray(especialesActualizados)) {
      const vistos = new Set();
      for (const e of especialesActualizados) {
        if (!e.date || vistos.has(e.date)) continue;
        vistos.add(e.date);
        especialesClean.push({ id: e.id, fecha: e.date, inicio: e.start_time || '', fin: e.end_time || '', cerrado: !!e.closed });
      }
    }
    setForm(f => ({ ...f, horario: horarioObj, horarioEspecial: especialesClean }));
    // Limpiar el array de eliminados ya que se procesaron exitosamente
    setEliminadosEspecial([]);
    addToast("Horario actualizado", { type: "success" });
    
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      addToast('Error inesperado al guardar el horario: ' + errorMessage, { type: 'error' });
    } finally {
      setSavingHorario(false);
    }
  }
  useEffect(() => {
    async function fetchRegiones() {
      const { data } = await supabase.from('regions').select('id, name, code').order('name');
      if (data) {
        const sorted = sortRegionsNorthToSouth(data as any);
        setRegiones(sorted.map((r: any) => ({ label: r.name, value: String(r.id) })));
      }
    }
    fetchRegiones();
  }, [supabase]);

  useEffect(() => {
    async function fetchComunas() {
      if (form.region_id) {
        const { data } = await supabase
          .from('communes')
          .select('id, name')
          .eq('region_id', form.region_id)
          .order('name');
        if (data) {
          setComunas(data.map((c: any) => ({ label: c.name, value: String(c.id) })));
        }
      } else {
        setComunas([]);
      }
    }
    fetchComunas();
  }, [form.region_id, supabase]);

  return (
    <div className="w-full space-y-6">
      {/* Preview del Avatar como en el perfil público */}
      <div className="card-surface shadow-card rounded-2xl px-6 md:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative flex justify-center md:justify-start shrink-0">
            <ProfileAvatarUploader hide={coverModalOpen} noBorder={true} inline={true} />
            {ctxUser?.online && (
              <span className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-[var(--color-success)] ring-2 ring-border/80" title="Usuario activo" />
            )}
          </div>
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-3 min-w-0">
            <h2 className="text-xl font-semibold text-lighttext dark:text-darktext">Vista previa de tu perfil público</h2>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70">Así se verá tu avatar en la portada de tu página pública. Haz clic en el botón + para cambiarlo.</p>
            <p className="text-xs text-lighttext/60 dark:text-darktext/60 mt-1">
              💡 <strong>Recomendación:</strong> Usa imágenes cuadradas de al menos 400×400 píxeles para obtener mejores resultados.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta de Información Pública */}
      <div className="card-surface shadow-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary-a10)]">
              <IconUser className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Información Pública</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">Datos que se mostrarán en tu página pública</p>
            </div>
          </div>
        </div>

        <form className="p-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Input
                type="text"
                label="Nombre público"
                value={form.nombre_publico}
                onChange={e => setForm(f => ({ ...f, nombre_publico: e.target.value }))}
                placeholder="Tu nombre público"
                className="w-full"
                shape="rounded"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-lighttext dark:text-darktext">Nombre de usuario</label>

              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 rounded-xl card-surface shadow-card px-3 py-2 min-w-0">
                  <span className="text-sm text-lighttext/70 dark:text-darktext/70 shrink-0">simpleautos.app/perfil/</span>
                  <span className="text-sm truncate">
                    {form.username && !isPlaceholderSlug(form.username) ? normalizeSlug(form.username) : "(sin definir)"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setUsernameEditorOpen(true);
                    setUsernameStatus('idle');
                    setUsernameMessage(null);
                    setForm((f) => ({ ...f, username: normalizeSlug(f.username || '') }));
                  }}
                >
                  Cambiar
                </Button>
              </div>

            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Sitio web"
                value={form.pagina_web}
                onChange={e => setForm(f => ({ ...f, pagina_web: e.target.value }))}
                placeholder="https://www.tusitio.app"
                className="w-full"
                shape="rounded"
                leftIcon={<IconGlobe className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Dirección"
                value={form.direccion}
                onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                placeholder="Tu dirección completa"
                className="w-full"
                shape="rounded"
                leftIcon={<IconMapPin className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
              />
            </div>

            <div className="space-y-1">
              <Select
                label="Región"
                value={form.region_id}
                onChange={value => setForm(f => ({ ...f, region_id: String(value), commune_id: '' }))}
                options={regiones}
                placeholder="Selecciona tu región"
                className="w-full"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="space-y-1">
              <Select
                label="Comuna"
                value={form.commune_id}
                onChange={value => setForm(f => ({ ...f, commune_id: String(value) }))}
                options={comunas}
                placeholder="Selecciona tu comuna"
                className="w-full"
                shape="rounded"
                size="md"
                disabled={!form.region_id}
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <TextArea
                label="Descripción breve / Biografía"
                value={form.descripcion}
                onChange={e => {
                  const val = e.target.value.slice(0, 80);
                  setForm(f => ({ ...f, descripcion: val }));
                }}
                placeholder="Una breve descripción de tu negocio o perfil"
                className="w-full"
                shape="rounded"
                rows={2}
                maxLength={80}
              />
              <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">{form.descripcion.length} / 80 caracteres</div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-border/60 mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="px-8"
              disabled={savingPublic}
            >
              {savingPublic ? 'Guardando...' : 'Guardar Información Pública'}
            </Button>
          </div>
        </form>
      </div>

      <Modal
        open={usernameEditorOpen}
        onClose={() => {
          setUsernameEditorOpen(false);
          setUsernameStatus('idle');
          setUsernameMessage(null);
        }}
        title="Nombre de usuario"
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">
            Tu enlace público será:
          </p>

          <div className="flex items-center gap-2 rounded-xl card-surface shadow-card px-3 py-2">
            <span className="text-sm text-lighttext/70 dark:text-darktext/70 shrink-0">simpleautos.app/perfil/</span>
            <Input
              type="text"
              value={form.username}
              onChange={(e) => {
                const next = normalizeSlug(e.target.value);
                setForm((f) => ({ ...f, username: next }));
                setUsernameStatus('idle');
                setUsernameMessage(null);
              }}
              onBlur={() => void handleCheckUsernameAvailability()}
              placeholder="usuario123"
              className="flex-1 !border-0 !bg-transparent !shadow-none !ring-0 px-0"
            />
          </div>

          {usernameMessage ? (
            <p
              className={`text-xs ${
                usernameStatus === 'available' ? 'text-[var(--color-success)]' : 'text-[var(--color-warn)]'
              }`}
            >
              {usernameMessage}
            </p>
          ) : (
            <p className="text-xs text-lighttext/60 dark:text-darktext/60">
              3-20 caracteres. Letras, números, puntos, guiones y guion bajo.
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUsernameEditorOpen(false);
                setUsernameStatus('idle');
                setUsernameMessage(null);
              }}
              disabled={savingUsername}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleCheckUsernameAvailability()}
              disabled={usernameStatus === 'checking' || normalizeSlug(form.username || '').length < 3}
            >
              {usernameStatus === 'checking' ? 'Verificando...' : 'Ver disponibilidad'}
            </Button>
            {usernameStatus === 'available' ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSaveUsername()}
                disabled={savingUsername}
              >
                {savingUsername ? 'Guardando...' : 'Guardar'}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>

      {/* Tarjeta de Redes Sociales */}
      <div className="card-surface shadow-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary-a10)]">
              <IconShare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Redes Sociales</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">Conecta tus perfiles sociales</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Input
                type="text"
                label="Facebook"
                value={form.facebook}
                onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))}
                placeholder="Solo nombre de usuario"
                className="w-full"
                shape="rounded"
              />
              {form.facebook && (
                <p className="text-xs text-lighttext/70 dark:text-darktext/70">facebook.com/{form.facebook}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                label="Instagram"
                value={form.instagram}
                onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                placeholder="Solo nombre de usuario"
                className="w-full"
                shape="rounded"
              />
              {form.instagram && (
                <p className="text-xs text-lighttext/70 dark:text-darktext/70">instagram.com/{form.instagram}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                label="LinkedIn"
                value={form.linkedin}
                onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))}
                placeholder="Solo nombre de usuario"
                className="w-full"
                shape="rounded"
              />
              {form.linkedin && (
                <p className="text-xs text-lighttext/70 dark:text-darktext/70">linkedin.com/in/{form.linkedin}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                label="TikTok"
                value={form.tiktok}
                onChange={e => setForm(f => ({ ...f, tiktok: e.target.value }))}
                placeholder="Solo nombre de usuario"
                className="w-full"
                shape="rounded"
              />
              {form.tiktok && (
                <p className="text-xs text-lighttext/70 dark:text-darktext/70">tiktok.com/@{form.tiktok}</p>
              )}
            </div>

            <div className="space-y-2">
              <Select
                label="WhatsApp público"
                value={form.whatsapp_type || 'personal'}
                onChange={v => setForm(f => ({ ...f, whatsapp_type: String(v) }))}
                options={[
                  { label: 'WhatsApp personal', value: 'personal' },
                  { label: 'WhatsApp empresa', value: 'empresa' }
                ]}
                placeholder="Selecciona cuál mostrar"
                className="w-full"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                label="Twitter/X"
                value={form.twitter}
                onChange={e => setForm(f => ({ ...f, twitter: e.target.value }))}
                placeholder="Solo nombre de usuario"
                className="w-full"
                shape="rounded"
              />
              {form.twitter && (
                <p className="text-xs text-lighttext/70 dark:text-darktext/70">x.com/{form.twitter}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                label="YouTube"
                value={form.youtube}
                onChange={e => {
                  const raw = e.target.value.trim();
                  const val = raw && !raw.startsWith('@') ? '@' + raw.replace(/^@+/, '') : raw;
                  setForm(f => ({ ...f, youtube: val }));
                }}
                placeholder="Solo nombre de usuario"
                className="w-full"
                shape="rounded"
              />
              {form.youtube && (
                <p className="text-xs text-lighttext/70 dark:text-darktext/70">youtube.com/{form.youtube}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-border/60 mt-6">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="px-8"
              onClick={handleSaveSocial}
              disabled={savingSocial}
            >
              {savingSocial ? 'Guardando...' : 'Guardar Redes Sociales'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjeta de Horario de Atención */}
      <div className="card-surface shadow-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary-a10)]">
              <IconClock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Horario de Atención</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">Configura tus horarios de apertura</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={horario247}
                onChange={e => setHorario247(e.target.checked)}
                className="w-4 h-4 accent-primary text-primary bg-lightbg dark:bg-darkbg border-border/60 rounded focus:ring-[var(--field-focus-ring)] focus:ring-2"
              />
              <span className="font-medium text-lighttext dark:text-darktext">Abierto todos los días (24/7)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Horario semanal */}
            <div>
              <h4 className="text-base font-semibold mb-4 text-lighttext dark:text-darktext">Horario semanal</h4>
              <div className="space-y-3">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => {
                  const inicio = form.horario?.[dia]?.inicio || '';
                  const fin = form.horario?.[dia]?.fin || '';
                  const cerrado = !!form.horario?.[dia]?.cerrado;
                  const horarioInvalido = !cerrado && inicio && fin && inicio >= fin;

                  return (
                    <div key={dia} className="flex items-center gap-3 p-3 rounded-xl card-surface shadow-card">
                      <div className="w-20 flex-shrink-0">
                        <span className="text-sm font-medium text-lighttext dark:text-darktext">{dia}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={inicio}
                          onChange={e => setForm(f => ({
                            ...f,
                            horario: {
                              ...f.horario,
                              [dia]: {
                                ...f.horario?.[dia],
                                inicio: e.target.value
                              }
                            }
                          }))}
                          fieldSize="sm"
                          className={`flex-1 ${cerrado || horario247 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          data-invalid={horarioInvalido || undefined}
                          disabled={cerrado || horario247}
                        />

                        <span className="text-sm text-lighttext/70 dark:text-darktext/70">a</span>

                        <Input
                          type="time"
                          value={fin}
                          onChange={e => setForm(f => ({
                            ...f,
                            horario: {
                              ...f.horario,
                              [dia]: {
                                ...f.horario?.[dia],
                                fin: e.target.value
                              }
                            }
                          }))}
                          fieldSize="sm"
                          className={`flex-1 ${cerrado || horario247 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          data-invalid={horarioInvalido || undefined}
                          disabled={cerrado || horario247}
                        />

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cerrado}
                            onChange={e => setForm(f => ({
                              ...f,
                              horario: {
                                ...f.horario,
                                [dia]: {
                                  ...f.horario?.[dia],
                                  cerrado: e.target.checked
                                }
                              }
                            }))}
                            className="w-4 h-4 accent-primary text-primary bg-lightbg dark:bg-darkbg border-border/60 rounded focus:ring-[var(--field-focus-ring)] focus:ring-2"
                            disabled={horario247}
                          />
                          <span className="text-sm text-lighttext dark:text-darktext">Cerrado</span>
                        </label>
                      </div>

                      {horarioInvalido && !horario247 && (
                        <p className="text-xs text-[var(--color-danger)] mt-1 col-span-full">
                          El horario de inicio debe ser anterior al de cierre
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Días especiales */}
            <div>
              <h4 className="text-base font-semibold mb-4 text-lighttext dark:text-darktext">Días especiales / Festivos</h4>
              <div className="space-y-3">
                {form.horarioEspecial.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 card-surface shadow-card rounded-xl">
                    <input
                      type="date"
                      value={h.fecha}
                      onChange={e => {
                        const arr = [...(form.horarioEspecial ?? [])];
                        arr[idx].fecha = e.target.value;
                        setForm(f => ({ ...f, horarioEspecial: arr }));
                      }}
                      className="w-32 h-9 px-3 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-[color:var(--color-primary-a40)] placeholder:text-[var(--field-placeholder)] transition-colors"
                    />

                    <input
                      type="time"
                      value={h.inicio}
                      onChange={e => {
                        const arr = [...(form.horarioEspecial ?? [])];
                        arr[idx].inicio = e.target.value;
                        setForm(f => ({ ...f, horarioEspecial: arr }));
                      }}
                      className="w-24 h-9 px-3 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-[color:var(--color-primary-a40)] placeholder:text-[var(--field-placeholder)] transition-colors"
                    />

                    <span className="text-sm text-lighttext/70 dark:text-darktext/70">a</span>

                    <input
                      type="time"
                      value={h.fin}
                      onChange={e => {
                        const arr = [...form.horarioEspecial];
                        arr[idx].fin = e.target.value;
                        setForm(f => ({ ...f, horarioEspecial: arr }));
                      }}
                      className="w-24 h-9 px-3 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-[color:var(--color-primary-a40)] placeholder:text-[var(--field-placeholder)] transition-colors"
                    />

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.cerrado}
                        onChange={e => {
                          const arr = [...form.horarioEspecial];
                          arr[idx].cerrado = e.target.checked;
                          setForm(f => ({ ...f, horarioEspecial: arr }));
                        }}
                        className="w-4 h-4 accent-primary text-primary bg-lightbg dark:bg-darkbg border-border/60 rounded focus:ring-[var(--field-focus-ring)] focus:ring-2"
                      />
                      <span className="text-sm text-lighttext dark:text-darktext">Cerrado</span>
                    </label>

                    <button
                      type="button"
                      className="text-[var(--color-danger)] hover:opacity-80 text-sm font-medium ml-2"
                      onClick={() => handleRemoveEspecial(idx)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => setForm(f => ({
                    ...f,
                    horarioEspecial: [...f.horarioEspecial, { fecha: '', inicio: '', fin: '', cerrado: false }]
                  }))}
                >
                  Agregar día especial
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-border/60 mt-6">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="px-8"
              onClick={handleSaveHorario}
              disabled={savingHorario}
            >
              {savingHorario ? 'Guardando...' : 'Guardar Horario'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPageForm;







