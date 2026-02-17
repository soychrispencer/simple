export interface HeaderUser {
  username?: string | null;
  first_name?: string | null;
  public_name?: string | null;
  nombre?: string | null;
  name?: string | null;
  profile?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  public_profile?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export type HeaderUserPermissions = Record<string, unknown>;
