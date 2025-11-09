"use client";
import React from "react";
import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <IconChevronRight size={16} />}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-black dark:text-white font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
