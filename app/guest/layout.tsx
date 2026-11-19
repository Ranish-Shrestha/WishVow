import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Guest commitment",
  description: "Manage a WishVow guest commitment.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function GuestCommitmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="shell max-w-xl py-12">
      <div className="panel space-y-5">{children}</div>
    </section>
  );
}
