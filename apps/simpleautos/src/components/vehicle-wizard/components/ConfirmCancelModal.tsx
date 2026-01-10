"use client";

import React from 'react';
import { Modal, Button } from '@simple/ui';

export function ConfirmCancelModal({
  open,
  onClose,
  onConfirm,
  title = '¿Abandonar la publicación?',
  description = 'Si sales ahora, podrías perder cambios no guardados de este paso.',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Seguir editando
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onConfirm}>
            Salir
          </Button>
        </div>
      }
    >
      <p className="text-sm text-lighttext/70 dark:text-darktext/70">{description}</p>
    </Modal>
  );
}
