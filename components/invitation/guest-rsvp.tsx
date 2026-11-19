"use client";

import {
  useActionState,
  useState,
  startTransition,
  type FormEvent,
} from "react";
import { saveRsvp } from "@/app/invite/[token]/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";

export function GuestRsvp({
  token,
  maxParty,
  reply,
  count,
  message,
}: {
  token: string;
  maxParty: number;
  reply: "attending" | "not_attending" | null;
  count: number | null;
  message: string | null;
}) {
  const [status, setStatus] = useState(reply ?? "");
  const [state, action, pending] = useActionState(
    saveRsvp.bind(null, token),
    {},
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => action(form));
  }
  return (
    <form className="space-y-5" action={action} onSubmit={submit}>
      <Field id="status" label="Will you attend?" state={state}>
        <select
          name="status"
          className="control"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          required
        >
          <option value="">Choose your response</option>
          <option value="attending">Attending</option>
          <option value="not_attending">Not attending</option>
        </select>
      </Field>
      {status === "attending" && (
        <Field
          id="partySize"
          label="Party size, including you"
          state={state}
          hint={`This invitation allows up to ${maxParty} ${maxParty === 1 ? "guest" : "guests"}.`}
        >
          <input
            className="control"
            name="partySize"
            type="number"
            min={1}
            max={maxParty}
            defaultValue={count || 1}
            required
          />
        </Field>
      )}
      <Field id="message" label="Message for the host (optional)" state={state}>
        <textarea
          className="control"
          name="message"
          defaultValue={message ?? ""}
          maxLength={1000}
          rows={4}
        />
      </Field>
      <FormFeedback state={state} />
      <Button disabled={pending} type="submit">
        {pending ? "Saving…" : "Save RSVP"}
      </Button>
    </form>
  );
}
