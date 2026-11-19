"use client";

import { useActionState, useState } from "react";
import {
  addInvitationLink,
  changeGuestInvitation,
} from "@/app/dashboard/invitation-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";

export function NewInvitationLink({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(
    addInvitationLink.bind(null, eventId),
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field id="label" label="Household label" state={state}>
          <input name="label" className="control" required maxLength={100} />
        </Field>
        <Field id="maxParty" label="Maximum party size" state={state}>
          <input
            name="maxParty"
            className="control"
            type="number"
            defaultValue={2}
            min={1}
            max={12}
            required
          />
        </Field>
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invitation link"}
      </Button>
    </form>
  );
}

export function InvitationLinkControls({
  eventId,
  recipientId,
}: {
  eventId: string;
  recipientId: string;
}) {
  const [intent, setIntent] = useState<"rotate" | "revoke" | null>(null);
  const [state, action, pending] = useActionState(
    async (
      previous: import("@/components/ui/form-feedback").FormState,
      form: FormData,
    ) => {
      const result = await changeGuestInvitation(
        eventId,
        recipientId,
        previous,
        form,
      );
      if (result.success) setIntent(null);
      return result;
    },
    {},
  );
  return (
    <form action={action} className="space-y-3">
      {intent ? (
        <>
          <p className="text-sm text-muted-foreground">
            {intent === "rotate"
              ? "The old link and QR code will stop working. This household’s RSVP stays saved."
              : "The link and QR code will stop working. This household’s RSVP stays in your records."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="destructive"
              name="intent"
              value={intent}
              disabled={pending}
            >
              {intent === "rotate" ? "Confirm new link" : "Confirm revoke"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIntent(null)}
              disabled={pending}
            >
              Keep link
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIntent("rotate")}
            disabled={pending}
          >
            Rotate link
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIntent("revoke")}
            disabled={pending}
          >
            Revoke link
          </Button>
        </div>
      )}
      <FormFeedback state={state} />
    </form>
  );
}
