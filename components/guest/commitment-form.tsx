"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import {
  recoverGuestCommitment,
  requestGuestCommitment,
} from "@/app/guest/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { WishType } from "@/lib/validation/wishes";
import { CommitmentFields } from "./commitment-fields";

export function CommitmentForm({
  slug,
  wishId,
  type,
  currency,
  remaining,
}: {
  slug: string;
  wishId: string;
  type: WishType;
  currency: string | null;
  remaining: number | null;
}) {
  const [state, dispatch, pending] = useActionState(
    requestGuestCommitment.bind(null, slug, wishId),
    {},
  );
  const [recovery, recover, recovering] = useActionState(
    recoverGuestCommitment.bind(null, slug, wishId),
    {},
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }

  return (
    <section className="space-y-5 border-t border-border pt-5">
      {remaining !== 0 && (
        <div className="space-y-2">
          <h2 className="text-2xl">
            {type === "group_fund"
              ? "Pledge an amount"
              : type === "service" || type === "open_wish"
                ? "Make a promise"
                : "Reserve this wish"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your commitment becomes active after you confirm by email, if
            capacity is still available.
            {type === "group_fund" && " No payment is collected here."}
          </p>
        </div>
      )}
      {remaining !== 0 && !state.success && (
        <form action={dispatch} onSubmit={submit} className="space-y-4">
          <Field id="displayName" label="Your name" state={state}>
            <input
              className="control"
              name="displayName"
              autoComplete="name"
              required
              maxLength={120}
            />
          </Field>
          <Field id="email" label="Email address" state={state}>
            <input
              className="control"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </Field>
          <CommitmentFields
            type={type}
            currency={currency}
            state={state}
            maxQuantity={remaining}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Requesting…" : "Send confirmation link"}
          </Button>
        </form>
      )}
      <FormFeedback state={state} />
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-primary">
          Recover a management link
        </summary>
        <form action={recover} className="mt-3 space-y-3">
          <Field id="recover-email" label="Email used for the commitment">
            <input
              className="control"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </Field>
          <Button type="submit" variant="outline" disabled={recovering}>
            {recovering ? "Requesting…" : "Email management link"}
          </Button>
          <FormFeedback state={recovery} />
        </form>
      </details>
    </section>
  );
}
