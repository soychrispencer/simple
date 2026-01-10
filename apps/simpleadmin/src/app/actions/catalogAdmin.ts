'use server';

import { requireStaffUser } from '../../lib/admin/auth';
import { createAdminServerClient } from '../../lib/supabase/adminServerClient';

type Result =
  | { ok: true; notified: boolean; notifiedUserId?: string | null; notificationError?: string | null; notificationSkippedReason?: string | null }
  | { ok: false; error: string };

async function notifyCatalogDecision(params: {
  admin: ReturnType<typeof createAdminServerClient>;
  userId: string | null | undefined;
  entity: 'brand' | 'model';
  entityId: string;
  entityName: string | null | undefined;
  decision: 'approved' | 'rejected';
}): Promise<{ notified: boolean; notifiedUserId?: string | null; notificationError?: string | null; notificationSkippedReason?: string | null }> {
  const { admin, userId, entity, entityId, entityName, decision } = params;
  if (!userId) {
    return { notified: false, notifiedUserId: null, notificationSkippedReason: 'created_by vacío' };
  }

  const type = decision === 'approved' ? 'system' : 'alert';
  const entityLabel = entity === 'brand' ? 'marca' : 'modelo';
  const namePart = entityName ? `: ${entityName}` : '';
  const title = decision === 'approved' ? `Solicitud de ${entityLabel} aprobada${namePart}` : `Solicitud de ${entityLabel} rechazada${namePart}`;

  const entityWithName = entityName ? `${entityLabel} "${entityName}"` : entityLabel;

  const content =
    decision === 'approved'
      ? `Tu solicitud de ${entityWithName} fue aprobada y ya está disponible para seleccionar.`
      : `Tu solicitud de ${entityWithName} fue rechazada. Puedes intentar de nuevo con otro nombre si corresponde.`;

  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    content,
    data: {
      kind: 'catalog',
      vertical_key: 'autos',
      entity,
      entity_id: entityId,
      decision,
    },
    is_read: false,
  });

  if (error) {
    console.warn('[SimpleAdmin] failed to create notification', error);
    return { notified: false, notifiedUserId: userId, notificationError: error.message };
  }

  return { notified: true, notifiedUserId: userId };
}

export async function approveBrand(brandId: string): Promise<Result> {
  await requireStaffUser();
  const admin = createAdminServerClient();

  const { data: brand, error: approveError } = await admin
    .from('brands')
    .update({ is_verified: true })
    .eq('id', brandId)
    .select('id,name,created_by')
    .single();
  if (approveError) return { ok: false, error: approveError.message };

  const notification = await notifyCatalogDecision({
    admin,
    userId: (brand as any)?.created_by,
    entity: 'brand',
    entityId: brandId,
    entityName: (brand as any)?.name,
    decision: 'approved',
  });

  return { ok: true, ...notification };
}

export async function rejectBrand(brandId: string): Promise<Result> {
  await requireStaffUser();
  const admin = createAdminServerClient();

  const { count, error: countError } = await admin
    .from('listings_vehicles')
    .select('listing_id', { count: 'exact', head: true })
    .eq('brand_id', brandId);

  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) return { ok: false, error: 'No se puede rechazar: la marca ya está usada en publicaciones.' };

  const { data: brand, error: brandError } = await admin
    .from('brands')
    .select('id,name,created_by')
    .eq('id', brandId)
    .maybeSingle();
  if (brandError) return { ok: false, error: brandError.message };

  const { error } = await admin.from('brands').delete().eq('id', brandId);
  if (error) return { ok: false, error: error.message };

  const notification = await notifyCatalogDecision({
    admin,
    userId: (brand as any)?.created_by,
    entity: 'brand',
    entityId: brandId,
    entityName: (brand as any)?.name,
    decision: 'rejected',
  });
  return { ok: true, ...notification };
}

export async function approveModel(modelId: string): Promise<Result> {
  await requireStaffUser();
  const admin = createAdminServerClient();

  const { data: model, error: approveError } = await admin
    .from('models')
    .update({ is_verified: true })
    .eq('id', modelId)
    .select('id,name,created_by')
    .single();
  if (approveError) return { ok: false, error: approveError.message };

  const notification = await notifyCatalogDecision({
    admin,
    userId: (model as any)?.created_by,
    entity: 'model',
    entityId: modelId,
    entityName: (model as any)?.name,
    decision: 'approved',
  });
  return { ok: true, ...notification };
}

export async function rejectModel(modelId: string): Promise<Result> {
  await requireStaffUser();
  const admin = createAdminServerClient();

  const { count, error: countError } = await admin
    .from('listings_vehicles')
    .select('listing_id', { count: 'exact', head: true })
    .eq('model_id', modelId);

  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) return { ok: false, error: 'No se puede rechazar: el modelo ya está usado en publicaciones.' };

  const { data: model, error: modelError } = await admin
    .from('models')
    .select('id,name,created_by')
    .eq('id', modelId)
    .maybeSingle();
  if (modelError) return { ok: false, error: modelError.message };

  const { error } = await admin.from('models').delete().eq('id', modelId);
  if (error) return { ok: false, error: error.message };

  const notification = await notifyCatalogDecision({
    admin,
    userId: (model as any)?.created_by,
    entity: 'model',
    entityId: modelId,
    entityName: (model as any)?.name,
    decision: 'rejected',
  });
  return { ok: true, ...notification };
}
