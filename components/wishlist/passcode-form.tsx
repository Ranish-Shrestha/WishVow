"use client";

import { useActionState } from "react";
import { unlockEvent } from "@/app/e/[slug]/actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

export function PasscodeForm({
  slug,
  wishId = null,
}: {
  slug: string;
  wishId?: string | null;
}) {
  const [state, action, pending] = useActionState(
    unlockEvent.bind(null, slug, wishId),
    {},
  );
  return (
    <section className="shell max-w-lg py-14">
      <div className="panel space-y-5">
        <h1 className="text-4xl">This wishlist is private</h1>
        <p className="text-muted-foreground">
          Enter the passcode from your host to open the wishlist.
        </p>
        <form className="space-y-4" action={action}>
          <label className="block text-sm font-semibold">
            Event passcode
            <input
              className="control mt-1.5"
              name="passcode"
              type="password"
              required
              maxLength={128}
              autoComplete="off"
            />
          </label>
          <FormFeedback state={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Unlock wishlist"}
          </Button>
        </form>
      </div>
    </section>
  );
}
