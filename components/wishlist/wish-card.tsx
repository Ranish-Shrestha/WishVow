import { WishAvailability } from "@/components/guest/availability";
import Image from "next/image";
import Link from "next/link";
import type { GuestWish } from "@/lib/db/guest-events";
import { getImageUrl } from "@/lib/storage";
import { displayMoney } from "@/lib/utils/money";
import { wishCategories, wishTypes } from "@/lib/validation/wishes";

export function WishPhoto({
  src,
  detail = false,
}: {
  src: string;
  detail?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-muted ${detail ? "aspect-[5/4] rounded-2xl" : "aspect-[4/3]"}`}
    >
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        className="object-cover"
        sizes={
          detail
            ? "(max-width: 800px) 100vw, 44vw"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        }
      />
    </div>
  );
}

export function WishTags({ wish }: { wish: GuestWish }) {
  const tags = [
    wishTypes.find(([value]) => value === wish.type)?.[1],
    wishCategories.find(([value]) => value === wish.category)?.[1],
    wish.priority === "favorite" ? "Favorite" : null,
  ];
  return (
    <p className="text-sm font-medium text-primary">
      {tags.filter(Boolean).join(" · ")}
    </p>
  );
}

export function WishAmounts({
  wish,
  locale,
}: {
  wish: GuestWish;
  locale: string;
}) {
  const currency = wish.currency;
  if (currency && wish.suggested)
    return (
      <p className="text-sm font-semibold">
        Estimated {displayMoney(wish.suggested, currency, locale)} per item
      </p>
    );
  return null;
}

export function WishCard({
  wish,
  wishPath,
  photoPath,
  locale,
}: {
  wish: GuestWish;
  wishPath: string;
  photoPath?: string;
  locale: string;
}) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {wish.hasImage && <WishPhoto src={getImageUrl(photoPath ?? wishPath)} />}
      <div className="flex flex-1 flex-col items-start gap-3 p-5">
        <WishTags wish={wish} />
        <h4 className="w-full break-words font-serif text-2xl">
          <Link
            href={wishPath}
            prefetch={false}
            className="text-foreground hover:text-primary hover:underline"
          >
            {wish.title}
          </Link>
        </h4>
        {wish.description && (
          <p className="line-clamp-3 w-full break-words text-sm leading-relaxed text-muted-foreground">
            {wish.description}
          </p>
        )}
        <WishAmounts wish={wish} locale={locale} />
        <WishAvailability wish={wish} locale={locale} />
      </div>
    </article>
  );
}
