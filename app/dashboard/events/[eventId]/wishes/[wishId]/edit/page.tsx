import { HostPageHeader } from "@/components/host/host-page-header";
import { notFound } from "next/navigation";
import { z } from "zod";
import { WishForm } from "@/components/wishlist/wish-form";
import { requireHost } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { getHostWish } from "@/lib/services/wishes";
import { getImageUrl } from "@/lib/storage";
import { saveWishAction } from "../../../../../wish-actions";

export default async function EditWish({
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
  const result = await getEvent(host.id, eventId);
  if (!result || result.event.status === "archived") notFound();
  const wish = await getHostWish(host.id, eventId, wishId);
  if (!wish || wish.archivedAt) notFound();
  const { imageKey, ...fields } = wish;
  const base = `/dashboard/events/${eventId}/wishes`;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <HostPageHeader
        title="Edit wish"
        ancestors={[
          { href: `/dashboard/events/${eventId}`, label: result.event.title },
        ]}
        back={{ href: base, label: "Back to wishlist", text: "Wishlist" }}
      />
      <WishForm
        participants={result.participants}
        wish={fields}
        cancelHref={base}
        action={saveWishAction.bind(null, eventId, wishId)}
        imageUrl={imageKey ? getImageUrl(`${base}/${wishId}`) : undefined}
      />
    </section>
  );
}
