import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="shell space-y-4 py-16">
      <h1 className="text-4xl">Page unavailable</h1>
      <p>Check the address or return to your dashboard.</p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </section>
  );
}
