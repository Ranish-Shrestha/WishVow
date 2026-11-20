"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import {
  minimumPasswordLength,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { Button } from "./button";
import { Field } from "./field";
import { FormFeedback, type FormState } from "./form-feedback";
import { PasswordInput } from "./password-input";
import { usePasswordConfirmation } from "./use-password-confirmation";

const invalidCredentialsMessage = "Invalid email or password.";

export function AuthForm({
  registering,
  notice,
}: {
  registering: boolean;
  notice?: string;
}) {
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
    const input = (registering ? signUpSchema : signInSchema).safeParse(form);
    if (!input.success) {
      setState(
        registering
          ? {
              error: "Check the highlighted fields.",
              fields: z.flattenError(input.error).fieldErrors,
            }
          : { error: invalidCredentialsMessage },
      );
      return;
    }
    clearPasswordMismatch();
    setPending(true);
    setState({});
    try {
      const { data, error } =
        registering && "name" in input.data
          ? await authClient.signUp.email({
              ...input.data,
              name: String(input.data.name),
              callbackURL: "/sign-in?verified=1",
            })
          : await authClient.signIn.email(input.data);
      if (error) {
        setState({
          error:
            error.status === 429
              ? "Too many attempts. Please wait and try again."
              : error.code === "EMAIL_NOT_VERIFIED"
                ? "Verify your host email before signing in. You can request another link below."
                : registering
                  ? "We couldn’t create your account. Check your details or try signing in."
                  : invalidCredentialsMessage,
        });
        return;
      }
      if (registering && data?.token === null) {
        setState({
          success: "Check your inbox for a link to verify your host email.",
        });
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setState({ error: "WishVow couldn’t connect. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="shell max-w-lg py-12 sm:py-16">
      <div className="panel">
        <h1 className="mb-6 text-4xl">
          {registering ? "Create a host account" : "Sign in to WishVow"}
        </h1>
        {notice && (
          <p role="status" className="mb-4 text-sm font-semibold text-primary">
            {notice}
          </p>
        )}
        <form
          method="post"
          onSubmit={submit}
          onInput={registering ? checkPasswords : undefined}
          className="space-y-4"
        >
          {registering && (
            <Field id="name" label="Your name" state={state}>
              <input
                name="name"
                className="control"
                autoComplete="name"
                required
                maxLength={120}
              />
            </Field>
          )}
          <Field id="email" label="Email address" state={state}>
            <input
              name="email"
              type="email"
              className="control"
              autoComplete="email"
              required
              maxLength={254}
            />
          </Field>
          <Field
            id="password"
            label="Password"
            state={state}
            hint={registering ? passwordHint : undefined}
          >
            <PasswordInput
              name="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={registering ? minimumPasswordLength : undefined}
              maxLength={128}
            />
          </Field>
          {registering && (
            <Field
              id="confirmPassword"
              label="Confirm password"
              state={confirmationState}
            >
              <PasswordInput
                name="confirmPassword"
                visibilityLabel="password confirmation"
                autoComplete="new-password"
                required
                maxLength={128}
              />
            </Field>
          )}
          <FormFeedback state={state} />
          {registering && state.success && (
            <p className="text-sm text-muted-foreground">
              Didn’t get an email?{" "}
              <Link
                href="/verify-host-email"
                className="font-semibold text-primary underline"
              >
                Request a verification link
              </Link>
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending
              ? "Please wait…"
              : registering
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>
        {!registering && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-primary">
            <Link className="underline" href="/forgot-password">
              Forgot password?
            </Link>
            <Link className="underline" href="/verify-host-email">
              Request a verification link
            </Link>
          </div>
        )}
        <p className="mt-5 text-sm text-muted-foreground">
          {registering ? "Already have an account? " : "New to WishVow? "}
          <Link
            href={registering ? "/sign-in" : "/sign-up"}
            className="font-semibold text-primary underline"
          >
            {registering ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </section>
  );
}
