import { GuestFilters } from "@/components/wishlist/guest-filters";
import { WishCard } from "@/components/wishlist/wish-card";
import type { GuestWish, getGuestEvent } from "@/lib/db/guest-events";
import { eventTypeLabels } from "@/lib/event-types";
import { eventDate, filterWishes } from "@/lib/services/guest-wishes";

export function GuestWishlist({
  event,
  wishes,
  filters,
  path,
  wishPath,
  photoPath,
}: {
  event: NonNullable<Awaited<ReturnType<typeof getGuestEvent>>>;
  wishes: GuestWish[];
  filters: Record<string, unknown>;
  path: string;
  wishPath: (id: string) => string;
  photoPath?: (id: string) => string;
}) {
  const { query, owners, groups } = filterWishes(wishes, filters, event.locale);

  return (
    <div>
      <header className="border-b border-border bg-muted">
        <div className="shell space-y-4 py-12 sm:py-16">
          <p className="text-sm font-semibold text-primary">
            {eventTypeLabels[event.type]}
          </p>
          <h1 className="max-w-4xl break-words text-5xl leading-tight tracking-tight sm:text-7xl">
            {event.title}
          </h1>
          {(event.date || event.location) && (
            <p className="break-words text-muted-foreground">
              {[
                event.date && eventDate(event.date, event.locale),
                event.location,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {event.story && (
            <p className="max-w-2xl break-words whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {event.story}
            </p>
          )}
        </div>
      </header>
      <section className="shell space-y-6 py-10 sm:py-14" id="wishlist">
        <h2 className="text-4xl">Wishlist</h2>
        {wishes.length ? (
          <GuestFilters path={path} values={query} owners={owners} />
        ) : (
          <p className="panel text-muted-foreground">
            There are no wishes to see yet.
          </p>
        )}
        {!!wishes.length && !groups.size && (
          <p className="panel text-muted-foreground">
            No wishes match these filters.
          </p>
        )}
        {Array.from(groups, ([id, items]) => (
          <section key={id} className="space-y-4">
            <h3 className="break-words font-serif text-2xl">
              {id === "shared" ? "Shared wishes" : owners.get(id)}
            </h3>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((wish) => (
                <li key={wish.id} className="min-w-0">
                  <WishCard
                    wish={wish}
                    wishPath={wishPath(wish.id)}
                    photoPath={photoPath?.(wish.id)}
                    locale={event.locale}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </div>
  );
}
