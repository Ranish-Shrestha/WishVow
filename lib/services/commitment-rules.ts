import { parseMinor, type WishType } from "@/lib/validation/wishes";
import type { TermsInput } from "@/lib/validation/commitments";

type WishTerms = {
  type: WishType;
  quantityTotal: number | null;
  targetAmountMinor: number | null;
  minimumAmountMinor: number | null;
  currency: string | null;
};

export type Totals = { quantity: number; amount: number; count: number };
export const emptyTotals: Totals = { quantity: 0, amount: 0, count: 0 };

export class CommitmentError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export function remainingCapacity(wish: WishTerms, totals: Totals) {
  const limit =
    wish.type === "group_fund" ? wish.targetAmountMinor : wish.quantityTotal;
  const used = wish.type === "group_fund" ? totals.amount : totals.quantity;
  return limit === null ? null : Math.max(0, limit - used);
}

export function commitmentKindFor(
  type: WishType,
): "reservation" | "pledge" | "service_promise" {
  if (type === "group_fund") return "pledge";
  if (type === "service" || type === "open_wish") return "service_promise";
  return "reservation";
}

export function readWishTerms(wish: WishTerms, input: TermsInput) {
  const kind = commitmentKindFor(wish.type);
  const currency = kind === "pledge" ? wish.currency : null;
  const quantity = kind === "pledge" ? null : Number(input.quantity || "1");
  const amountMinor = currency ? parseMinor(input.amount, currency) : null;
  if (
    kind === "pledge" &&
    (!amountMinor || amountMinor < (wish.minimumAmountMinor ?? 1))
  ) {
    throw new CommitmentError(
      "Enter a valid amount that meets the minimum pledge.",
      "amount",
    );
  }
  return {
    kind,
    currency,
    quantity,
    amountMinor,
    expectedFulfilmentDate:
      kind === "service_promise" ? input.expectedFulfilmentDate : null,
    message: input.message,
    allowPublicName: input.allowPublicName,
  };
}

export function fitsCapacity(
  wish: WishTerms,
  terms: {
    kind: string;
    currency: string | null;
    quantity: number | null;
    amountMinor: number | null;
  },
  totals: Totals,
) {
  if (terms.kind !== commitmentKindFor(wish.type)) return false;
  if (
    terms.kind === "pledge" &&
    (terms.currency !== wish.currency ||
      (terms.amountMinor ?? 0) < (wish.minimumAmountMinor ?? 1))
  )
    return false;
  const remaining = remainingCapacity(wish, totals);
  return (
    remaining === null ||
    (terms.amountMinor ?? terms.quantity ?? 0) <= remaining
  );
}
