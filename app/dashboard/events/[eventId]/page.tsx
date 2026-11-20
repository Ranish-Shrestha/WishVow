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
          <>
            <p className="text-sm font-semibold text-primary capitalize">
              {event.status} · {privacy}
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
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/dashboard/events/${event.id}/wishes`}>
                Manage wishlist
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={"/dashboard/events/" + event.id + "/invitations"}>
                Invitations &amp; RSVPs
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={"/dashboard/events/" + event.id + "/commitments"}>
                Commitments
              </Link>
            </Button>
            {!archived && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/events/${event.id}/edit`}>
                  Edit event
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="panel space-y-4">
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
        <aside className="space-y-5">
          <section className="panel space-y-4">
            <h2 className="text-2xl">Publishing & sharing</h2>
            {event.status === "published" && (
              <>
                <p className="text-sm text-muted-foreground">
                  This link opens the guest wishlist.
                </p>
                <ShareLink
                  url={
                    new URL(`/e/${event.slug}`, getAuthConfig().APP_URL).href
                  }
                />
              </>
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
                <Link
                  href={"/dashboard/events/" + event.id + "/wishes/preview"}
                >
                  Preview guest wishlist
                </Link>
              </Button>
            )}
            {event.status !== "archived" && role === "owner" && (
              <LifecycleControls eventId={event.id} status={event.status} />
            )}
          </section>
          {event.story && (
            <section className="panel space-y-3">
              <h2 className="text-2xl">Event story</h2>
              <p className="break-words whitespace-pre-wrap text-muted-foreground">
                {event.story}
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
