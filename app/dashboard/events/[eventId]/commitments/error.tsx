"use client";

import { Button } from "@/components/ui/button";

export default function CommitmentsError({ reset }: { reset: () => void }) {
  return (
    <section className="panel mt-8 space-y-4">
      <h1 className="text-3xl">Commitments couldn’t load</h1>
      <p className="text-muted-foreground">Try loading this page again.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
