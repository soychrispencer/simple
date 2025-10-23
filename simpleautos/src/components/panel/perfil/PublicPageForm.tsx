import React, { useEffect, useState } from "react";
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
import Input from "../../ui/form/Input";
import Select from "../../ui/form/Select";
import Button from "../../ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import TextArea from "../../ui/form/TextArea";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { useAuth } from "@/context/AuthContext";
import { IconUser, IconGlobe, IconMapPin, IconShare, IconClock } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import ProfileAvatarUploader from "@/components/ui/uploader/ProfileAvatarUploader";

const PublicPageForm: React.FC<{ user: any; onSave?: (data: any) => void; coverModalOpen?: boolean }> = ({ user: userProp, onSave, coverModalOpen = false }) => {
  const { addToast } = useToast();
  const { user: ctxUser, refresh: refreshAuth } = useAuth();
  const supabase = useSupabase();
  // Cargar datos de redes sociales y horario al montar
  useEffect(() => {
    async function fetchData() {
  const effectiveUserId = userProp?.id || ctxUser?.id;
      if (!effectiveUserId) return; // esperar a que cargue contexto
      const { data: profileData }: any = await supabase
        .from('profiles')
  .select('id')
  .eq('id', effectiveUserId)
        .maybeSingle();
      if (!profileData?.id) return;
      const [redesRes, especialesRes, horarioRes]: any = await Promise.all([
        supabase.from('social_links').select('*').eq('profile_id', profileData.id).maybeSingle(),
        supabase.from('special_schedules').select('id, date, start_time, end_time, closed').eq('profile_id', profileData.id).order('date', { ascending: true }),
        supabase.from('schedules').select('*').eq('profile_id', profileData.id)
      ]);
      const redesData: any = redesRes.data;
      const especialesData: any = especialesRes.data;
      const horarioData: any = horarioRes.data;
      const horarioObj: { [dia: string]: { inicio: string; fin: string; cerrado: boolean } } = {};
      if (Array.isArray(horarioData)) {
        for (const h of horarioData) {
          horarioObj[h.weekday] = { inicio: h.start_time || '', fin: h.end_time || '', cerrado: !!h.closed };
        }
      }
      setForm(f => ({
        ...f,
        facebook: redesData?.facebook || '',
        instagram: redesData?.instagram || '',
        linkedin: redesData?.linkedin || '',
        tiktok: redesData?.tiktok || '',
  whatsapp: redesData?.whatsapp || '',
  whatsapp_type: redesData?.whatsapp_type || 'personal',
        youtube: redesData?.youtube || '',
        twitter: redesData?.twitter || '',
        horario: horarioObj,
        horarioEspecial: (() => {
          if (!especialesData) return [] as any[];
          const uniq: Record<string, any> = {};
          for (const e of especialesData) {
            if (!uniq[e.date]) uniq[e.date] = { id: e.id, fecha: e.date, inicio: e.start_time, fin: e.end_time, cerrado: !!e.closed };
          }
          return Object.values(uniq);
        })()
      }));
    }
    fetchData();
  }, [userProp, ctxUser, supabase]);
  // Guardar redes sociales en la tabla redes_sociales (flujo robusto con verificación de user_id y profile_id)
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);

  async function handleSaveSocial(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (savingSocial) return;
    setSavingSocial(true);
  // estado saveStatus eliminado
  const effectiveUserId = userProp?.id || ctxUser?.id;
    if (!effectiveUserId) {
  // setSaveStatus removido
      addToast('Usuario no disponible aún.', { type: 'error' });
      setSavingSocial(false);
      return;
    }
  const { data: profileData, error: profileError }: any = await supabase
      .from('profiles')
  .select('id')
  .eq('id', effectiveUserId)
      .maybeSingle();
    if (profileError) {
  // setSaveStatus removido
  addToast('Error consultando profiles: ' + profileError.message, { type: 'error' });
      setSavingSocial(false);
      return;
    }
    if (!profileData?.id) {
      const { data: newProfile, error: insertError }: any = await supabase
        .from('profiles')
        .insert({ id: effectiveUserId })
        .select('id')
        .maybeSingle();
      if (insertError || !newProfile?.id) {
  // setSaveStatus removido
  addToast('Error creando profile (profiles): ' + (insertError?.message || 'No se pudo crear'), { type: 'error' });
        setSavingSocial(false);
        return;
      }
      // reasignación innecesaria eliminada; usamos newProfile directamente
      const createdProfile = newProfile;
      // Reemplazamos profileData por createdProfile en uso siguiente
      const profileId = createdProfile.id;
      let DOMPurify: any = null;
      try {
        DOMPurify = require('isomorphic-dompurify');
      } catch (e) {}
      const sanitize = (val: string) => DOMPurify && typeof val === 'string' ? DOMPurify.sanitize(val.trim()) : (val && val.trim() !== "" ? val.trim() : null);
      const cleanSocial = {
        profile_id: profileId,
        facebook: sanitize(form.facebook),
        instagram: sanitize(form.instagram),
        linkedin: sanitize(form.linkedin),
        tiktok: sanitize(form.tiktok),
        whatsapp: sanitize(form.whatsapp),
        whatsapp_type: sanitize(form.whatsapp_type),
        youtube: sanitize(form.youtube),
        twitter: sanitize(form.twitter)
      };
      // Continuación lógica: saltar el bloque inferior duplicado
      // early replace of original block
      const { data: redesData, error: selectError }: any = await supabase
        .from('social_links')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();
      if (selectError) {
  // setSaveStatus removido
        addToast('Error consultando social_links: ' + selectError.message, { type: 'error' });
        setSavingSocial(false);
        return;
      }
      let opError: any = null;
      if (redesData?.id) {
        const { error: updateError } = await supabase.from('social_links').update(cleanSocial).eq('id', redesData.id);
        opError = updateError;
      } else {
        const { error: insertError } = await supabase.from('social_links').insert(cleanSocial);
        opError = insertError;
      }
      if (opError) {
  // setSaveStatus removido
        addToast('Error guardando redes: ' + opError.message, { type: 'error' });
        setSavingSocial(false);
        return;
      }
  // setSaveStatus removido
      addToast('Redes guardadas', { type: 'success' });
      await refreshAuth(true);
      setSavingSocial(false);
      return; // evita continuar con bloque original
    }
    const profileId = profileData.id;
    const cleanSocial = {
      profile_id: profileId,
      facebook: form.facebook?.trim() || null,
      instagram: form.instagram?.trim() || null,
      linkedin: form.linkedin?.trim() || null,
      tiktok: form.tiktok?.trim() || null,
  whatsapp: form.whatsapp?.trim() || null,
  whatsapp_type: form.whatsapp_type?.trim() || null,
      youtube: form.youtube?.trim() || null,
      twitter: form.twitter?.trim() || null
    };
    const { data: redesData, error: selectError }: any = await supabase
      .from('social_links')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (selectError) {
  // setSaveStatus removido
  addToast('Error consultando social_links: ' + selectError.message, { type: 'error' });
      setSavingSocial(false);
      return;
    }
    let opError: any = null;
    if (redesData?.id) {
      const { error: updateError } = await supabase.from('social_links').update(cleanSocial).eq('id', redesData.id);
      opError = updateError;
    } else {
      const { error: insertError } = await supabase.from('social_links').insert(cleanSocial);
      opError = insertError;
    }
    if (opError) {
  // setSaveStatus removido
      addToast('Error guardando redes: ' + opError.message, { type: 'error' });
      setSavingSocial(false);
      return;
    }
  // setSaveStatus removido
  addToast('Redes guardadas', { type: 'success' });
  await refreshAuth(true);
  setSavingSocial(false);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (savingPublic) return;
    setSavingPublic(true);
    // Obtener el user_id real desde sesión
  const userId = userProp?.id || ctxUser?.id;
    if (!userId) {
      setSavingPublic(false);
      return;
    }
    // Verificar si existe el registro en profile
    const { data: existing, error: selectError }: any = await supabase
      .from('profiles')
      .select('id')
  .eq('id', userId)
      .maybeSingle();
    // Convertir region_id y comuna_id a número si existen
  const region_id = form.region_id ? parseInt(form.region_id) : null;
  const commune_id = form.commune_id ? parseInt(form.commune_id) : null;
    if (selectError || !existing?.id) {
      // Si no existe, crear el registro
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          user_id: userId,
          public_name: form.nombre_publico,
          username: form.username,
          website: form.pagina_web,
          description: form.descripcion,
          address: form.direccion,
          region_id,
          commune_id
        });
      if (!insertError) {
  addToast("¡Cambios guardados exitosamente!", { type: "success" });
  onSave?.(form);
  await refreshAuth(true);
      } else {
        addToast('Error guardando información pública: ' + insertError.message, { type: 'error' });
      }
    } else {
      // Si existe, actualizar
      const { error } = await supabase
        .from('profiles')
        .update({
          public_name: form.nombre_publico,
          username: form.username,
          website: form.pagina_web,
          description: form.descripcion,
          address: form.direccion,
          region_id,
          commune_id
        })
  .eq('id', userId);
      if (!error) {
        addToast("¡Cambios guardados exitosamente!", { type: "success" });
        onSave?.(form);
  await refreshAuth(true);
      } else {
        addToast('Error guardando información pública: ' + error.message, { type: 'error' });
      }
    }
    setSavingPublic(false);
  }
  const [horario247, setHorario247] = useState<boolean>(userProp?.horario247 || false);
  // (Validaciones RUT/email/teléfono eliminadas por no usarse actualmente)

  // Estado abierto/cerrado in tiempo real
  function getEstadoNegocio() {
    if (horario247) return 'Abierto';
    const ahora = new Date();
    const diaSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][ahora.getDay()];
    const hoyStr = ahora.toISOString().slice(0,10);
    const especial = form.horarioEspecial.find(h => h.fecha === hoyStr);
    if (especial) {
      if (especial.cerrado) return 'Cerrado';
      if (especial.inicio && especial.fin) {
        const inicio = new Date(`${hoyStr}T${especial.inicio}`);
        const fin = new Date(`${hoyStr}T${especial.fin}`);
        if (ahora >= inicio && ahora <= fin) return 'Abierto';
        return 'Cerrado';
      }
    }
    const h = form.horario?.[diaSemana];
    if (!h || h.cerrado) return 'Cerrado';
    if (h.inicio && h.fin) {
      const inicio = new Date(`${hoyStr}T${h.inicio}`);
      const fin = new Date(`${hoyStr}T${h.fin}`);
      if (ahora >= inicio && ahora <= fin) return 'Abierto';
    }
    return 'Cerrado';
  }
  // Estados locales para los campos editables
  type FormState = {
  horarioEspecial: Array<{ id?: number; fecha: string; inicio: string; fin: string; cerrado: boolean }>;
  nombre_publico: string; // legacy local for display_name mapping
  username: string;
  pagina_web: string; // legacy local for website mapping
  descripcion: string; // legacy local for bio mapping
  horario: any;
  ubicacion_mapa: string;
  direccion: string; // legacy local for address mapping
  region_id: string;
  commune_id: string; // legacy local for commune_id mapping
  tiktok: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  whatsapp: string;
  whatsapp_type: string;
  youtube: string;
  twitter: string;
  anios_rubro: string; // years_experience legacy
  puntuacion: string; // rating legacy
  galeria: string[];
  };

  const [form, setForm] = useState<FormState>({
  // Inicializamos vacío para evitar reinyectar datos antiguos desde user al refrescar
  horarioEspecial: [],
  nombre_publico: userProp?.public_name || userProp?.nombre_publico || "",
  username: userProp?.username || "",
  pagina_web: userProp?.website || userProp?.pagina_web || "",
  descripcion: userProp?.description || userProp?.descripcion || "",
  horario: userProp?.horario || "",
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
  whatsapp_type: userProp?.whatsapp_type || userProp?.whatsapp_tipo || "personal",
  youtube: userProp?.youtube || "",
  twitter: userProp?.twitter || "",
  anios_rubro: userProp?.years_experience || userProp?.anios_rubro || "",
  puntuacion: userProp?.rating || userProp?.puntuacion || "",
  galeria: userProp?.galeria || [],
  });
  // Estado para feedback de guardado
  // Eliminados estados locales no usados (saveStatus, whatsappPublico, dirtyHorarioEspecial)
  // Array temporal para días eliminados
  const [eliminadosEspecial, setEliminadosEspecial] = useState<string[]>([]);

  // Helper: eliminar día especial por índice
  async function handleRemoveEspecial(idx: number) {
    const target = form.horarioEspecial[idx];
    if (!target) return;
    let userId = userProp?.user_id || userProp?.id || ctxUser?.id;
    if (!userId) {
      const { data: authUser } = await supabase.auth.getUser();
      userId = authUser?.user?.id;
    }
    if (!userId) return;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
  .eq('id', userId)
      .maybeSingle();
    if (!profileData?.id) return;
    let delErr = null;
    let eliminado = false;
    if (target.id) {
      // Eliminar por id
      const { error } = await supabase
        .from('special_schedules')
        .delete()
        .eq('id', target.id)
        .eq('profile_id', profileData.id);
      delErr = error;
      eliminado = !error;
    } else if (target.fecha) {
      // Eliminar por fecha si no hay id
      const { error } = await supabase
        .from('special_schedules')
        .delete()
        .eq('profile_id', profileData.id)
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
      let userId = userProp?.user_id || userProp?.id || ctxUser?.id;
      if (!userId) {
        const { data: authUser } = await supabase.auth.getUser();
        userId = authUser?.user?.id;
      }
      if (!userId) {
        addToast('No se encontró el user_id.', { type: 'error' });
        setSavingHorario(false);
        return;
      }
      
      const { data: profileDataRaw, error: profileError } = await supabase
        .from('profiles')
        .select('id')
	.eq('id', userId)
        .maybeSingle();
      if (profileError) {
        addToast('Error consultando profile: ' + profileError.message, { type: 'error' });
        setSavingHorario(false);
        return;
      }
      let profileData = profileDataRaw;
      if (!profileData || !profileData.id) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId })
          .select('id')
          .maybeSingle();
        if (insertError || !newProfile || !newProfile.id) {
          addToast('Error creando profile: ' + (insertError?.message || 'No se pudo crear el registro'), { type: 'error' });
          setSavingHorario(false);
          return;
      }
      profileData = newProfile;
    }
    const profileId = profileData.id;
    
    // Guardar horario semanal en tabla horario
    // Esperar a que la eliminación se complete antes de insertar
  const { error: errorDeleteHorario } = await supabase.from('schedules').delete().eq('profile_id', profileId);
    if (errorDeleteHorario) {
      addToast('Error eliminando horario anterior: ' + errorDeleteHorario.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }
    
    const horarioInsert = diasSemana.map(dia => ({
      profile_id: profileId,
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
    const { data: actuales } = await supabase
      .from('special_schedules')
      .select('id, date, profile_id')
      .eq('profile_id', profileId);

    // Eliminar días especiales que fueron eliminados localmente
    if (eliminadosEspecial.length > 0) {
      const { error: errorEliminar } = await supabase
        .from('special_schedules')
        .delete()
        .eq('profile_id', profileId)
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
    
    // Eliminar de la base de datos cualquier día que no esté en el estado local
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
        profile_id: profileId,
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
    
    // Guardar el estado de horario247 en profiles
    const { error: errorUpdateProfile } = await supabase
      .from('profiles')
      .update({ horario247 })
      .eq('id', profileId);
    if (errorUpdateProfile) {
      addToast('Error guardando estado 24/7: ' + errorUpdateProfile.message, { type: 'error' });
      setSavingHorario(false);
      return;
    }
    
    // Recargar datos desde Supabase y actualizar estado (robusto)
    const { data: horarioActualizado, error: errorHorarioActualizado } = await supabase
      .from('schedules')
      .select('*')
      .eq('profile_id', profileId);
      
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
      .eq('profile_id', profileId)
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
  const [regiones, setRegiones] = useState<{ label: string; value: string }[]>([]);
  const [comunas, setComunas] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    async function fetchRegiones() {
      const { data } = await supabase.from('regions').select('id, name').order('id');
      if (data) {
        setRegiones(data.map((r: any) => ({ label: r.name, value: String(r.id) })));
      }
    }
    fetchRegiones();
  }, [supabase]);

  useEffect(() => {
    async function fetchComunas() {
      if (form.region_id) {
        const { data } = await supabase.from('communes').select('id, name').eq('region_id', parseInt(form.region_id)).order('name');
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
      <div className="bg-white dark:bg-white/[0.05] rounded-2xl shadow-token-lg px-6 md:px-8 py-6 border border-gray-200/70 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative flex justify-center md:justify-start shrink-0">
            <ProfileAvatarUploader hide={coverModalOpen} noBorder={true} inline={true} />
            {ctxUser?.online && (
              <span className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-green-500 ring-2 ring-white/80 dark:ring-white/10" title="Usuario activo" />
            )}
          </div>
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-3 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Vista previa de tu perfil público</h2>
            <p className="text-sm text-gray-600 dark:text-gray-200/90">Así se verá tu avatar en la portada de tu página pública. Haz clic en el botón + para cambiarlo.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 <strong>Recomendación:</strong> Usa imágenes cuadradas de al menos 400×400 píxeles para obtener mejores resultados.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta de Información Pública */}
      <div className="bg-white dark:bg-darkcard rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <IconUser className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Pública</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Datos que se mostrarán en tu página pública</p>
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
              <Input
                type="text"
                label="Nombre de usuario"
                value={form.username}
                onChange={e => {
                  // Normaliza: solo minúsculas, sin espacios, sin caracteres especiales
                  const val = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9._-]/g, '') // solo letras, números, punto, guion y guion bajo
                    .replace(/\s+/g, '');
                  setForm(f => ({ ...f, username: val }));
                }}
                placeholder="usuario123"
                className="w-full"
                shape="rounded"
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Sitio web"
                value={form.pagina_web}
                onChange={e => setForm(f => ({ ...f, pagina_web: e.target.value }))}
                placeholder="https://www.tusitio.cl"
                className="w-full"
                shape="rounded"
                leftIcon={<IconGlobe className="w-4 h-4 text-gray-400" />}
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
                leftIcon={<IconMapPin className="w-4 h-4 text-gray-400" />}
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
              <div className="text-xs text-gray-500 mt-1">{form.descripcion.length} / 80 caracteres</div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
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

      {/* Tarjeta de Redes Sociales */}
      <div className="bg-white dark:bg-darkcard rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30">
              <IconShare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Redes Sociales</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conecta tus perfiles sociales</p>
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
                <p className="text-xs text-gray-500">facebook.com/{form.facebook}</p>
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
                <p className="text-xs text-gray-500">instagram.com/{form.instagram}</p>
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
                <p className="text-xs text-gray-500">linkedin.com/in/{form.linkedin}</p>
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
                <p className="text-xs text-gray-500">tiktok.com/@{form.tiktok}</p>
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
                <p className="text-xs text-gray-500">x.com/{form.twitter}</p>
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
                <p className="text-xs text-gray-500">youtube.com/{form.youtube}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
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
      <div className="bg-white dark:bg-darkcard rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <IconClock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Horario de Atención</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configura tus horarios de apertura</p>
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
                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="font-medium text-gray-900 dark:text-white">Abierto todos los días (24/7)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Horario semanal */}
            <div>
              <h4 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">Horario semanal</h4>
              <div className="space-y-3">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => {
                  const inicio = form.horario?.[dia]?.inicio || '';
                  const fin = form.horario?.[dia]?.fin || '';
                  const cerrado = !!form.horario?.[dia]?.cerrado;
                  const horarioInvalido = !cerrado && inicio && fin && inicio >= fin;

                  return (
                    <div key={dia} className="flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-20 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{dia}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <input
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
                          className={`flex-1 h-9 px-3 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white placeholder:text-[var(--field-placeholder)] transition-colors ${
                            cerrado || horario247 ? 'opacity-50 cursor-not-allowed' : ''
                          } ${horarioInvalido ? 'border-red-500' : ''}`}
                          disabled={cerrado || horario247}
                        />

                        <span className="text-sm text-gray-500">a</span>

                        <input
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
                          className={`flex-1 h-9 px-3 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white placeholder:text-[var(--field-placeholder)] transition-colors ${
                            cerrado || horario247 ? 'opacity-50 cursor-not-allowed' : ''
                          } ${horarioInvalido ? 'border-red-500' : ''}`}
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
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            disabled={horario247}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Cerrado</span>
                        </label>
                      </div>

                      {horarioInvalido && !horario247 && (
                        <p className="text-xs text-red-600 mt-1 col-span-full">
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
              <h4 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">Días especiales / Festivos</h4>
              <div className="space-y-3">
                {form.horarioEspecial.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <input
                      type="date"
                      value={h.fecha}
                      onChange={e => {
                        const arr = [...(form.horarioEspecial ?? [])];
                        arr[idx].fecha = e.target.value;
                        setForm(f => ({ ...f, horarioEspecial: arr }));
                      }}
                      className="w-32 h-9 px-3 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    <input
                      type="time"
                      value={h.inicio}
                      onChange={e => {
                        const arr = [...(form.horarioEspecial ?? [])];
                        arr[idx].inicio = e.target.value;
                        setForm(f => ({ ...f, horarioEspecial: arr }));
                      }}
                      className="w-24 h-9 px-3 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    <span className="text-sm text-gray-500">a</span>

                    <input
                      type="time"
                      value={h.fin}
                      onChange={e => {
                        const arr = [...form.horarioEspecial];
                        arr[idx].fin = e.target.value;
                        setForm(f => ({ ...f, horarioEspecial: arr }));
                      }}
                      className="w-24 h-9 px-3 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Cerrado</span>
                    </label>

                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700 text-sm font-medium ml-2"
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

          <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
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
