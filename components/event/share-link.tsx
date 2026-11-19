"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback, type FormState } from "@/components/ui/form-feedback";

export function ShareLink({
  url,
  label = "Event share link",
}: {
  url: string;
  label?: string;
}) {
  const inputId = useId();
  const [state, setState] = useState<FormState>({});

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState({ success: "Link copied." });
    } catch {
      setState({ error: "Select and copy the URL from the field." });
    }
  }

  async function share() {
    if (typeof navigator.share !== "function") {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "WishVow", url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        await copy();
    }
  }

  return (
    <div className="space-y-3">
      <Field id={inputId} label={label}>
        <input
          className="control"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copy}>
          Copy link
        </Button>
        <Button variant="outline" type="button" onClick={share}>
          Share link
        </Button>
      </div>
      <FormFeedback state={state} />
    </div>
  );
}
