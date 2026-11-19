import { z } from "zod";

export const guestTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const termsSchema = z.object({
  quantity: z
    .string()
    .trim()
    .regex(/^(?:[1-9]\d{0,2})?$/, "Enter a whole number from 1 to 999."),
  amount: z.string().trim().max(16),
  message: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
  expectedFulfilmentDate: z
    .union([z.literal(""), z.iso.date()])
    .transform((value) => value || null),
  allowPublicName: z.boolean(),
});
export const commitmentRequestSchema = termsSchema.extend({
  displayName: z.string().trim().min(1, "Enter your name.").max(120),
  email: z
    .string()
    .trim()
    .max(254)
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
});
export type TermsInput = z.infer<typeof termsSchema>;
export type CommitmentRequest = z.infer<typeof commitmentRequestSchema>;

export function readTerms(form: FormData) {
  return {
    quantity: form.get("quantity") ?? "",
    amount: form.get("amount") ?? "",
    message: form.get("message") ?? "",
    expectedFulfilmentDate: form.get("expectedFulfilmentDate") ?? "",
    allowPublicName: form.has("allowPublicName"),
  };
}
