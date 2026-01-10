"use client";
import { useState } from 'react';
import { AuthModal } from '@simple/ui';
import { autosAuthCopy } from '@/config/authCopy';

export default function LoginPage() {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightbg dark:bg-darkbg">
      <AuthModal
        open={modalOpen}
        mode="login"
        onClose={() => setModalOpen(false)}
        copy={autosAuthCopy}
      />
    </div>
  );
}







