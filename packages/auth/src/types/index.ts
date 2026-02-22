/**
 * Estados posibles de autenticación
 */
export type AuthStatus = 'initial' | 'checking' | 'authenticated' | 'anonymous' | 'error';

/**
 * Perfil de usuario extendido
 * Puede ser personalizado por cada vertical
 */
export interface Profile {
  id?: string;
  user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  cover_url?: string;
  visits?: number;
  company_id?: string;
  public_profile?: Record<string, any> | null;
  company_memberships?: Array<Record<string, any>>;
  [key: string]: any;
}

/**
 * Usuario combinado con perfil
 */
export interface UserWithProfile extends Profile {
  id: string;
  email?: string | null;
  [key: string]: any;
}

/**
 * Resultado de operaciones de autenticación
 */
export interface AuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Opciones para signUp
 */
export interface SignUpOptions {
  email: string;
  password: string;
  data?: Record<string, any>;
}

/**
 * Opciones para signIn
 */
export interface SignInOptions {
  email: string;
  password: string;
}
