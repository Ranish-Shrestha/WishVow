import { notFound } from "next/navigation";
import { HostPageHeader } from "@/components/host/host-page-header";
import { GuestWishlist } from "@/components/wishlist/guest-wishlist";
import { requireHost } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { findEventMembership } from "@/lib/db/events";
import { listPreviewWishes } from "@/lib/db/guest-events";
import { eventIdSchema } from "@/lib/validation/events";

export default async function GuestPreview({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) notFound();
  const result = await findEventMembership(getDb(), host.id, eventId);
  if (!result || result.event.status === "archived") notFound();
  const wishes = await listPreviewWishes(host.id, eventId);
  const { event } = result;
  const base = `/dashboard/events/${eventId}/wishes`;

  return (
    <div className="space-y-6">
      <HostPageHeader
        title="Private host preview"
        back={{
          href: `/dashboard/events/${eventId}`,
          label: "Back to event",
          text: event.title,
        }}
        preview
      />
      <GuestWishlist
        event={{
          ...event,
          type: event.eventType,
          date: event.eventDate,
          location: event.locationText,
        }}
        wishes={wishes}
        filters={await searchParams}
        path={`${base}/preview`}
        wishPath={(id) => `${base}/${id}/preview`}
        photoPath={(id) => `${base}/${id}`}
      />
    </div>
  );
}
