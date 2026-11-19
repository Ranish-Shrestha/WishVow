"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pathsWithoutDashboardLink = [
  "/",
  "/terms",
  "/privacy",
  "/sign-up",
  "/sign-in",
  "/forgot-password",
  "/verify-host-email",
];

export function HostDashboardLink() {
  const pathname = usePathname();
  if (pathsWithoutDashboardLink.includes(pathname)) return null;

  return (
    <Link
      href="/dashboard"
      className="rounded-sm text-sm font-semibold text-primary hover:underline"
    >
      Host dashboard
    </Link>
  );
}
