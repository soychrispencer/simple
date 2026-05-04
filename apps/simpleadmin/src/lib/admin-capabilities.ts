import type { AdminSessionUser } from './api';
import type { AdminScope } from './admin-scope';

export type AdminCapability =
  | 'users.view'
  | 'users.editRole'
  | 'users.editStatus'
  | 'users.editSubscriptions'
  | 'users.delete'
  | 'serenatas.operations.view';

function isSuperadmin(user: AdminSessionUser): boolean {
  return user.role === 'superadmin';
}

export function hasAdminCapability(
  user: AdminSessionUser,
  capability: AdminCapability,
  scope: AdminScope
): boolean {
  if (capability === 'users.view') return true;
  if (capability === 'serenatas.operations.view') {
    return isSuperadmin(user) || scope === 'serenatas' || user.primaryVertical === 'serenatas';
  }
  if (capability === 'users.editRole') return isSuperadmin(user);
  if (capability === 'users.editStatus') return isSuperadmin(user);
  if (capability === 'users.editSubscriptions') return isSuperadmin(user);
  if (capability === 'users.delete') return isSuperadmin(user);
  return false;
}
