export type FormState = {
  error?: string;
  success?: string;
  fields?: Record<string, string[] | undefined>;
};

export function FormFeedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p role="status" className="text-sm font-medium text-primary">
        {state.success}
      </p>
    );
  return null;
}
