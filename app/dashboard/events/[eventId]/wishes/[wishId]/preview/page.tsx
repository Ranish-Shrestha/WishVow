import { notFound } from "next/navigation";
import { z } from "zod";
import { WishDetail } from "@/components/wishlist/wish-detail";
import { requireHost } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { findEventMembership } from "@/lib/db/events";
import { listPreviewWishes } from "@/lib/db/guest-events";

export default async function WishPreview({
  params,
}: {
  params: Promise<{ eventId: string; wishId: string }>;
}) {
  const host = await requireHost();
  const { eventId, wishId } = await params;
  if (
    !z.uuid().safeParse(eventId).success ||
    !z.uuid().safeParse(wishId).success
  )
    notFound();
  const result = await findEventMembership(getDb(), host.id, eventId);
  if (!result || result.event.status === "archived") notFound();
  const [wish] = await listPreviewWishes(host.id, eventId, wishId);
  if (!wish) notFound();
  const { event } = result;
  const base = `/dashboard/events/${eventId}/wishes`;

  return (
    <WishDetail
      event={{
        ...event,
        type: event.eventType,
        date: event.eventDate,
        location: event.locationText,
      }}
      wish={wish}
      backPath={`${base}/preview`}
      photoPath={`${base}/${wishId}`}
    />
  );
}
