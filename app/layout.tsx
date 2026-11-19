import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { HostDashboardLink } from "@/components/ui/host-dashboard-link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "WishVow", template: "%s | WishVow" },
  description: "Create a wishlist for your wedding, birthday, or celebration.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-10 rounded-md bg-card p-3 focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
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
        <footer className="border-t border-border">
          <div className="shell flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-muted-foreground">
            <span>WishVow · Event wishlists</span>
            <nav aria-label="Footer navigation" className="flex gap-4">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
