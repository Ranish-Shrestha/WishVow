import Link from "next/link";
import type { Metadata } from "next";
import { z } from "zod";
import { ResetPasswordForm } from "@/components/ui/reset-password-form";

export const metadata: Metadata = {
  title: "Set new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = z
    .string()
    .min(1)
    .max(256)
    .safeParse((await searchParams).token);
  return (
    <section className="shell max-w-lg py-12">
      <div className="panel space-y-5">
        <h1 className="text-4xl">Set a new password</h1>
        {token.success ? (
          <ResetPasswordForm token={token.data} />
        ) : (
          <>
            <p className="text-muted-foreground">
              This password reset link is invalid or expired.
            </p>
            <Link
              className="text-sm font-semibold text-primary underline"
              href="/forgot-password"
            >
              Request another link
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
