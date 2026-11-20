import Link from "next/link";
import { HostPageHeader } from "@/components/host/host-page-header";
import { Button } from "@/components/ui/button";
import { requireHost } from "@/lib/auth";
import { listEvents } from "@/lib/db/events";

export default async function Dashboard() {
  const host = await requireHost();
  const events = await listEvents(host.id);
  return (
    <section className="space-y-6">
      <HostPageHeader
        title="My events"
        actions={
          <Button asChild>
            <Link href="/dashboard/events/new">New event</Link>
          </Button>
        }
      />
      {events.length === 0 ? (
        <div className="panel">
          <h2 className="text-2xl">Create your first event</h2>
          <p className="mt-2 text-muted-foreground">
            Enter your event details, then add the people who’ll have their own
            wishlist section.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/events/${event.id}`}
                aria-labelledby={`event-title-${event.id}`}
                aria-describedby={
                  event.eventDate
                    ? `event-status-${event.id} event-date-${event.id}`
                    : `event-status-${event.id}`
                }
                className="panel group block h-full transition-colors hover:border-primary hover:bg-muted focus-visible:border-primary"
              >
                <p
                  id={`event-status-${event.id}`}
                  className="text-sm font-semibold text-primary capitalize"
                >
                  {event.status}
                </p>
                <h2
                  id={`event-title-${event.id}`}
                  className="mt-2 text-2xl break-words group-hover:text-primary"
                >
                  {event.title}
                </h2>
                {event.eventDate && (
                  <time
                    id={`event-date-${event.id}`}
                    dateTime={event.eventDate}
                    className="mt-2 block text-sm text-muted-foreground"
                  >
                    {event.eventDate}
                  </time>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
