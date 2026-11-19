"use client";

import { useState, type ComponentPropsWithoutRef } from "react";

type PasswordInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "className"
> & {
  visibilityLabel?: string;
};

export function PasswordInput({
  visibilityLabel = "password",
  ...input
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const action = `${visible ? "Hide" : "Show"} ${visibilityLabel}`;

  return (
    <div className="relative">
      <input
        {...input}
        type={visible ? "text" : "password"}
        className="control pr-14 [&::-ms-reveal]:hidden"
      />
      <button
        type="button"
        aria-controls={input.id}
        aria-label={action}
        title={action}
        onClick={() => setVisible((showing) => !showing)}
        className="absolute inset-y-0.5 right-0.5 z-10 grid w-11 cursor-pointer touch-manipulation place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-offset-[-3px]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none size-5"
        >
          {visible ? (
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c5.5 0 9.3 5 10 7a12 12 0 0 1-3 4M6 6.8A13 13 0 0 0 2 12c.7 2 4.5 7 10 7a10 10 0 0 0 4.2-.9" />
          ) : (
            <>
              <path d="M2 12c.7-2 4.5-7 10-7s9.3 5 10 7c-.7 2-4.5 7-10 7s-9.3-5-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
