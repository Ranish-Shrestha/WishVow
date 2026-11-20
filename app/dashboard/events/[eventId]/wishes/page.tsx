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
      <ul className="grid gap-3">
        {active.map(({ wish, owner }, index) => (
          <li key={wish.id} className="panel grid gap-3 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="wrap-anywhere text-xl sm:text-2xl">
                  {wish.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <p className="wrap-anywhere">
                    {owner ?? "Shared"} ·{" "}
                    {wishTypes.find(([value]) => value === wish.type)?.[1]}
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {wish.isVisible ? "Visible" : "Hidden"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm empty:hidden">
                  {wish.targetAmountMinor !== null && wish.currency && (
                    <p className="text-muted-foreground">
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
                    <p className="text-muted-foreground">
                      {Math.max(
                        0,
                        wish.quantityTotal -
                          (totals.get(wish.id)?.quantity ?? 0),
                      )}{" "}
                      of {wish.quantityTotal} available
                    </p>
                  )}
                  {!!totals.get(wish.id)?.count && (
                    <p className="font-semibold text-primary">
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
                </div>
              </div>
              {editable && (
                <Button
                  asChild
                  variant="outline"
                  className="shrink-0 whitespace-nowrap px-3 sm:px-4"
                >
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
