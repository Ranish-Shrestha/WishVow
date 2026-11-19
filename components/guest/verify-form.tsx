"use client";

import { useActionState } from "react";
import { verifyGuestCommitment } from "@/app/guest/actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

export function VerifyForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    verifyGuestCommitment.bind(null, token),
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending || !!state.error}>
        {pending ? "Confirming…" : "Confirm commitment"}
      </Button>
    </form>
  );
}
