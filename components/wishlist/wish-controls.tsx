"use client";

import { useActionState, useState } from "react";
import { changeWishAction } from "@/app/dashboard/wish-actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

export function WishControls({
  eventId,
  wishId,
  canMoveUp,
  canMoveDown,
}: {
  eventId: string;
  wishId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [state, action, pending] = useActionState(
    changeWishAction.bind(null, eventId, wishId),
    {},
  );
  const [confirm, setConfirm] = useState(false);
  return (
    <form action={action} className="border-t border-border pt-2">
      <div className="flex flex-wrap items-center gap-x-2">
        {confirm ? (
          <>
            <Button
              type="submit"
              variant="destructive"
              name="intent"
              value="archive"
              disabled={pending}
            >
              Confirm wish archive
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm(false)}
              disabled={pending}
            >
              Keep wish
            </Button>
          </>
        ) : (
          <>
            {(canMoveUp || canMoveDown) && (
              <>
                <Button
                  type="submit"
                  variant="ghost"
                  className="px-2 sm:px-3"
                  name="intent"
                  value="up"
                  disabled={pending || !canMoveUp}
                >
                  Move up
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  className="px-2 sm:px-3"
                  name="intent"
                  value="down"
                  disabled={pending || !canMoveDown}
                >
                  Move down
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              className="px-2 text-destructive sm:px-3"
              onClick={() => setConfirm(true)}
              disabled={pending}
            >
              Archive wish
            </Button>
          </>
        )}
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
