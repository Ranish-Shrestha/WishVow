"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";
import { saveInvitationDesign } from "@/app/dashboard/invitation-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import {
  invitationTemplates,
  type InvitationCardInput,
} from "@/lib/validation/invitations";
import { imageTypes, maxImageBytes } from "@/lib/validation/wishes";

export function InvitationDesignForm({
  eventId,
  values,
  hasPhoto,
}: {
  eventId: string;
  values: InvitationCardInput;
  hasPhoto: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveInvitationDesign.bind(null, eventId),
    {},
  );
  const [fileError, setFileError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("photo");
    if (file instanceof File && file.size > maxImageBytes) {
      setFileError("Choose an image up to 4 MB.");
      return;
    }
    setFileError("");
    startTransition(() => action(form));
  }
  return (
    <form action={action} onSubmit={submit} className="space-y-4">
      <Field id="names" label="Invitation names" state={state}>
        <input
          className="control"
          name="names"
          required
          maxLength={88}
          defaultValue={values.names}
        />
      </Field>
      <Field id="invitationDate" label="Invitation date" state={state}>
        <input
          className="control"
          name="invitationDate"
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          required
          defaultValue={values.invitationDate}
        />
      </Field>
      <Field id="venue" label="Venue" state={state}>
        <input
          className="control"
          name="venue"
          required
          maxLength={120}
          defaultValue={values.venue}
        />
      </Field>
      <Field id="template" label="Template" state={state}>
        <select
          className="control"
          name="template"
          defaultValue={values.template}
        >
          {invitationTemplates.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="accentColor" label="Accent color" state={state}>
          <input
            name="accentColor"
            type="color"
            className="block h-12 w-full rounded-md border border-border bg-card p-1"
            defaultValue={values.accentColor}
          />
        </Field>
        <Field id="backgroundColor" label="Background color" state={state}>
          <input
            name="backgroundColor"
            type="color"
            className="block h-12 w-full rounded-md border border-border bg-card p-1"
            defaultValue={values.backgroundColor}
          />
        </Field>
      </div>
      <Field
        id="photo"
        label={
          hasPhoto ? "Replace photo (optional)" : "Invitation photo (optional)"
        }
        hint="JPEG, PNG, or WebP up to 4 MB."
        state={fileError ? { fields: { photo: [fileError] } } : state}
      >
        <input
          name="photo"
          className="control"
          type="file"
          accept={imageTypes.join(",")}
          onChange={() => setFileError("")}
        />
      </Field>
      {hasPhoto && (
        <label className="flex items-center gap-2 text-sm">
          <input
            name="removePhoto"
            type="checkbox"
            className="accent-primary"
          />{" "}
          Remove current photo
        </label>
      )}
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save design"}
      </Button>
    </form>
  );
}
