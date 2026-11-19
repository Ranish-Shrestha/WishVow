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
    <div className="shell pb-14">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
        <Link
          href="/dashboard"
          className="font-semibold text-primary hover:underline"
        >
          My events
        </Link>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="max-w-48 truncate text-sm text-muted-foreground">
            {host.name}
          </span>
          <SignOut />
        </div>
      </div>
      {children}
    </div>
  );
}
