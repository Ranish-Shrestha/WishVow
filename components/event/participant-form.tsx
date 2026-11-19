"use client";

import { useActionState, useId } from "react";
import { participantAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";

export function ParticipantForm({
  eventId,
  participant,
}: {
  eventId: string;
  participant?: { id: string; displayName: string; roleLabel: string };
}) {
  const [state, action, pending] = useActionState(
    participantAction.bind(null, eventId, participant?.id ?? null),
    {},
  );
  const prefix = useId();
  const nameId = `${prefix}-name`;
  const roleId = `${prefix}-role`;
  const fields = {
    [nameId]: state.fields?.displayName,
    [roleId]: state.fields?.roleLabel,
  };

  return (
    <form
      action={action}
      className="space-y-3 border-t border-border py-4"
      aria-label={
        participant ? `Edit ${participant.displayName}` : "New participant"
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={nameId} label="Participant name" state={{ fields }}>
          <input
            name="displayName"
            className="control"
            required
            maxLength={120}
            defaultValue={participant?.displayName}
          />
        </Field>
        <Field id={roleId} label="Role label" state={{ fields }}>
          <input
            name="roleLabel"
            className="control"
            required
            maxLength={80}
            placeholder="e.g. Partner"
            defaultValue={participant?.roleLabel}
          />
        </Field>
      </div>
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending}
          variant={participant ? "outline" : "default"}
        >
          {participant ? "Save participant" : "Add participant"}
        </Button>
        {participant && (
          <Button
            type="submit"
            variant="destructive"
            name="intent"
            value="remove"
            formNoValidate
            disabled={pending}
          >
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}
