import { z } from "zod";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  const contact = z.email().safeParse(process.env.PRIVACY_CONTACT_EMAIL);
  return (
    <article className="shell max-w-3xl space-y-6 py-12">
      <h1 className="text-4xl">Privacy</h1>
      <section className="space-y-2">
        <h2 className="text-2xl">Information you provide</h2>
        <p>
          Hosts provide an email address and a name to manage an account. Events
          and wishes can include names, dates, venues, descriptions, and photos.
          Guests provide a name and email to verify a commitment and may add a
          message. A private RSVP can include a household’s response, party
          size, and message.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-2xl">Who can see it</h2>
        <p>
          Authorized event hosts manage the event and its records. Anyone with
          an unlisted event link can see its published wishlist. A passcode can
          restrict that access. Each private invitation and management link
          grants access to the record it belongs to. Keep those links private. A
          giver’s name is shown to other guests only with the giver’s consent
          and the host’s visibility settings. Surprise mode delays disclosure
          until fulfilment.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-2xl">How WishVow uses the information</h2>
        <p>
          WishVow uses this information to deliver links, manage access, track
          commitments, and record RSVPs. The deployed service uses Vercel for
          hosting and image storage, Neon for its database, and Resend for email
          delivery. Sessions and private event access use cookies. WishVow uses
          rate limits to reduce abuse.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-2xl">Changes and privacy requests</h2>
        <p>
          Archiving an event closes guest access and keeps the host’s records.
          If you want to change or remove information, contact the event host
          {contact.success ? " or contact WishVow at " : "."}
          {contact.success && (
            <>
              <a
                className="break-all font-semibold text-primary underline"
                href={`mailto:${contact.data}`}
              >
                {contact.data}
              </a>
              .
            </>
          )}
        </p>
      </section>
    </article>
  );
}
