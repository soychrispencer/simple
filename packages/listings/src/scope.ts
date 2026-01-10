import type { ScopeFilter, ResolveScopeParams } from './types';

export function resolveScopeFilter({ userId, publicProfileId }: ResolveScopeParams): ScopeFilter | null {
  if (publicProfileId) {
    return { column: 'public_profile_id', value: publicProfileId };
  }
  if (userId) {
    return { column: 'user_id', value: userId };
  }
  return null;
}
