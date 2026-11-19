import { notFound } from "next/navigation";
import { GuestWishlist } from "@/components/wishlist/guest-wishlist";
import { PasscodeForm } from "@/components/wishlist/passcode-form";
import { getGuestEvent, listGuestWishes } from "@/lib/db/guest-events";
import { guestAccess } from "@/lib/security/event-access";

export default async function GuestEvent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const access = await guestAccess(slug);
  if (!access) notFound();
  if (!access.allowed) return <PasscodeForm slug={slug} />;

  const event = await getGuestEvent(access.gate);
  if (!event) notFound();
  const wishes = await listGuestWishes(access.gate);
  const path = "/e/" + slug;
  return (
    <GuestWishlist
      event={event}
      wishes={wishes}
      filters={await searchParams}
      path={path}
      wishPath={(id) => path + "/wishes/" + id}
    />
  );
}
