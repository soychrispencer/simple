// Context
export { AuthProvider, useAuth, useOptionalAuth } from './context/AuthContext';
export type { AuthContextValue, AuthProviderProps } from './context/AuthContext';

// SSO
export { VerticalSwitcher } from './sso/VerticalSwitcher';
export { ssoUtils, getSSOClient } from './sso/client';

// Types
export type {
  AuthStatus,
  Profile,
  UserWithProfile,
  AuthResult,
  SignUpOptions,
  SignInOptions
} from './types';
