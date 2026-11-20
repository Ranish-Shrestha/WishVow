import Link from "next/link";
import { Button } from "./button";

export function FormSubmitActions({
  label,
  pending,
  cancelHref,
}: {
  label: string;
  pending: boolean;
  cancelHref?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {cancelHref &&
        (pending ? (
          <Button type="button" variant="outline" disabled>
            Cancel
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        ))}
    </div>
  );
}
