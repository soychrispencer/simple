"use client";

import type { ReactNode } from "react";
import {
  AuthProvider as SharedAuthProvider,
  useAuth as useSharedAuth,
} from "@simple/auth";
import type {
  AuthProviderProps as SharedAuthProviderProps,
  AuthContextValue,
  AuthStatus,
  Profile,
  UserWithProfile,
  AuthResult,
  SignInOptions,
  SignUpOptions,
} from "@simple/auth";
import { getSupabaseClient } from "@/lib/supabase/supabase";

type AutosAuthProviderProps = Omit<SharedAuthProviderProps, "supabaseClient"> & {
  children: ReactNode;
};

export function AuthProvider({ children, ...props }: AutosAuthProviderProps) {
  const supabaseClient = getSupabaseClient();

  return (
    <SharedAuthProvider supabaseClient={supabaseClient} {...props}>
      {children}
    </SharedAuthProvider>
  );
}

export const useAuth = useSharedAuth;

export type {
  AuthContextValue,
  AuthStatus,
  Profile,
  UserWithProfile,
  AuthResult,
  SignInOptions,
  SignUpOptions,
};

