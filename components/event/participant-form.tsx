"use client";

import { useActionState, useEffect, useId, useRef } from "react";
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
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [state, action, pending] = useActionState(
    participantAction.bind(null, eventId, participant?.id ?? null),
    {},
  );
  useEffect(() => {
    const details = detailsRef.current;
    if (state.success && details?.open) {
      const restoreFocus = details.contains(document.activeElement);
      details.open = false;
      if (restoreFocus) summaryRef.current?.focus();
    }
  }, [state]);
  const prefix = useId();
  const nameId = `${prefix}-name`;
  const roleId = `${prefix}-role`;
  const fields = {
    [nameId]: state.fields?.displayName,
    [roleId]: state.fields?.roleLabel,
  };

  return (
    <>
      <details
        ref={detailsRef}
        name={`participants-${eventId}`}
        className="group peer"
      >
        <summary
          ref={summaryRef}
          aria-label={
            participant ? `Edit ${participant.displayName}` : "Add participant"
          }
          className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted [&::-webkit-details-marker]:hidden"
        >
          {participant ? (
            <>
              <span className="min-w-0 wrap-anywhere">
                <span className="block font-semibold">
                  {participant.displayName}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {participant.roleLabel}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-sm font-semibold text-primary"
              >
                <span className="group-open:hidden">Edit</span>
                <span className="hidden group-open:inline">Close</span>
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-primary">
              <span aria-hidden="true" className="me-1">
                +
              </span>
              Add participant
            </span>
          )}
        </summary>
        <form
          action={action}
          className="space-y-3 px-2 pt-2 pb-4"
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
          {state.error && <FormFeedback state={state} />}
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
      </details>
      {state.success && (
        <div className="px-2 pb-2 peer-open:hidden">
          <FormFeedback state={state} />
        </div>
      )}
    </>
  );
}
