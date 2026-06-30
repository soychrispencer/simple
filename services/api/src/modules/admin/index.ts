// Admin module - barrel exports
export { createAdminRouter, type AdminRouterDeps } from './router.js';
export { listAdminUsersSnapshot, listAdminListingsSnapshot } from './snapshots.js';
export type { AdminUserSnapshot, AdminListingSnapshot } from './snapshots.js';
