"use client";

import { useActionState, useState } from "react";
import { revealHostGiver } from "@/app/dashboard/commitment-actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

export function RevealGiver({ eventId, id }: { eventId: string; id: string }) {
  const [visible, setVisible] = useState(false);
  const [state, action, pending] = useActionState<
    Awaited<ReturnType<typeof revealHostGiver>>
  >(async () => {
    const result = await revealHostGiver(eventId, id);
    if (result.details) setVisible(true);
    return result;
  }, {});

  if (visible && state.details) {
    return (
      <div className="space-y-2 rounded-lg bg-muted p-3 text-sm" role="status">
        <p className="break-words font-semibold">{state.details.name}</p>
        <p className="break-all">{state.details.email}</p>
        {state.details.message && (
          <p className="break-words whitespace-pre-wrap">
            {state.details.message}
          </p>
        )}
        <Button type="button" variant="ghost" onClick={() => setVisible(false)}>
          Hide details
        </Button>
      </div>
    );
  }
  return (
    <details className="space-y-3 text-sm">
      <summary className="cursor-pointer font-semibold text-primary">
        Reveal privately for fulfilment
      </summary>
      <p className="text-muted-foreground">
        This reveals the giver’s details to you and records the access.
      </p>
      <form action={action}>
        <Button type="submit" variant="outline" disabled={pending}>
          Reveal giver details
        </Button>
      </form>
      <FormFeedback state={state} />
    </details>
  );
}
