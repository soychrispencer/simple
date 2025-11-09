"use client";
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthModal from './AuthModal';

export function AuthModalMount() {
  const { authModalOpen, authModalMode, closeAuthModal } = useAuth();
  return <AuthModal open={authModalOpen} mode={authModalMode} onClose={closeAuthModal} />;
}
