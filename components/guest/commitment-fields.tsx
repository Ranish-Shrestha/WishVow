import { Field } from "@/components/ui/field";
import type { FormState } from "@/components/ui/form-feedback";
import type { WishType } from "@/lib/validation/wishes";

export type EditableTerms = {
  quantity?: number | null;
  amount?: string;
  message?: string | null;
  expectedFulfilmentDate?: string | null;
  allowPublicName?: boolean;
};

export function CommitmentFields({
  type,
  currency,
  state,
  defaults,
  maxQuantity,
}: {
  type: WishType;
  currency: string | null;
  state: FormState;
  defaults?: EditableTerms;
  maxQuantity?: number | null;
}) {
  const promise = type === "service" || type === "open_wish";
  return (
    <>
      {type === "group_fund" ? (
        <Field id="amount" label={`Pledge amount (${currency})`} state={state}>
          <input
            className="control"
            name="amount"
            inputMode="decimal"
            maxLength={16}
            required
            defaultValue={defaults?.amount}
          />
        </Field>
      ) : (
        <Field
          id="quantity"
          label={promise ? "Number of slots" : "Quantity"}
          state={state}
        >
          <input
            className="control"
            name="quantity"
            type="number"
            min={1}
            max={maxQuantity ?? 999}
            required
            defaultValue={defaults?.quantity ?? 1}
          />
        </Field>
      )}
      {promise && (
        <Field
          id="expectedFulfilmentDate"
          label="Expected fulfilment date (optional)"
          state={state}
        >
          <input
            className="control"
            name="expectedFulfilmentDate"
            type="date"
            defaultValue={defaults?.expectedFulfilmentDate ?? ""}
          />
        </Field>
      )}
      <Field id="message" label="Message for the host (optional)" state={state}>
        <textarea
          className="control"
          name="message"
          maxLength={1000}
          rows={3}
          defaultValue={defaults?.message ?? ""}
        />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 accent-primary"
          name="allowPublicName"
          defaultChecked={defaults?.allowPublicName}
        />
        Allow my name to appear if the host enables guest names
      </label>
    </>
  );
}
