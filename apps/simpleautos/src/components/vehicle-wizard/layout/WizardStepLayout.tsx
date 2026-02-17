"use client";
import React from 'react';
import { WizardProgressStepper } from './WizardProgressStepper';

type Align = 'left' | 'center';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export interface WizardStepLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  showStepper?: boolean;
  footer?: React.ReactNode;
  footerClassName?: string;
  showFooterDivider?: boolean;
  stickyFooter?: boolean;
  align?: Align;
  className?: string;
  contentClassName?: string;
}

export function WizardStepLayout({
  title,
  description,
  summary,
  children,
  eyebrow,
  actions,
  showStepper = true,
  footer,
  footerClassName,
  showFooterDivider = true,
  stickyFooter = true,
  align = 'center',
  className,
  contentClassName,
}: WizardStepLayoutProps) {
  const headerAlign = align === 'center' ? 'items-center text-center' : 'items-start text-left';

  const hasFooter = !!footer;
  const stickyEnabled = hasFooter && stickyFooter;

  return (
    <div
      className={cn(
        'w-full flex flex-col gap-6',
        // Espacio extra para que el footer sticky no tape contenido
        stickyEnabled ? 'pb-24' : '',
        className
      )}
    >
      <header className={cn('flex flex-col gap-3 sm:gap-4', headerAlign)}>
        {eyebrow && (
          <span className="type-label text-[var(--color-primary-a70)] dark:text-[var(--color-primary-a80)]">
            {eyebrow}
          </span>
        )}
        <div className="flex w-full items-start justify-between gap-6">
          <div className={cn('flex flex-col gap-3 flex-1', align === 'center' ? 'items-center' : '')}>
            <h1 className="type-title-1 sm:text-4xl font-bold text-lighttext dark:text-darktext">{title}</h1>
            {description && (
              <p className="type-body-md sm:text-lg text-lighttext/70 dark:text-darktext/70">
                {description}
              </p>
            )}

            {showStepper && (
              <div className="pt-1 w-full">
                <WizardProgressStepper />
              </div>
            )}

            {summary && (
              <div className="type-caption text-lighttext/60 dark:text-darktext/60">
                {summary}
              </div>
            )}
          </div>
          {actions && (
            <div className="shrink-0 flex items-center gap-3">{actions}</div>
          )}
        </div>
      </header>

      <div className={cn('w-full', contentClassName)}>{children}</div>

      {footer && (
        <div
          className={cn(
            stickyEnabled ? 'sticky bottom-0 z-20' : '',
            stickyEnabled ? 'bg-[var(--color-card)]/95 dark:bg-[var(--color-card)]/95 backdrop-blur-md' : '',
            showFooterDivider ? 'pt-4 border-t border-border/60' : 'pt-4',
            footerClassName
          )}
        >
          <div className={cn(stickyEnabled ? 'pb-3' : '')}>{footer}</div>
        </div>
      )}
    </div>
  );
}

export default WizardStepLayout;
