"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="shell space-y-4 py-16">
      <h1 className="text-4xl">This page couldn’t load</h1>
      <p>Try again in a moment.</p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
