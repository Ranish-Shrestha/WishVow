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
import { InfoPopover } from "@/components/ui/info-popover";
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
type HelpTopic = "type" | "category" | "amounts" | "visibility";
type HelpOption = [label: string, explanation: string];

const wishTypeHelp: Record<WishType, string> = {
  physical: "Reserve an item, such as a tea set.",
  experience: "Reserve an experience, such as a cooking class.",
  group_fund:
    "Pledge an amount toward a shared goal. WishVow tracks pledges without collecting payments.",
  service: "Offer to do a specific task, such as taking photos.",
  open_wish: "Suggest their own way to help or give.",
};

const categoryExamples: Record<(typeof wishCategories)[number][0], string> = {
  home: "Cookware, bedding, or furniture.",
  travel: "Flights, hotel stays, or luggage.",
  celebration: "Cake, flowers, or decorations.",
  experiences: "Classes, concerts, or spa visits.",
  services: "Photography, setup help, or pet sitting.",
  other: "Wishes that don’t fit the other categories.",
};

const reservationAmounts: HelpOption[] = [
  [
    "Quantity",
    "The total number of items or spots guests can reserve. Leave it blank for one.",
  ],
  [
    "Estimated price per item",
    "An optional guide to what one item or experience costs.",
  ],
  ["Currency code", "The currency of the estimate, such as CAD or USD."],
];

const amountHelp: Record<WishType, HelpOption[]> = {
  physical: reservationAmounts,
  experience: reservationAmounts,
  group_fund: [
    ["Fund goal", "The total amount guests can pledge toward the wish."],
    ["Minimum pledge", "An optional minimum amount for each pledge."],
    [
      "Currency code",
      "The currency of the goal and pledges, such as CAD or USD.",
    ],
  ],
  service: [
    ["Helper slots", "How many guests you need. Leave it blank for no limit."],
  ],
  open_wish: [
    [
      "Quantity",
      "The number of guest promises you can accept. Leave it blank for one.",
    ],
    [
      "Allow multiple promises",
      "With a blank quantity, turn this on to accept any number of promises.",
    ],
  ],
};

function WishOptionsHelp({
  description,
  options,
}: {
  description: string;
  options: HelpOption[];
}) {
  return (
    <>
      <p>{description}</p>
      <dl className="space-y-1.5">
        {options.map(([label, example]) => (
          <div key={label}>
            <dt className="inline font-semibold text-foreground">{label}. </dt>
            <dd className="inline">{example}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function WishForm({
  action,
  participants,
  wish,
  imageUrl,
  cancelHref,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  participants: { id: string; displayName: string; roleLabel: string }[];
  wish?: EditableWish;
  imageUrl?: string;
  cancelHref: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [type, setType] = useState<WishType>(wish?.type ?? "physical");
  const [fileError, setFileError] = useState("");
  const [openHelp, setOpenHelp] = useState<HelpTopic | null>(null);
  const currency = wish?.currency ?? "CAD";

  function showHelp(topic: HelpTopic, open: boolean) {
    setOpenHelp((current) => {
      if (open) return topic;
      return current === topic ? null : current;
    });
  }

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
          <Field
            id="type"
            label="Wish type"
            state={state}
            help={{
              open: openHelp === "type",
              onOpenChange: (open) => showHelp("type", open),
              content: (
                <WishOptionsHelp
                  description="Wish type controls what guests can do."
                  options={wishTypes.map(([key, label]) => [
                    label,
                    wishTypeHelp[key],
                  ])}
                />
              ),
            }}
          >
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
          <Field
            id="category"
            label="Category"
            state={state}
            help={{
              open: openHelp === "category",
              onOpenChange: (open) => showHelp("category", open),
              content: (
                <WishOptionsHelp
                  description="Categories help guests filter the wishlist."
                  options={wishCategories.map(([key, label]) => [
                    label,
                    categoryExamples[key],
                  ])}
                />
              ),
            }}
          >
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
        <div className="relative flex items-center gap-1">
          <h2 className="text-2xl">Quantity and amounts</h2>
          <InfoPopover
            id="quantity-and-amounts"
            label="Quantity and amounts"
            open={openHelp === "amounts"}
            onOpenChange={(open) => showHelp("amounts", open)}
          >
            <WishOptionsHelp
              description={
                type === "group_fund"
                  ? "WishVow tracks pledges without collecting payments."
                  : "These fields set how many guests can help or how much a gift might cost."
              }
              options={amountHelp[type]}
            />
          </InfoPopover>
        </div>
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
        <div className="relative flex items-center gap-1">
          <h2 className="text-2xl">Image and visibility</h2>
          <InfoPopover
            id="image-and-visibility"
            label="Image and visibility"
            open={openHelp === "visibility"}
            onOpenChange={(open) => showHelp("visibility", open)}
          >
            <WishOptionsHelp
              description="Choose what guests see on the published wishlist."
              options={[
                [
                  "Wish image",
                  "An optional photo to help guests recognize the wish. You can replace or remove it when editing.",
                ],
                [
                  "Guest visibility",
                  "Uncheck the box to keep the wish in your dashboard and hide it from guests.",
                ],
              ]}
            />
          </InfoPopover>
        </div>
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
      <FormSubmitActions
        label={wish ? "Update wish" : "Add wish"}
        pending={pending}
        cancelHref={cancelHref}
      />
    </form>
  );
}
