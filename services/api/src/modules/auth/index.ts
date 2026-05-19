// Auth module - barrel exports
export { createAuthRouter, type AuthRouterDeps } from './router.js';
export { createAuthSessionRuntime, type AuthSessionRuntimeDeps } from './session-runtime.js';
export { getUserByEmail, canAuthenticateUser, touchUserLastLoginAt } from './user-auth.js';
export {
    isAdminRole,
    isAdminForVertical,
    isAdminBootstrapEnabled,
    isActiveAdminStatus,
    countActiveSuperadminUsers,
    requireAdminUser,
} from './admin-guard.js';
