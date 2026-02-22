import type { Profile } from "./index";

export type OAuthProvider = "google";

export interface AuthUserLike {
  id: string;
  email?: string | null;
  [key: string]: any;
}

export interface AuthSessionLike {
  user: AuthUserLike;
  access_token?: string;
  [key: string]: any;
}

export interface AuthErrorLike {
  message?: string;
  code?: string;
  [key: string]: any;
}

export interface AuthAdapterLoadProfileOptions {
  profilesTable: string;
  companiesTable: string;
  loadCompany: boolean;
}

export interface AuthSignUpResponseLike {
  user?: AuthUserLike | null;
  session?: AuthSessionLike | null;
  identities?: any[] | undefined;
}

export interface AuthAdapter {
  kind: string;
  rawClient?: unknown;
  getSession: () => Promise<AuthSessionLike | null>;
  refreshSession: () => Promise<AuthSessionLike | null>;
  getUser: () => Promise<AuthUserLike | null>;
  onAuthStateChange: (
    callback: (event: string, session: AuthSessionLike | null) => void
  ) => () => void;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error?: AuthErrorLike | null }>;
  signInWithOAuth: (
    provider: OAuthProvider,
    options?: { redirectTo?: string }
  ) => Promise<{ error?: AuthErrorLike | null }>;
  signUp: (params: {
    email: string;
    password: string;
    data?: Record<string, any>;
    emailRedirectTo?: string;
  }) => Promise<{ data?: AuthSignUpResponseLike; error?: AuthErrorLike | null }>;
  signOut: () => Promise<void>;
  loadProfile: (
    userId: string,
    options: AuthAdapterLoadProfileOptions
  ) => Promise<Profile | null>;
}
