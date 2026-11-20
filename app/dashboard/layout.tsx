import Link from "next/link";
import type { ReactNode } from "react";
import { SignOut } from "@/components/ui/sign-out";
import { requireHost } from "@/lib/auth";

export const metadata = {
  title: "Host dashboard",
  robots: { index: false, follow: false },
};

export default async function HostLayout({
  children,
}: {
  children: ReactNode;
}) {
  const host = await requireHost();
  return (
    <>
      <header className="border-b border-border">
        <nav
          aria-label="Main navigation"
          className="shell flex min-h-16 items-center justify-between gap-3 py-2"
        >
          <Link
            href="/dashboard"
            className="shrink-0 font-serif text-2xl font-bold tracking-tight text-primary"
          >
            WishVow
          </Link>
          <details className="group relative min-w-0">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-end gap-2 rounded-lg px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-offset-[-2px] group-open:bg-muted [&::-webkit-details-marker]:hidden">
              <span className="truncate sm:max-w-56">{host.name}</span>
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rotate-45 border-r border-b border-current group-open:-rotate-135"
              />
            </summary>
            <div className="absolute end-0 top-full z-30 mt-1.5 w-36 max-w-[calc(100vw-2.5rem)] rounded-lg border border-border bg-card p-1 shadow-lg">
              <SignOut />
            </div>
          </details>
        </nav>
      </header>
      <main id="main" className="shell flex-1 pt-5 pb-12 sm:pt-8 sm:pb-14">
        {children}
      </main>
    </>
  );
}
