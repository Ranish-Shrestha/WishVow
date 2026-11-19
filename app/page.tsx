import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="shell grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
      <div>
        <p className="mb-4 text-sm font-semibold tracking-wide text-primary">
          Wishlists for weddings, birthdays, and more
        </p>
        <h1 className="max-w-xl text-5xl leading-[1.03] tracking-tight sm:text-7xl">
          Make their wishes <em className="text-primary">come true.</em>
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          Create your event and give everyone a place on the wishlist, with a
          shared section for wishes you dream up together.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-up">Create your wishlist</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
      <figure className="rounded-t-[8rem] rounded-b-2xl border border-border bg-muted p-5 pt-14 sm:p-9 sm:pt-20">
        <div className="rounded-t-[6rem] rounded-b-xl border border-border bg-card px-5 py-8 text-center sm:px-9">
          <figcaption className="text-sm font-semibold text-primary">
            Example wishlist
          </figcaption>
          <p className="mt-2 font-serif text-4xl">Alex & Jules</p>
          <ul className="mt-6 divide-y divide-border border-t border-border text-left text-sm">
            <li className="flex justify-between gap-3 py-3">
              <span>Shared</span>
              <span className="text-muted-foreground">For both of you</span>
            </li>
            <li className="flex justify-between gap-3 py-3">
              <span>Alex</span>
              <span className="text-muted-foreground">Partner</span>
            </li>
            <li className="flex justify-between gap-3 pt-3">
              <span>Jules</span>
              <span className="text-muted-foreground">Partner</span>
            </li>
          </ul>
        </div>
      </figure>
    </section>
  );
}
