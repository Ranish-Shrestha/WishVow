"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "./button";
import { FormFeedback, type FormState } from "./form-feedback";

export function SignOut() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    setState({});
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setState({ error: "Couldn’t sign out. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant="outline" onClick={signOut} disabled={pending}>
        Sign out
      </Button>
      <FormFeedback state={state} />
    </div>
  );
}
