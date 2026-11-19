import Link from "next/link";
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
    <section className="mx-auto max-w-3xl space-y-6 pt-8">
      <Link
        href={`/dashboard/events/${eventId}/wishes`}
        className="text-sm font-semibold text-primary underline"
      >
        Back to wishlist
      </Link>
      <h1 className="text-4xl sm:text-5xl">New wish</h1>
      <WishForm
        participants={result.participants}
        action={saveWishAction.bind(null, eventId, null)}
      />
    </section>
  );
}
