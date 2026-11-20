"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { HostDashboardLink } from "./host-dashboard-link";

export function PublicPageLayout({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  if (segment === "dashboard") return children;

  return (
    <>
      <header className="border-b border-border">
        <nav
          aria-label="Main navigation"
          className="shell flex min-h-17 items-center justify-between gap-4"
        >
          <Link
            href="/"
            className="font-serif text-2xl font-bold tracking-tight text-primary"
          >
            WishVow
          </Link>
          <HostDashboardLink />
        </nav>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
