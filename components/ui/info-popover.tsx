"use client";

import type { ReactNode } from "react";

export function InfoPopover({
  id,
  label,
  open,
  onOpenChange,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onOpenChange(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onOpenChange(false);
      }}
    >
      <button
        type="button"
        aria-label={`About ${label.toLowerCase()}`}
        aria-expanded={open}
        aria-controls={`${id}-help`}
        onClick={({ nativeEvent }) => {
          const mouse =
            "pointerType" in nativeEvent && nativeEvent.pointerType === "mouse";
          onOpenChange(mouse || !open);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) onOpenChange(true);
        }}
        onBlur={() => onOpenChange(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onOpenChange(false);
        }}
        className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
      >
        <span
          aria-hidden="true"
          className="grid size-4 place-items-center rounded-full border border-current text-xs leading-none font-semibold"
        >
          i
        </span>
      </button>
      <div
        id={`${id}-help`}
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 w-full max-w-sm space-y-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground shadow-lg"
      >
        {children}
      </div>
    </div>
  );
}
