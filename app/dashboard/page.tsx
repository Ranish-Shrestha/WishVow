import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireHost } from "@/lib/auth";
import { listEvents } from "@/lib/db/events";

export default async function Dashboard() {
  const host = await requireHost();
  const events = await listEvents(host.id);
  return (
    <section className="space-y-6 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">My events</h1>
        <Button asChild>
          <Link href="/dashboard/events/new">New event</Link>
        </Button>
      </div>
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
            <li key={event.id} className="panel">
              <p className="text-sm font-semibold text-primary capitalize">
                {event.status}
              </p>
              <h2 className="mt-2 text-2xl break-words">
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="rounded-sm hover:text-primary hover:underline"
                >
                  {event.title}
                </Link>
              </h2>
              {event.eventDate && (
                <time
                  dateTime={event.eventDate}
                  className="mt-2 block text-sm text-muted-foreground"
                >
                  {event.eventDate}
                </time>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
