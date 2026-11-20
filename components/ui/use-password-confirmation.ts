"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  minimumPasswordLength,
  passwordLengthHint,
  passwordMismatchMessage,
} from "@/lib/validation/auth";
import type { FormState } from "./form-feedback";

export function usePasswordConfirmation(
  state: FormState,
  setState: Dispatch<SetStateAction<FormState>>,
) {
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [passwordMeetsMinimum, setPasswordMeetsMinimum] = useState(false);

  function checkPasswords(event: FormEvent<HTMLFormElement>) {
    const edited = event.target;
    if (
      !(edited instanceof HTMLInputElement) ||
      (edited.name !== "password" && edited.name !== "confirmPassword")
    ) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmation = form.get("confirmPassword");
    setPasswordMeetsMinimum(
      typeof password === "string" && password.length >= minimumPasswordLength,
    );
    setPasswordMismatch(Boolean(confirmation) && confirmation !== password);

    setState((current) => {
      if (!current.fields?.confirmPassword) return current;
      const fields: NonNullable<FormState["fields"]> = {
        ...current.fields,
        confirmPassword: undefined,
      };
      return Object.values(fields).some((errors) => errors?.length)
        ? { ...current, fields }
        : {};
    });
  }

  return {
    checkPasswords,
    clearPasswordMismatch: () => setPasswordMismatch(false),
    passwordHint: passwordMeetsMinimum ? undefined : passwordLengthHint,
    confirmationState: passwordMismatch
      ? { fields: { confirmPassword: [passwordMismatchMessage] } }
      : state,
  };
}
