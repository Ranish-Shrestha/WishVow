"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import { passwordConfirmationSchema } from "@/lib/validation/auth";
import { Button } from "./button";
import { Field } from "./field";
import { FormFeedback, type FormState } from "./form-feedback";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const input = passwordConfirmationSchema.safeParse(form);
    if (!input.success) {
      setState({
        error: "Check the highlighted fields.",
        fields: z.flattenError(input.error).fieldErrors,
      });
      return;
    }
    setPending(true);
    setState({});
    try {
      const { error } = await authClient.resetPassword({
        newPassword: input.data.password,
        token,
      });
      if (error) {
        setState({
          error:
            "This password reset link couldn’t be used. Request a new link and try again.",
        });
        return;
      }
      router.replace("/sign-in?reset=1");
    } catch {
      setState({ error: "WishVow couldn’t connect. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" method="post" onSubmit={submit}>
      <Field
        id="password"
        label="New password"
        hint="Use at least 12 characters."
        state={state}
      >
        <PasswordInput
          name="password"
          visibilityLabel="new password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </Field>
      <Field id="confirmPassword" label="Confirm new password" state={state}>
        <PasswordInput
          name="confirmPassword"
          visibilityLabel="new password confirmation"
          required
          maxLength={128}
          autoComplete="new-password"
        />
      </Field>
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
      <p>
        <Link
          className="text-sm font-semibold text-primary underline"
          href="/forgot-password"
        >
          Request another link
        </Link>
      </p>
    </form>
  );
}
