import { availableForWish } from "@/lib/services/guest-wishes";
import { CommitmentForm } from "@/components/guest/commitment-form";
import { WishDetail } from "@/components/wishlist/wish-detail";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PasscodeForm } from "@/components/wishlist/passcode-form";
import {
  getGuestEvent,
  getGuestWish,
  visibleGiverNames,
} from "@/lib/db/guest-events";
import { guestAccess } from "@/lib/security/event-access";

export default async function GuestWishDetail({
  params,
}: {
  params: Promise<{ slug: string; wishId: string }>;
}) {
  const { slug, wishId } = await params;
  if (!z.uuid().safeParse(wishId).success) notFound();
  const access = await guestAccess(slug);
  if (!access) notFound();
  if (!access.allowed) return <PasscodeForm slug={slug} wishId={wishId} />;
  const [event, wish] = await Promise.all([
    getGuestEvent(access.gate),
    getGuestWish(access.gate, wishId),
  ]);
  if (!event || !wish) notFound();
  const givers = await visibleGiverNames(access.gate, wishId);
  const path = "/e/" + slug;
  return (
    <WishDetail
      event={event}
      wish={wish}
      backPath={path}
      photoPath={path + "/wishes/" + wishId}
    >
      {!!givers.length && (
        <section className="space-y-2">
          <h2 className="text-xl">Givers</h2>
          <ul className="flex flex-wrap gap-2">
            {givers.map((name) => (
              <li
                key={name}
                className="max-w-full break-words rounded-full bg-muted px-3 py-1 text-sm"
              >
                {name}
              </li>
            ))}
          </ul>
        </section>
      )}
      <CommitmentForm
        slug={slug}
        wishId={wishId}
        type={wish.type}
        currency={wish.currency}
        remaining={availableForWish(wish)}
      />
    </WishDetail>
  );
}
