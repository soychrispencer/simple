export type ScopeFilter = {
  column: 'public_profile_id' | 'user_id';
  value: string;
};

export interface ResolveScopeParams {
  userId?: string | null;
  publicProfileId?: string | null;
}

export interface DetailCopyConfig<TDetail = Record<string, any>> {
  /** Nombre de la tabla específica (p.e. listings_vehicles, listings_properties) */
  table: string;
  /** Alias opcional utilizado durante el select para acceder al payload */
  alias?: string;
  /** Columnas a seleccionar dentro del select anidado; por defecto usa '*' */
  select?: string;
  /** Permite personalizar el payload que se insertará para el nuevo listing */
  prepareInsertPayload?: (detail: TDetail, listingId: string) => Record<string, any>;
}

export interface DuplicateListingOptions {
  listingId: string;
  userId: string;
  scopeFilter?: ScopeFilter;
  detail?: DetailCopyConfig;
}

export type BulkStatus = 'published' | 'inactive' | 'draft';

