"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import {
  minimumPasswordLength,
  passwordConfirmationSchema,
} from "@/lib/validation/auth";
import { Button } from "./button";
import { Field } from "./field";
import { FormFeedback, type FormState } from "./form-feedback";
import { PasswordInput } from "./password-input";
import { usePasswordConfirmation } from "./use-password-confirmation";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const {
    checkPasswords,
    clearPasswordMismatch,
    passwordHint,
    confirmationState,
  } = usePasswordConfirmation(state, setState);

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
    clearPasswordMismatch();
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
    <form
      className="space-y-4"
      method="post"
      onSubmit={submit}
      onInput={checkPasswords}
    >
      <Field
        id="password"
        label="New password"
        hint={passwordHint}
        state={state}
      >
        <PasswordInput
          name="password"
          visibilityLabel="new password"
          required
          minLength={minimumPasswordLength}
          maxLength={128}
          autoComplete="new-password"
        />
      </Field>
      <Field
        id="confirmPassword"
        label="Confirm new password"
        state={confirmationState}
      >
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
