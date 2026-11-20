import Link from "next/link";
import { HostPageHeader } from "@/components/host/host-page-header";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WishControls } from "@/components/wishlist/wish-controls";
import { requireHost } from "@/lib/auth";
import { eventTotals } from "@/lib/db/commitments";
import { displayMoney } from "@/lib/utils/money";
import { getDb } from "@/lib/db";
import { findEventMembership } from "@/lib/db/events";
import { listEventWishes } from "@/lib/db/wishes";
import { eventIdSchema } from "@/lib/validation/events";
import { wishTypes } from "@/lib/validation/wishes";

export const metadata = { title: "Manage wishlist" };

export default async function HostWishlist({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) notFound();
  const db = getDb();
  const access = await findEventMembership(db, host.id, eventId);
  if (!access) notFound();
  const [all, usage] = await Promise.all([
    listEventWishes(db, eventId),
    eventTotals(eventId),
  ]);
  const totals = new Map(usage.map((value) => [value.wishId, value]));
  const active = all.filter(({ wish }) => wish.archivedAt === null);
  const archived = all.filter(({ wish }) => wish.archivedAt !== null);
  const base = `/dashboard/events/${eventId}`;
  const editable = access.event.status !== "archived";

  return (
    <section className="space-y-6">
      <HostPageHeader
        title="Manage wishlist"
        back={{ href: base, label: "Back to event", text: access.event.title }}
        actions={
          editable && (
            <Button asChild>
              <Link href={`${base}/wishes/new`}>New wish</Link>
            </Button>
          )
        }
      />
      {!active.length && (
        <p className="panel text-muted-foreground">
          There are no active wishes yet.
        </p>
      )}
      <ul className="space-y-3">
        {active.map(({ wish, owner }, index) => (
          <li key={wish.id} className="panel space-y-3">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-2xl">{wish.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[
                    owner ?? "Shared",
                    wishTypes.find(([value]) => value === wish.type)?.[1],
                    wish.isVisible ? "Visible" : "Hidden",
                  ].join(" · ")}
                </p>
                {wish.targetAmountMinor !== null && wish.currency && (
                  <p className="text-sm text-muted-foreground">
                    {displayMoney(
                      Math.max(
                        0,
                        wish.targetAmountMinor -
                          (totals.get(wish.id)?.amount ?? 0),
                      ),
                      wish.currency,
                      access.event.locale,
                    )}{" "}
                    remaining to pledge
                  </p>
                )}
                {wish.quantityTotal !== null && (
                  <p className="text-sm text-muted-foreground">
                    {Math.max(
                      0,
                      wish.quantityTotal - (totals.get(wish.id)?.quantity ?? 0),
                    )}{" "}
                    of {wish.quantityTotal} available
                  </p>
                )}
              </div>
              {!!totals.get(wish.id)?.count && (
                <p className="mt-1 text-sm font-semibold text-primary">
                  {wish.currency && wish.type === "group_fund"
                    ? displayMoney(
                        totals.get(wish.id)!.amount,
                        wish.currency,
                        access.event.locale,
                      ) + " pledged"
                    : totals.get(wish.id)!.quantity +
                      (wish.type === "service" || wish.type === "open_wish"
                        ? " promised"
                        : " reserved")}
                </p>
              )}
              {editable && (
                <Button asChild variant="outline">
                  <Link href={`${base}/wishes/${wish.id}/edit`}>Edit wish</Link>
                </Button>
              )}
            </div>
            {editable && (
              <WishControls
                eventId={eventId}
                wishId={wish.id}
                canMoveUp={index > 0}
                canMoveDown={index < active.length - 1}
              />
            )}
          </li>
        ))}
      </ul>
      {!!archived.length && (
        <section className="panel space-y-3">
          <h2 className="text-2xl">Archived wishes</h2>
          <ul className="space-y-2 text-sm">
            {archived.map(({ wish }) => (
              <li key={wish.id} className="break-words">
                {wish.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
