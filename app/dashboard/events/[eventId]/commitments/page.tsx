import Link from "next/link";
import { HostPageHeader } from "@/components/host/host-page-header";
import { notFound } from "next/navigation";
import { RevealGiver } from "@/components/host/reveal-giver";
import { CommitmentControls } from "@/components/host/commitment-controls";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { requireHost } from "@/lib/auth";
import { commitmentPageSize } from "@/lib/db/host-commitments";
import { getCommitmentDashboard } from "@/lib/services/host-commitments";
import {
  commitmentStatusLabel,
  fulfilmentOptions,
} from "@/lib/services/host-commitment-rules";
import { eventDate } from "@/lib/services/guest-wishes";
import { amountInput, displayMoney } from "@/lib/utils/money";
import {
  commitmentFilters,
  commitmentStatuses,
} from "@/lib/validation/host-commitments";
import { eventIdSchema } from "@/lib/validation/events";

export const metadata = { title: "Commitments" };
const kindLabels = [
  ["reservation", "Reservations"],
  ["pledge", "Pledges"],
  ["service_promise", "Promises"],
] as const;

export default async function CommitmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) notFound();
  const filters = commitmentFilters.parse(await searchParams);
  const result = await getCommitmentDashboard(host.id, eventId, filters);
  if (!result) notFound();

  const { event, role, rows, metrics, wishes } = result;
  const active = metrics.filter(
    (row) => row.status === "active" || row.status === "purchased",
  );
  const count = (status: string) =>
    metrics
      .filter((row) => row.status === status)
      .reduce((sum, row) => sum + row.count, 0);
  const cards = [
    ["Active commitments", active.reduce((sum, row) => sum + row.count, 0)],
    ["Fulfilled", count("fulfilled")],
    ["Awaiting verification", count("pending_verification")],
    ["Cancelled", count("cancelled")],
    ["Expired", count("expired")],
  ] as const;
  const funds = new Map<string, { pledged: number; received: number }>();
  for (const entry of metrics) {
    if (
      !entry.currency ||
      entry.kind !== "pledge" ||
      !["active", "fulfilled", "purchased"].includes(entry.status)
    )
      continue;
    const running = funds.get(entry.currency) ?? { pledged: 0, received: 0 };
    funds.set(entry.currency, {
      pledged: running.pledged + entry.pledged,
      received: running.received + entry.received,
    });
  }

  const eventPath = `/dashboard/events/${eventId}`;
  const path = `${eventPath}/commitments`;
  const editable = event.status !== "archived";
  const selectedWish = wishes.find(({ id }) => id === filters.wish);
  const hasFilters = Boolean(
    filters.wish || filters.status || filters.kind || filters.page > 1,
  );
  const pageLink = (page: number) => {
    const query = new URLSearchParams({ page: String(page) });
    if (filters.status) query.set("status", filters.status);
    if (filters.kind) query.set("kind", filters.kind);
    if (filters.wish) query.set("wish", filters.wish);
    return `${path}?${query}`;
  };
  const date = new Intl.DateTimeFormat(event.locale, {
    dateStyle: "medium",
    timeZone: event.timezone,
  });

  return (
    <section className="space-y-6">
      <HostPageHeader
        title="Commitments"
        back={{ href: eventPath, label: "Back to event", text: event.title }}
      />
      {event.surpriseMode && (
        <p className="rounded-lg bg-muted p-4 text-sm">
          Surprise mode hides guests’ names, email addresses, and messages until
          their gift is fulfilled.
        </p>
      )}
      {!editable && (
        <p className="rounded-lg bg-muted p-4 text-sm">
          This event is archived. You can review its commitments.
        </p>
      )}
      {selectedWish && (
        <p className="break-words text-sm font-semibold text-muted-foreground">
          Summary for {selectedWish.title}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {!!funds.size && (
        <section className="panel space-y-3">
          <h2 className="text-2xl">Group funds</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {Array.from(funds, ([currency, totals]) => (
              <div key={currency} className="space-y-1 rounded-lg bg-muted p-4">
                <dt className="font-semibold">{currency}</dt>
                <dd>
                  {displayMoney(totals.pledged, currency, event.locale)} pledged
                </dd>
                <dd>
                  {displayMoney(totals.received, currency, event.locale)}{" "}
                  host-reported received
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <form
        method="get"
        action={path}
        className="panel grid gap-4 sm:grid-cols-3"
        aria-label="Filter commitments"
      >
        <Field id="wish" label="Wish">
          <select
            className="control"
            name="wish"
            defaultValue={filters.wish ?? ""}
          >
            <option value="">All wishes</option>
            {wishes.map((wish) => (
              <option key={wish.id} value={wish.id}>
                {wish.title}
              </option>
            ))}
          </select>
        </Field>
        <Field id="status" label="Status">
          <select
            className="control"
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">All statuses</option>
            {commitmentStatuses.map((status) => (
              <option key={status} value={status}>
                {commitmentStatusLabel(status)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="kind" label="Kind">
          <select
            className="control"
            name="kind"
            defaultValue={filters.kind ?? ""}
          >
            <option value="">All kinds</option>
            {kindLabels.map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <Button type="submit">Apply filters</Button>
          {(filters.wish || filters.status || filters.kind) && (
            <Button asChild variant="outline">
              <Link href={path}>Clear filters</Link>
            </Button>
          )}
        </div>
      </form>
      {!rows.length && (
        <div className="panel">
          <h2 className="text-2xl">
            {hasFilters ? "No matching commitments" : "No commitments yet"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {hasFilters
              ? "Try changing the filters."
              : "Responses will appear here when guests request a reservation, pledge, or promise."}
          </p>
        </div>
      )}
      <ul className="space-y-4">
        {rows.slice(0, commitmentPageSize).map((row) => {
          const options = editable
            ? fulfilmentOptions(row.kind, row.status, row.receivedMinor ?? 0)
            : [];
          const receipt =
            editable &&
            row.kind === "pledge" &&
            row.status === "active" &&
            row.currency
              ? {
                  currency: row.currency,
                  value: amountInput(row.receivedMinor ?? 0, row.currency),
                }
              : undefined;
          return (
            <li key={row.id} className="panel space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h2 className="break-words text-2xl">{row.wishTitle}</h2>
                  <p className="font-semibold text-primary">
                    {commitmentStatusLabel(row.status, row.kind)}
                  </p>
                </div>
                <time
                  className="text-sm text-muted-foreground"
                  dateTime={row.createdAt.toISOString()}
                >
                  {date.format(row.createdAt)}
                </time>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="break-words font-semibold">
                    {row.name || "Guest details hidden"}
                  </p>
                  {row.email && (
                    <p className="break-all text-muted-foreground">
                      {row.email}
                    </p>
                  )}
                  {row.message && (
                    <p className="break-words whitespace-pre-wrap">
                      {row.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  {row.amountMinor && row.currency && (
                    <p>
                      {displayMoney(
                        row.amountMinor,
                        row.currency,
                        event.locale,
                      )}{" "}
                      commitment
                    </p>
                  )}
                  {row.receivedMinor && row.currency && (
                    <p>
                      {displayMoney(
                        row.receivedMinor,
                        row.currency,
                        event.locale,
                      )}{" "}
                      host-reported received
                    </p>
                  )}
                  {row.quantity && <p>Quantity {row.quantity}</p>}
                  {row.expectedDate && (
                    <p>
                      Expected fulfilment{" "}
                      {eventDate(row.expectedDate, event.locale)}
                    </p>
                  )}
                </div>
              </div>
              {row.hostNote && (
                <p className="break-words whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                  <strong>Host note</strong>
                  <br />
                  {row.hostNote}
                </p>
              )}
              {editable &&
                role === "owner" &&
                event.surpriseMode &&
                ["active", "purchased", "cancelled"].includes(row.status) && (
                  <RevealGiver eventId={event.id} id={row.id} />
                )}
              {(options.length > 0 || receipt) && (
                <CommitmentControls
                  eventId={event.id}
                  id={row.id}
                  options={options}
                  note={row.hostNote}
                  receipt={receipt}
                />
              )}
            </li>
          );
        })}
      </ul>
      {(filters.page > 1 || rows.length > commitmentPageSize) && (
        <nav
          aria-label="Commitment pages"
          className="flex flex-wrap items-center gap-3"
        >
          {filters.page > 1 && (
            <Button asChild variant="outline">
              <Link href={pageLink(filters.page - 1)}>Previous page</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {filters.page}
          </span>
          {rows.length > commitmentPageSize && (
            <Button asChild variant="outline">
              <Link href={pageLink(filters.page + 1)}>Next page</Link>
            </Button>
          )}
        </nav>
      )}
      <Link
        className="text-sm font-semibold text-primary underline"
        href={`${eventPath}/wishes`}
      >
        View capacity by wish
      </Link>
    </section>
  );
}
