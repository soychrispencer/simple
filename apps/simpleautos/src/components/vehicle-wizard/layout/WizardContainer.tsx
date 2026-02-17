"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface WizardContainerProps {
  stepKey: string;
  className?: string;
  children: React.ReactNode;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function WizardContainer({ stepKey, className, children }: WizardContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={cn("w-full", className)}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={stepKey}
        initial={{ opacity: 0, x: 18, y: 6 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: -18, y: -6 }}
        transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
        className={cn("w-full", className)}
      >
        {children}
      </motion.section>
    </AnimatePresence>
  );
}

export default WizardContainer;
