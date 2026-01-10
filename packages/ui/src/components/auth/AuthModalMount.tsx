"use client";
import React from 'react';
import { useAuth } from '@simple/auth';
import dynamic from 'next/dynamic';
import type { AuthModalCopyOverrides } from './AuthModal';

// Carga diferida del modal para mejor performance
const AuthModal = dynamic(() => import('./AuthModal').then(m => m.AuthModal), { loading: () => null });

interface AuthModalMountProps {
  copy?: AuthModalCopyOverrides;
}

export function AuthModalMount({ copy }: AuthModalMountProps) {
  const { authModalOpen, authModalMode, closeAuthModal } = useAuth();
  return <AuthModal open={authModalOpen} mode={authModalMode} onClose={closeAuthModal} copy={copy} />;
}