import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Private invitation",
  description: "Open your invitation and reply on WishVow.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function InvitationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
