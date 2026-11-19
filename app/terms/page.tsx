export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <article className="shell max-w-3xl space-y-6 py-12">
      <h1 className="text-4xl">Terms of use</h1>
      <section className="space-y-2">
        <h2 className="text-2xl">Using WishVow</h2>
        <p>
          WishVow helps hosts organize event wishlists, invitations, and RSVPs.
          Share private links and passcodes only with the people they are for.
          Upload photos and other material you have permission to share.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-2xl">Gifts and pledges</h2>
        <p>
          A commitment records your intention to give or help. Arrange
          purchases, delivery, and any transfers directly with the host or
          seller. WishVow does not process payments or hold money.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-2xl">Changes to a commitment</h2>
        <p>
          Use your management link to change or cancel an eligible commitment.
          Contact the host if a gift has already been purchased or the host has
          recorded an amount received.
        </p>
      </section>
    </article>
  );
}
