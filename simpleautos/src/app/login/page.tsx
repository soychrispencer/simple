"use client";
import { useState } from 'react';
import AuthModal from '@/components/auth/AuthModal';

export default function LoginPage() {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <AuthModal
        open={modalOpen}
        mode="login"
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
