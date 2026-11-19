import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestRsvp } from "@/components/invitation/guest-rsvp";
import { Button } from "@/components/ui/button";
import { invitationPath } from "@/lib/security/invitation-tokens";
import {
  invitationDate,
  invitationInk,
} from "@/lib/services/invitation-design";
import { invitationForGuest } from "@/lib/services/invitations";
import { invitationTokenSchema } from "@/lib/validation/invitations";

export default async function GuestInvitation({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!invitationTokenSchema.safeParse(token).success) notFound();
  const result = await invitationForGuest(token);
  if (!result) notFound();
  const { card, event, invitation } = result;
  const modern = card.template === "modern";
  const garden = card.template === "garden";

  return (
    <div className="shell grid max-w-5xl items-start gap-6 py-8 sm:py-14 lg:grid-cols-2">
      <header
        className={`overflow-hidden border-2 p-6 sm:p-9 ${modern ? "rounded-lg border-t-12 text-left" : garden ? "rounded-t-[9rem] rounded-b-2xl pt-16 text-center" : "rounded-2xl text-center"}`}
        style={{
          backgroundColor: card.backgroundColor,
          borderColor: card.accentColor,
          color: invitationInk(card.backgroundColor),
        }}
      >
        {card.imageKey && (
          <Image
            src={invitationPath(token) + "/photo"}
            alt=""
            width={800}
            height={400}
            unoptimized
            loading="eager"
            className="mb-6 aspect-2/1 w-full rounded-lg object-cover"
          />
        )}
        <p className="text-xs font-semibold tracking-widest uppercase">
          You are invited
        </p>
        <h1 className="mt-3 break-words text-4xl leading-tight sm:text-5xl">
          {card.names}
        </h1>
        <div
          className={`my-5 h-0.5 w-12 ${modern ? "" : "mx-auto"}`}
          style={{ backgroundColor: card.accentColor }}
        />
        <p className="text-lg font-semibold">
          {invitationDate(card.invitationDate, event.locale)}
        </p>
        <p className="mt-1 break-words">{card.venue}</p>
        <p className="mt-4 break-words text-sm">For {invitation.label}</p>
      </header>
      <section className="panel space-y-5">
        <h2 className="text-3xl">RSVP</h2>
        <GuestRsvp
          token={token}
          maxParty={invitation.maxParty}
          reply={invitation.status}
          count={invitation.partySize}
          message={invitation.message}
        />
        <Button asChild variant="outline">
          <Link href={`/e/${event.slug}`} prefetch={false}>
            View the wishlist
          </Link>
        </Button>
      </section>
    </div>
  );
}
