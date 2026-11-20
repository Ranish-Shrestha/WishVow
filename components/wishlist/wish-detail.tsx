import type { ReactNode } from "react";
import { WishAvailability } from "@/components/guest/availability";
import {
  WishAmounts,
  WishPhoto,
  WishTags,
} from "@/components/wishlist/wish-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { eventDate } from "@/lib/services/guest-wishes";
import { getImageUrl } from "@/lib/storage";
import { displayMoney } from "@/lib/utils/money";
import type { GuestWish, getGuestEvent } from "@/lib/db/guest-events";

export function WishDetail({
  event,
  wish,
  backPath,
  photoPath,
  children,
}: {
  event: NonNullable<Awaited<ReturnType<typeof getGuestEvent>>>;
  wish: GuestWish;
  backPath?: string;
  photoPath: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={backPath ? "shell space-y-6 py-10 sm:py-14" : undefined}
    >
      {backPath && (
        <Link
          href={backPath + "#wishlist"}
          className="text-sm font-semibold text-primary underline"
        >
          Back to wishlist
        </Link>
      )}
      <article
        className={`grid items-start gap-7 ${wish.hasImage ? "md:grid-cols-2" : "max-w-3xl"}`}
      >
        {wish.hasImage && <WishPhoto src={getImageUrl(photoPath)} detail />}
        <div className="panel min-w-0 space-y-5">
          <WishTags wish={wish} />
          <h1 className="break-words text-4xl sm:text-5xl">{wish.title}</h1>
          <p className="break-words text-muted-foreground">
            {wish.owner ?? "Shared"} · {event.title}
          </p>
          {wish.description && (
            <p className="break-words whitespace-pre-wrap leading-relaxed">
              {wish.description}
            </p>
          )}
          <div className="space-y-2">
            <WishAmounts wish={wish} locale={event.locale} />
            <WishAvailability wish={wish} locale={event.locale} />
            {wish.minimum && wish.currency && (
              <p className="text-sm">
                Minimum pledge{" "}
                {displayMoney(wish.minimum, wish.currency, event.locale)}
              </p>
            )}
            {wish.quantity !== null && (
              <p className="text-sm">
                {wish.type === "service"
                  ? "Helper slots"
                  : "Requested quantity"}{" "}
                {wish.quantity}
              </p>
            )}
            {wish.deadline && (
              <p className="text-sm">
                Requested by {eventDate(wish.deadline, event.locale)}
              </p>
            )}
          </div>
          {wish.notes && (
            <section className="space-y-2">
              <h2 className="text-xl">Guest instructions</h2>
              <p className="break-words whitespace-pre-wrap leading-relaxed">
                {wish.notes}
              </p>
            </section>
          )}
          {wish.externalUrl && (
            <Button variant="outline" asChild>
              <a href={wish.externalUrl} target="_blank" rel="noreferrer">
                Visit product or provider website
              </a>
            </Button>
          )}
          {children}
        </div>
      </article>
    </section>
  );
}
