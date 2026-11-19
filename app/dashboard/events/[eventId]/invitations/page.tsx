import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvitationDesignForm } from "@/components/invitation/design-form";
import {
  InvitationLinkControls,
  NewInvitationLink,
} from "@/components/invitation/link-forms";
import { ShareLink } from "@/components/event/share-link";
import { Button } from "@/components/ui/button";
import { getAuthConfig, requireHost } from "@/lib/auth";
import {
  invitationDashboard,
  shareableInvitation,
} from "@/lib/services/invitations";
import { eventIdSchema } from "@/lib/validation/events";
import { invitationPalette } from "@/lib/validation/invitations";

export const metadata = { title: "Invitations and RSVPs" };

export default async function InvitationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) notFound();
  const result = await invitationDashboard(host.id, eventId);
  if (!result) notFound();
  const { event, card, recipients } = result;
  const editable = event.status !== "archived";
  const published = event.status === "published";
  const eventPath = `/dashboard/events/${event.id}`;
  const base = `${eventPath}/invitations`;
  const active = recipients.filter((item) => !item.revokedAt);
  const metrics = [
    ["Awaiting reply", active.filter((item) => !item.status).length],
    [
      "Attending households",
      active.filter((item) => item.status === "attending").length,
    ],
    [
      "Not attending",
      active.filter((item) => item.status === "not_attending").length,
    ],
    [
      "Guests attending",
      active.reduce((sum, item) => sum + (item.partySize ?? 0), 0),
    ],
  ] as const;
  const auth = getAuthConfig();

  return (
    <div className="space-y-8 pt-8">
      <header className="space-y-3">
        <Link
          href={eventPath}
          className="text-sm font-semibold text-primary underline"
        >
          Back to event
        </Link>
        <h1 className="text-4xl sm:text-5xl">Invitations &amp; RSVPs</h1>
        <p className="break-words text-muted-foreground">{event.title}</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {editable && (
          <section className="panel space-y-5">
            <h2 className="text-2xl">Invitation design</h2>
            <InvitationDesignForm
              eventId={event.id}
              hasPhoto={!!card?.imageKey}
              values={
                card ?? {
                  ...invitationPalette,
                  template: "classic",
                  names: event.title.slice(0, 88),
                  invitationDate: event.eventDate ?? "",
                  venue: event.locationText?.slice(0, 120) ?? "",
                }
              }
            />
          </section>
        )}
        {card && (
          <section className="panel space-y-4">
            <h2 className="text-2xl">Saved preview</h2>
            <Image
              alt="Preview of the saved invitation design"
              src={`${base}/preview?v=${card.updatedAt.getTime()}`}
              width={1080}
              height={1500}
              unoptimized
              className="mx-auto h-auto w-full max-w-sm rounded-lg border border-border"
            />
          </section>
        )}
      </div>

      <section className="panel space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Guest list &amp; RSVPs</h2>
          {card && (
            <Button asChild variant="outline">
              <a href={`${base}/export`}>Download RSVP CSV</a>
            </Button>
          )}
        </header>
        {card ? (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map(([label, value]) => (
                <div className="rounded-lg bg-muted p-3" key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {!published && (
              <p className="text-sm text-muted-foreground">
                {editable
                  ? "Publish the event before sharing links or downloading QR cards."
                  : "This event is archived. Its invitation links are closed."}
              </p>
            )}
            {editable && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create one private link per household. Anyone with that link
                  can view and update its RSVP. Your wishlist privacy settings
                  still apply on the wishlist.
                </p>
                <NewInvitationLink eventId={event.id} />
              </div>
            )}
            {recipients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No guest invitations yet.
              </p>
            )}
            <ul className="space-y-3">
              {recipients.map((item) => {
                const share = published
                  ? shareableInvitation(item, auth.AUTH_SECRET, auth.APP_URL)
                  : null;
                const status =
                  item.status === "attending"
                    ? `Attending · ${item.partySize} of ${item.maxParty}`
                    : item.status === "not_attending"
                      ? "Not attending"
                      : "Awaiting reply";
                return (
                  <li
                    className="space-y-3 rounded-xl border border-border p-4"
                    key={item.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="min-w-0 break-words font-semibold">
                        {item.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.revokedAt && "Revoked · "}
                        {status}
                      </p>
                    </div>
                    {item.message && (
                      <p className="break-words whitespace-pre-wrap text-sm">
                        {item.message}
                      </p>
                    )}
                    {share && (
                      <details className="space-y-4">
                        <summary className="cursor-pointer text-sm font-semibold text-primary">
                          Share or download
                        </summary>
                        <ShareLink
                          key={share}
                          label={`Private link for ${item.label}`}
                          url={share}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline">
                            <a href={`${base}/cards/${item.id}/png`}>
                              Download PNG
                            </a>
                          </Button>
                          <Button asChild variant="outline">
                            <a href={`${base}/cards/${item.id}/pdf`}>
                              Download PDF
                            </a>
                          </Button>
                        </div>
                      </details>
                    )}
                    {editable && !item.revokedAt && (
                      <InvitationLinkControls
                        eventId={event.id}
                        recipientId={item.id}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Save an invitation design to start creating guest links.
          </p>
        )}
      </section>
    </div>
  );
}
