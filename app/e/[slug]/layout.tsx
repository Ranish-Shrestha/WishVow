import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Event wishlist",
  description: "Open an event wishlist on WishVow.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function GuestLayout({ children }: { children: ReactNode }) {
  return children;
}
