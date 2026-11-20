import Link from "next/link";
import { HostPageHeader } from "@/components/host/host-page-header";
import { notFound } from "next/navigation";
import { LifecycleControls } from "@/components/event/lifecycle-controls";
import { ParticipantForm } from "@/components/event/participant-form";
import { ShareLink } from "@/components/event/share-link";
import { Button } from "@/components/ui/button";
import { getAuthConfig, requireHost } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { eventTypeLabels } from "@/lib/event-types";
import { eventIdSchema } from "@/lib/validation/events";

const eventLinks = [
  ["wishes", "Manage wishlist"],
  ["invitations", "Invitations & RSVPs"],
  ["commitments", "Commitments"],
  ["edit", "Edit event"],
] as const;

export default async function EventOverview({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) notFound();
  const result = await getEvent(host.id, eventId);
  if (!result) notFound();
  const { event, role, participants } = result;
  const eventPath = `/dashboard/events/${event.id}`;
  const archived = event.status === "archived";
  const privacy =
    event.privacy === "passcode" ? "Passcode protected" : "Unlisted link";

  return (
    <div className="space-y-6">
      <HostPageHeader
        title={event.title}
        back={{
          href: "/dashboard",
          label: "Back to my events",
          text: "My events",
        }}
        description={
          <div className="space-y-2">
            <p className="inline-block rounded-full bg-muted px-3 py-1 text-sm font-semibold text-primary">
              <span className="capitalize">{event.status}</span>
              {` · ${privacy}`}
            </p>
            <p>
              {[
                eventTypeLabels[event.eventType],
                event.eventDate,
                event.locationText,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        }
      />
      <nav aria-label="Event management">
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {eventLinks
            .filter(([path]) => !archived || path !== "edit")
            .map(([path, label]) => (
              <li key={path} className="min-w-0">
                <Link
                  href={`${eventPath}/${path}`}
                  className="flex h-full min-h-14 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-muted sm:px-4"
                >
                  <span className="wrap-anywhere">{label}</span>
                  <span aria-hidden="true" className="shrink-0">
                    →
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="panel min-w-0 space-y-3 p-4 sm:p-5">
          <h2 className="text-2xl">Publishing & sharing</h2>
          {event.status === "published" && (
            <ShareLink
              url={new URL(`/e/${event.slug}`, getAuthConfig().APP_URL).href}
            />
          )}
          {event.status === "draft" && (
            <p className="text-sm text-muted-foreground">
              Add at least one visible wish, then publish to open the wishlist
              to guests.
            </p>
          )}
          {archived && (
            <p className="text-sm text-muted-foreground">
              This event is archived and its share link is inactive.
            </p>
          )}
          {!archived && (
            <Button variant="outline" asChild>
              <Link href={`${eventPath}/wishes/preview`}>
                Preview guest wishlist
              </Link>
            </Button>
          )}
          {event.status !== "archived" && role === "owner" && (
            <div className="border-t border-border pt-3">
              <LifecycleControls eventId={event.id} status={event.status} />
            </div>
          )}
        </section>
        <section className="panel min-w-0 space-y-3 p-4 sm:p-5">
          <h2 className="text-2xl">Wishlist owners</h2>
          <p className="rounded-lg bg-muted p-3 text-sm">
            <strong>Shared</strong> · For everyone on the event
          </p>
          {participants.length > 0 && (
            <ul aria-label="Participants" className="divide-y divide-border">
              {participants.map((participant) => (
                <li key={participant.id} className="py-1">
                  {archived ? (
                    <div className="px-2 py-2 wrap-anywhere">
                      <p className="font-semibold">{participant.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {participant.roleLabel}
                      </p>
                    </div>
                  ) : (
                    <ParticipantForm
                      eventId={event.id}
                      participant={participant}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {!archived && (
            <div className="border-t border-border pt-2">
              <ParticipantForm eventId={event.id} />
            </div>
          )}
        </section>
      </div>
      {event.story && (
        <section className="panel space-y-3 p-4 sm:p-5">
          <h2 className="text-2xl">Event story</h2>
          <p className="max-w-prose wrap-anywhere whitespace-pre-wrap text-muted-foreground">
            {event.story}
          </p>
        </section>
      )}
    </div>
  );
}
