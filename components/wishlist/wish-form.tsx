"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback, type FormState } from "@/components/ui/form-feedback";
import type { wishes } from "@/lib/db/schema";
import { amountInput } from "@/lib/utils/money";
import {
  imageTypes,
  maxImageBytes,
  wishCategories,
  wishTypes,
  type WishType,
} from "@/lib/validation/wishes";

type EditableWish = Omit<typeof wishes.$inferSelect, "imageKey">;

export function WishForm({
  action,
  participants,
  wish,
  imageUrl,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  participants: { id: string; displayName: string; roleLabel: string }[];
  wish?: EditableWish;
  imageUrl?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [type, setType] = useState<WishType>(wish?.type ?? "physical");
  const [fileError, setFileError] = useState("");
  const currency = wish?.currency ?? "CAD";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    if (image instanceof File && image.size > maxImageBytes) {
      setFileError("Choose a file up to 4 MB.");
      return;
    }
    setFileError("");
    startTransition(() => dispatch(form));
  }

  return (
    <form action={dispatch} onSubmit={submit} className="space-y-5">
      <section className="panel space-y-5">
        <h2 className="text-2xl">Wish details</h2>
        <Field id="title" label="Wish title" state={state}>
          <input
            className="control"
            name="title"
            required
            maxLength={120}
            defaultValue={wish?.title}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="type" label="Wish type" state={state}>
            <select
              className="control"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as WishType)}
            >
              {wishTypes.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="category" label="Category" state={state}>
            <select
              className="control"
              name="category"
              defaultValue={wish?.category ?? "other"}
            >
              {wishCategories.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="participantId" label="Wishlist owner" state={state}>
            <select
              className="control"
              name="participantId"
              defaultValue={wish?.participantId ?? ""}
            >
              <option value="">Shared</option>
              {participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName} · {person.roleLabel}
                </option>
              ))}
            </select>
          </Field>
          <Field id="priority" label="Priority" state={state}>
            <select
              className="control"
              name="priority"
              defaultValue={wish?.priority ?? "normal"}
            >
              <option value="normal">Normal</option>
              <option value="favorite">Favorite</option>
            </select>
          </Field>
        </div>
        <Field
          id="description"
          label={type === "service" ? "Description" : "Description (optional)"}
          state={state}
        >
          <textarea
            className="control"
            name="description"
            rows={4}
            required={type === "service"}
            maxLength={4000}
            defaultValue={wish?.description ?? ""}
          />
        </Field>
        <Field id="notes" label="Guest instructions (optional)" state={state}>
          <textarea
            className="control"
            name="notes"
            rows={3}
            maxLength={1500}
            defaultValue={wish?.notes ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="deadline" label="Deadline (optional)" state={state}>
            <input
              className="control"
              name="deadline"
              type="date"
              defaultValue={wish?.deadline ?? ""}
            />
          </Field>
          <Field
            id="externalUrl"
            label="Product or provider link (optional)"
            state={state}
          >
            <input
              className="control"
              name="externalUrl"
              type="url"
              maxLength={2048}
              defaultValue={wish?.externalUrl ?? ""}
            />
          </Field>
        </div>
      </section>
      <section className="panel space-y-5">
        <h2 className="text-2xl">Quantity and amounts</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {type !== "group_fund" && (
            <Field
              id="quantity"
              label={
                type === "service"
                  ? "Helper slots (optional)"
                  : "Quantity (optional)"
              }
              state={state}
              hint={
                type === "service"
                  ? "Leave blank for no slot limit."
                  : "Defaults to one unless multiple promises are enabled."
              }
            >
              <input
                key={type}
                className="control"
                name="quantity"
                type="number"
                min={1}
                max={999}
                defaultValue={
                  wish?.type === type ? (wish.quantityTotal ?? "") : ""
                }
              />
            </Field>
          )}
          {(type === "physical" || type === "experience") && (
            <Field
              id="suggested"
              label="Estimated price per item (optional)"
              state={state}
            >
              <input
                className="control"
                name="suggested"
                inputMode="decimal"
                maxLength={16}
                defaultValue={amountInput(
                  wish?.suggestedAmountMinor ?? null,
                  currency,
                )}
              />
            </Field>
          )}
          {type === "group_fund" && (
            <>
              <Field id="target" label="Fund goal" state={state}>
                <input
                  className="control"
                  name="target"
                  inputMode="decimal"
                  required
                  maxLength={16}
                  defaultValue={amountInput(
                    wish?.targetAmountMinor ?? null,
                    currency,
                  )}
                />
              </Field>
              <Field
                id="minimum"
                label="Minimum pledge (optional)"
                state={state}
              >
                <input
                  className="control"
                  name="minimum"
                  inputMode="decimal"
                  maxLength={16}
                  defaultValue={amountInput(
                    wish?.minimumAmountMinor ?? null,
                    currency,
                  )}
                />
              </Field>
            </>
          )}
          {(type === "physical" ||
            type === "experience" ||
            type === "group_fund") && (
            <Field id="currency" label="Currency code" state={state}>
              <input
                className="control"
                name="currency"
                required
                maxLength={3}
                defaultValue={currency}
              />
            </Field>
          )}
        </div>
        {type === "open_wish" && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="allowMultipleCommitments"
              className="mt-0.5 accent-primary"
              defaultChecked={wish?.allowMultipleCommitments}
            />
            Allow multiple promises when quantity is blank
          </label>
        )}
      </section>
      <section className="panel space-y-5">
        <h2 className="text-2xl">Image and visibility</h2>
        {imageUrl && (
          <div className="space-y-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-primary underline"
            >
              View current image
            </a>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-primary"
                name="removeImage"
              />
              Remove current image
            </label>
          </div>
        )}
        <Field
          id="image"
          label={
            imageUrl ? "Replace image (optional)" : "Wish image (optional)"
          }
          state={fileError ? { fields: { image: [fileError] } } : state}
          hint="JPEG, PNG, or WebP up to 4 MB."
        >
          <input
            name="image"
            type="file"
            accept={imageTypes.join(",")}
            className="control"
            onChange={() => setFileError("")}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            name="isVisible"
            defaultChecked={wish?.isVisible ?? true}
          />
          Show this wish to guests when the event is published
        </label>
      </section>
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : wish ? "Save wish" : "Add wish"}
      </Button>
    </form>
  );
}
