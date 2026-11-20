"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";
import { Field } from "@/components/ui/field";
import { FormFeedback, type FormState } from "@/components/ui/form-feedback";
import { FormSubmitActions } from "@/components/ui/form-submit-actions";
import { timeZoneOptions } from "@/lib/event-time-zones";
import { eventTypeLabels, eventTypes } from "@/lib/event-types";
import type { EventDetails, PrivacyInput } from "@/lib/validation/events";

type Defaults = EventDetails & Omit<PrivacyInput, "passcode">;

export function EventForm({
  event,
  canSetPrivacy,
  timeZones,
  action,
  cancelHref,
}: {
  event?: Defaults;
  canSetPrivacy: boolean;
  timeZones: readonly string[];
  action: (previous: FormState, data: FormData) => Promise<FormState>;
  cancelHref?: string;
}) {
  const [state, run, pending] = useActionState(action, {});
  const [privacy, setPrivacy] = useState(event?.privacy ?? "unlisted");
  const timeZone = event?.timezone ?? "America/Toronto";
  const zoneOptions = timeZoneOptions(
    timeZones.includes(timeZone) ? timeZones : [timeZone, ...timeZones],
  );

  function submit(form: FormEvent<HTMLFormElement>) {
    form.preventDefault();
    const data = new FormData(form.currentTarget);
    startTransition(() => run(data));
  }

  return (
    <form action={run} onSubmit={submit} className="space-y-6">
      <section className="panel space-y-5" aria-labelledby="event-details">
        <h2 id="event-details" className="text-2xl">
          Event details
        </h2>
        <Field id="title" label="Event title" state={state}>
          <input
            name="title"
            className="control"
            required
            maxLength={120}
            defaultValue={event?.title}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="eventType" label="Event type" state={state}>
            <select
              name="eventType"
              className="control"
              defaultValue={event?.eventType ?? "wedding_and_reception"}
            >
              {eventTypes.map((value) => (
                <option key={value} value={value}>
                  {eventTypeLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="eventDate" label="Event date (optional)" state={state}>
            <input
              name="eventDate"
              type="date"
              className="control"
              defaultValue={event?.eventDate ?? undefined}
            />
          </Field>
          <Field id="timezone" label="Time zone" state={state}>
            <select
              name="timezone"
              className="control"
              required
              defaultValue={timeZone}
            >
              {zoneOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="locationText" label="Location (optional)" state={state}>
          <input
            name="locationText"
            className="control"
            maxLength={180}
            defaultValue={event?.locationText ?? undefined}
          />
        </Field>
        <Field id="story" label="Your story (optional)" state={state}>
          <textarea
            name="story"
            className="control"
            rows={4}
            maxLength={4000}
            defaultValue={event?.story ?? undefined}
          />
        </Field>
      </section>
      {canSetPrivacy && (
        <section className="panel space-y-5" aria-labelledby="event-privacy">
          <h2 id="event-privacy" className="text-2xl">
            Privacy settings
          </h2>
          <Field
            id="privacy"
            label="Guest access"
            state={state}
            hint="Anyone with the link can open a published unlisted event."
          >
            <select
              name="privacy"
              className="control"
              value={privacy}
              onChange={(change) =>
                setPrivacy(
                  change.target.value === "passcode" ? "passcode" : "unlisted",
                )
              }
            >
              <option value="unlisted">Unlisted link</option>
              <option value="passcode">Passcode protected</option>
            </select>
          </Field>
          {privacy === "passcode" && (
            <Field
              id="passcode"
              label="Event passcode"
              state={state}
              hint={
                event?.privacy === "passcode"
                  ? "Leave blank to keep the current passcode."
                  : "Use at least eight characters."
              }
            >
              <input
                name="passcode"
                type="password"
                autoComplete="new-password"
                className="control"
                required={event?.privacy !== "passcode"}
                minLength={8}
                maxLength={128}
              />
            </Field>
          )}
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm text-muted-foreground">
              Preferences for future guest commitments
            </legend>
            <label className="flex items-start gap-3 text-sm">
              <input
                className="mt-0.5 size-4 accent-primary"
                type="checkbox"
                name="showGiverNamesToGuests"
                defaultChecked={event?.showGiverNamesToGuests}
              />
              Allow consenting givers’ names to appear to guests
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                className="mt-0.5 size-4 accent-primary"
                type="checkbox"
                name="surpriseMode"
                defaultChecked={event?.surpriseMode}
              />
              Hide giver details until fulfilment (surprise mode)
            </label>
          </fieldset>
        </section>
      )}
      <FormFeedback state={state} />
      <FormSubmitActions
        label={event ? "Update event" : "Create draft"}
        pending={pending}
        cancelHref={cancelHref}
      />
    </form>
  );
}
