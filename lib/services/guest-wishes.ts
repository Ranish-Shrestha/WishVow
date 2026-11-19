import { remainingCapacity } from "./commitment-rules";
import { z } from "zod";
import type { GuestWish } from "@/lib/db/guest-events";
import { wishCategoryValues, wishTypeValues } from "@/lib/validation/wishes";

export function availableForWish(wish: GuestWish) {
  return remainingCapacity(
    {
      type: wish.type,
      quantityTotal: wish.quantity,
      targetAmountMinor: wish.target,
      minimumAmountMinor: wish.minimum,
      currency: wish.currency,
    },
    wish.totals,
  );
}

const filters = z.object({
  availability: z.enum(["available", "full"]).optional().catch(undefined),
  q: z.string().trim().max(120).catch(""),
  owner: z
    .union([z.literal("shared"), z.uuid()])
    .optional()
    .catch(undefined),
  category: z.enum(wishCategoryValues).optional().catch(undefined),
  type: z.enum(wishTypeValues).optional().catch(undefined),
});

export function filterWishes(
  wishes: GuestWish[],
  values: Record<string, unknown>,
  locale: string,
) {
  const query = filters.parse(values);
  const search = query.q.toLocaleLowerCase(locale);
  const owners = new Map<string, string>();
  const groups = new Map<string, GuestWish[]>();
  for (const wish of wishes) {
    const owner = wish.ownerId ?? "shared";
    if (wish.ownerId && wish.owner) owners.set(wish.ownerId, wish.owner);
    if (query.owner && owner !== query.owner) continue;
    if (query.category && wish.category !== query.category) continue;
    if (query.type && wish.type !== query.type) continue;
    if (
      query.availability &&
      (availableForWish(wish) === 0 ? "full" : "available") !==
        query.availability
    )
      continue;
    if (
      search &&
      ![wish.title, wish.description].some((value) =>
        value?.toLocaleLowerCase(locale).includes(search),
      )
    )
      continue;
    const group = groups.get(owner);
    if (group) group.push(wish);
    else groups.set(owner, [wish]);
  }
  return { query, owners, groups };
}

export function eventDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
