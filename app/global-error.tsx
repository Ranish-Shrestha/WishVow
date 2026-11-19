"use client";

import "./globals.css";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="shell space-y-4 py-16">
          <h1 className="text-4xl">WishVow is temporarily unavailable</h1>
          <Button onClick={reset}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
