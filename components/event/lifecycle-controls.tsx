"use client";

import { useActionState, useState } from "react";
import { lifecycleAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

export function LifecycleControls({
  eventId,
  status,
}: {
  eventId: string;
  status: "draft" | "published";
}) {
  const [confirm, setConfirm] = useState(false);
  const [state, run, pending] = useActionState(
    async (_previous: unknown, data: FormData) => {
      return lifecycleAction(eventId, String(data.get("target")));
    },
    {},
  );

  return (
    <form action={run} className="space-y-3">
      {confirm ? (
        <>
          <p className="text-sm text-muted-foreground">
            Archiving closes the event and makes it read-only.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="target"
              value="archived"
              variant="destructive"
              disabled={pending}
            >
              Confirm archive
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirm(false)}
            >
              Keep event
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status === "draft" && (
            <Button
              type="submit"
              name="target"
              value="published"
              disabled={pending}
            >
              Publish event
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => setConfirm(true)}
          >
            Archive event
          </Button>
        </div>
      )}
      <FormFeedback state={state} />
    </form>
  );
}
