"use client";
import React from 'react';
import dynamic from 'next/dynamic';

// Carga diferida del modal sólo en cliente.
const AuthModalMount = dynamic(() => import('./AuthModalMount').then(m => m.AuthModalMount), { loading: () => null });

export const AuthModalLazy: React.FC = () => {
  return <AuthModalMount />;
};
