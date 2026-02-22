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

type AutosAuthProviderProps = SharedAuthProviderProps & {
  children: ReactNode;
};

export function AuthProvider({ children, ...props }: AutosAuthProviderProps) {
  return (
    <SharedAuthProvider {...props}>
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

