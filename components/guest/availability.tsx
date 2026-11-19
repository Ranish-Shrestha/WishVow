import type { GuestWish } from "@/lib/db/guest-events";
import { availableForWish } from "@/lib/services/guest-wishes";
import { displayMoney } from "@/lib/utils/money";

export function WishAvailability({
  wish,
  locale,
}: {
  wish: GuestWish;
  locale: string;
}) {
  const remaining = availableForWish(wish);
  if (wish.target && wish.currency) {
    return (
      <div className="w-full space-y-2">
        <p className="text-sm font-semibold">
          {displayMoney(wish.totals.amount, wish.currency, locale)} pledged of{" "}
          {displayMoney(wish.target, wish.currency, locale)} goal
        </p>
        <progress
          className="block h-2 w-full accent-primary"
          aria-label="Amount pledged toward goal"
          value={wish.totals.amount}
          max={wish.target}
        />
      </div>
    );
  }
  if (remaining === null)
    return (
      <p className="text-sm font-semibold text-primary">Open for promises</p>
    );
  return (
    <p className="text-sm font-semibold text-primary">
      {remaining ? `${remaining} available` : "Fully committed"}
    </p>
  );
}
