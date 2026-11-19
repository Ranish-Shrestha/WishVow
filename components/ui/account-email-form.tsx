"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import { Button } from "./button";
import { Field } from "./field";
import { FormFeedback, type FormState } from "./form-feedback";

export function AccountEmailForm({ mode }: { mode: "reset" | "verify" }) {
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const verify = mode === "verify";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = z
      .string()
      .trim()
      .max(254)
      .toLowerCase()
      .pipe(z.email())
      .safeParse(new FormData(event.currentTarget).get("email"));
    if (!email.success) {
      setState({ error: "Enter a valid email address." });
      return;
    }
    setPending(true);
    setState({});
    try {
      const { error } = verify
        ? await authClient.sendVerificationEmail({
            email: email.data,
            callbackURL: "/sign-in?verified=1",
          })
        : await authClient.requestPasswordReset({
            email: email.data,
            redirectTo: "/reset-password",
          });
      setState(
        error?.status === 429
          ? { error: "Too many requests. Try again in a few minutes." }
          : {
              success:
                "If your account is eligible, check your inbox for a link.",
            },
      );
    } catch {
      setState({ error: "WishVow couldn’t connect. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="shell max-w-lg py-12">
      <div className="panel space-y-5">
        <h1 className="text-4xl">
          {verify ? "Verify your host email" : "Forgot your password?"}
        </h1>
        <form className="space-y-4" method="post" onSubmit={submit}>
          <Field id="email" label="Host email address">
            <input
              type="email"
              name="email"
              className="control"
              required
              maxLength={254}
              autoComplete="email"
            />
          </Field>
          <FormFeedback state={state} />
          <Button type="submit" disabled={pending}>
            {pending
              ? "Sending…"
              : verify
                ? "Send verification email"
                : "Send password reset link"}
          </Button>
        </form>
        <Link
          className="text-sm font-semibold text-primary underline"
          href="/sign-in"
        >
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
