"use client";

import { useActionState, useState } from "react";
import { saveHostCommitment } from "@/app/dashboard/commitment-actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { Fulfilment } from "@/lib/services/host-commitment-rules";

const labels: Record<Fulfilment, string> = {
  purchased: "Mark purchased",
  fulfilled: "Mark fulfilled",
  cancelled: "Cancel commitment",
};

export function CommitmentControls({
  eventId,
  id,
  options,
  note,
  receipt,
}: {
  eventId: string;
  id: string;
  options: Fulfilment[];
  note: string | null;
  receipt?: { currency: string; value: string };
}) {
  const [intent, setIntent] = useState<Fulfilment | null>(null);
  const [state, action, pending] = useActionState(
    async (
      previous: Parameters<typeof saveHostCommitment>[2],
      form: FormData,
    ) => {
      const result = await saveHostCommitment(eventId, id, previous, form);
      if (result.success) setIntent(null);
      return result;
    },
    {},
  );
  const noteId = `note-${id}`;
  const amountId = `receipt-${id}`;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {intent ? (
        <form action={action} className="space-y-3">
          {intent === "cancelled" ? (
            <p className="text-sm text-muted-foreground">
              Cancelling releases the reserved capacity and notifies the guest.
            </p>
          ) : (
            <label
              htmlFor={noteId}
              className="block space-y-2 text-sm font-semibold"
            >
              <span>Host note (optional)</span>
              <textarea
                id={noteId}
                name="note"
                className="control"
                rows={2}
                maxLength={1000}
                defaultValue={note ?? ""}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={pending}
              name="intent"
              value={intent}
              variant={intent === "cancelled" ? "destructive" : "default"}
            >
              {intent === "cancelled" ? "Confirm cancellation" : labels[intent]}
            </Button>
            <Button
              type="button"
              disabled={pending}
              variant="outline"
              onClick={() => setIntent(null)}
            >
              Go back
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option}
              type="button"
              variant={option === "cancelled" ? "destructive" : "outline"}
              disabled={pending}
              onClick={() => setIntent(option)}
            >
              {labels[option]}
            </Button>
          ))}
        </div>
      )}
      {receipt && !intent && (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Record amount received
          </summary>
          <form action={action} className="space-y-3">
            <label htmlFor={amountId} className="block text-sm font-semibold">
              Received amount ({receipt.currency})
            </label>
            <input
              id={amountId}
              key={receipt.value}
              name="amount"
              className="control max-w-xs"
              required
              inputMode="decimal"
              maxLength={16}
              defaultValue={receipt.value}
            />
            <p className="text-sm text-muted-foreground">
              Enter the total received outside WishVow. Use 0 to clear the
              recorded amount.
            </p>
            <Button
              name="intent"
              value="receipt"
              disabled={pending}
              type="submit"
            >
              Save received amount
            </Button>
          </form>
        </details>
      )}
      <FormFeedback state={state} />
    </div>
  );
}
