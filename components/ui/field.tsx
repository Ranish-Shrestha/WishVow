import { cloneElement, type ReactElement, type ReactNode } from "react";
import type { FormState } from "./form-feedback";
import { InfoPopover } from "./info-popover";

export function Field({
  id,
  label,
  hint,
  help,
  state,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  help?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content: ReactNode;
  };
  state?: FormState;
  children: ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
}) {
  const error = state?.fields?.[id]?.[0];
  const description = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-1.5">
      <div className={help ? "relative flex items-center gap-1" : undefined}>
        <label htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
        {help && (
          <InfoPopover
            id={id}
            label={label}
            open={help.open}
            onOpenChange={help.onOpenChange}
          >
            {help.content}
          </InfoPopover>
        )}
      </div>
      {cloneElement(children, {
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": description || undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
