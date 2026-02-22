import type {
  DetailCopyConfig,
  DuplicateListingOptions,
  ScopeFilter,
  BulkStatus,
} from './types';

type DatabaseClient = any;

function buildSelectClause(detail?: DetailCopyConfig) {
  const base = `
    *,
    images:images (url, position, is_primary, alt_text, caption)
  `;

  if (!detail) {
    return base;
  }

  const alias = detail.alias ?? detail.table;
  const relation = alias === detail.table ? detail.table : `${alias}:${detail.table}`;
  const select = detail.select ?? '*';

  return `${base}, ${relation} (${select})`;
}

async function fetchListingWithRelations(
  client: DatabaseClient,
  options: DuplicateListingOptions
): Promise<Record<string, any>> {
  const { listingId, scopeFilter, detail } = options;
  let query = client
    .from('listings')
    .select(buildSelectClause(detail))
    .eq('id', listingId);

  if (scopeFilter) {
    query = query.eq(scopeFilter.column, scopeFilter.value);
  }

  const { data, error } = await query.single();
  if (error || !data) {
    throw error ?? new Error('Listado no encontrado');
  }
  return data as Record<string, any>;
}

function defaultDetailPayload(detail: Record<string, any>, listingId: string) {
  const timestamp = new Date().toISOString();
  const payload = { ...detail, listing_id: listingId, created_at: timestamp, updated_at: timestamp };
  delete (payload as any).id;
  return payload;
}

function buildDetailRows(
  detailConfig: DetailCopyConfig | undefined,
  original: Record<string, any>,
  listingId: string
) {
  if (!detailConfig) return [];
  const alias = detailConfig.alias ?? detailConfig.table;
  const rawDetail = original?.[alias];
  if (!rawDetail) return [];
  const rows = Array.isArray(rawDetail) ? rawDetail : [rawDetail];
  return rows
    .filter(Boolean)
    .map((row) =>
      detailConfig.prepareInsertPayload
        ? detailConfig.prepareInsertPayload(row, listingId)
        : defaultDetailPayload(row, listingId)
    );
}

export async function duplicateListingWithRelations(
  client: DatabaseClient,
  options: DuplicateListingOptions
): Promise<string> {
  const original = await fetchListingWithRelations(client, options);
  const { userId, detail } = options;

  const inferredPublicProfileId =
    original.public_profile_id ??
    (options.scopeFilter?.column === 'public_profile_id' ? options.scopeFilter.value : null);

  if (!inferredPublicProfileId) {
    throw new Error('No se pudo determinar el public_profile_id para duplicar la publicación');
  }

  const basePayload = {
    vertical_id: original.vertical_id,
    company_id: original.company_id,
    user_id: userId,
    public_profile_id: inferredPublicProfileId,
    listing_type: original.listing_type,
    title: original.title,
    description: original.description,
    price: original.price,
    currency: original.currency,
    contact_phone: original.contact_phone,
    contact_email: original.contact_email,
    contact_whatsapp: original.contact_whatsapp,
    location: original.location,
    ubicacion_mapa: original.ubicacion_mapa,
    region_id: original.region_id,
    commune_id: original.commune_id,
    tags: original.tags,
    metadata: original.metadata,
    allow_financing: original.allow_financing,
    allow_exchange: original.allow_exchange,
    rent_daily_price: original.rent_daily_price,
    rent_weekly_price: original.rent_weekly_price,
    rent_monthly_price: original.rent_monthly_price,
    rent_security_deposit: original.rent_security_deposit,
    auction_start_price: original.auction_start_price,
    auction_start_at: original.auction_start_at,
    auction_end_at: original.auction_end_at,
    video_url: original.video_url,
    document_urls: original.document_urls,
    status: 'draft',
    visibility: original.visibility ?? 'normal',
    is_featured: false,
    featured_until: null,
    views: 0,
    published_at: null,
    expires_at: null,
    is_urgent: original.is_urgent ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: insertResult, error: insertError } = await client
    .from('listings')
    .insert(basePayload)
    .select('id')
    .single();

  if (insertError || !insertResult?.id) {
    throw insertError ?? new Error('No se pudo duplicar la publicación');
  }

  const listingId = insertResult.id;
  const detailRows = buildDetailRows(detail, original, listingId);

  if (detail && detailRows.length) {
    const { error: detailError } = await client.from(detail.table).insert(detailRows);
    if (detailError) {
      throw detailError;
    }
  }

  const imageRows = (original.images || []).map((img: any, index: number) => ({
    listing_id: listingId,
    url: img.url,
    alt_text: img.alt_text,
    caption: img.caption,
    position: img.position ?? index,
    is_primary: index === 0 || img.is_primary || false,
  }));

  if (imageRows.length > 0) {
    const { error: imageError } = await client.from('images').insert(imageRows);
    if (imageError) {
      throw imageError;
    }
  }

  await client
    .from('listing_metrics')
    .upsert({ listing_id: listingId, views: 0, clicks: 0 }, { onConflict: 'listing_id' });

  return listingId;
}

export async function bulkDeleteListings(
  client: DatabaseClient,
  ids: string[],
  scopeFilter?: ScopeFilter
) {
  if (!ids.length) return;
  let query = client.from('listings').delete().in('id', ids);
  if (scopeFilter) {
    query = query.eq(scopeFilter.column, scopeFilter.value);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function bulkUpdateListingStatus(
  client: DatabaseClient,
  ids: string[],
  status: BulkStatus,
  scopeFilter?: ScopeFilter
) {
  if (!ids.length) return;
  const now = new Date().toISOString();
  let query = client
    .from('listings')
    .update({
      status,
      updated_at: now,
      published_at: status === 'published' ? now : null,
    })
    .in('id', ids);

  if (scopeFilter) {
    query = query.eq(scopeFilter.column, scopeFilter.value);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function bulkToggleFeaturedListings(
  client: DatabaseClient,
  ids: string[],
  featured: boolean,
  scopeFilter?: ScopeFilter
) {
  if (!ids.length) return;
  let query = client
    .from('listings')
    .update({ is_featured: featured, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (scopeFilter) {
    query = query.eq(scopeFilter.column, scopeFilter.value);
  }

  const { error } = await query;
  if (error) throw error;
}
