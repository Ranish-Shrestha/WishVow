import { z } from "zod";

const email = z
  .string()
  .trim()
  .max(254)
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));
export const minimumPasswordLength = 12;
export const passwordLengthHint = `Use at least ${minimumPasswordLength} characters.`;
export const passwordMismatchMessage = "The passwords must match.";
const password = z
  .string()
  .min(minimumPasswordLength, passwordLengthHint)
  .max(128);

export const signInSchema = z.object({ email, password });
export const passwordConfirmationSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Confirm your password.").max(128),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ["confirmPassword"],
    message: passwordMismatchMessage,
  });

export const signUpSchema = passwordConfirmationSchema.safeExtend({
  email,
  name: z.string().trim().min(1, "Enter your name.").max(120),
});
