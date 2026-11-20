import { HostPageHeader } from "@/components/host/host-page-header";
import { notFound } from "next/navigation";
import { WishForm } from "@/components/wishlist/wish-form";
import { requireHost } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import { eventIdSchema } from "@/lib/validation/events";
import { saveWishAction } from "../../../../wish-actions";

export default async function NewWish({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) notFound();
  const result = await getEvent(host.id, eventId);
  if (!result || result.event.status === "archived") notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <HostPageHeader
        title="New Wish"
        ancestors={[
          { href: `/dashboard/events/${eventId}`, label: result.event.title },
        ]}
        back={{
          href: `/dashboard/events/${eventId}/wishes`,
          label: "Back to wishlist",
          text: "Wishlist",
        }}
      />
      <WishForm
        participants={result.participants}
        action={saveWishAction.bind(null, eventId, null)}
      />
    </section>
  );
}
