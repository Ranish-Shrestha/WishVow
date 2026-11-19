"use client";

import { useActionState, useState } from "react";
import { manageGuestCommitment } from "@/app/guest/actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { WishType } from "@/lib/validation/wishes";
import { CommitmentFields, type EditableTerms } from "./commitment-fields";

export function ManageForm({
  token,
  canEdit,
  canCancel,
  type,
  currency,
  defaults,
}: {
  token: string;
  canEdit: boolean;
  canCancel: boolean;
  type: WishType;
  currency: string | null;
  defaults: EditableTerms;
}) {
  const [state, action, pending] = useActionState(
    manageGuestCommitment.bind(null, token),
    {},
  );
  const [confirm, setConfirm] = useState(false);
  return (
    <form action={action} className="space-y-5 border-t border-border pt-5">
      {canEdit && (
        <CommitmentFields
          type={type}
          currency={currency}
          state={state}
          defaults={defaults}
        />
      )}
      <FormFeedback state={state} />
      {confirm && (
        <p className="text-sm text-muted-foreground">
          Cancelling returns your quantity or pledged amount to the wishlist.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canEdit && !confirm && (
          <Button name="intent" value="edit" type="submit" disabled={pending}>
            Save changes
          </Button>
        )}
        {canCancel &&
          (confirm ? (
            <>
              <Button
                name="intent"
                value="cancel"
                type="submit"
                variant="destructive"
                formNoValidate
                disabled={pending}
              >
                Confirm cancellation
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setConfirm(false)}
              >
                Keep commitment
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirm(true)}
            >
              Cancel commitment
            </Button>
          ))}
      </div>
    </form>
  );
}
