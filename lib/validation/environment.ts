import { z } from "zod";

export const databaseUrlSchema = z.url({ protocol: /^postgres(?:ql)?$/ });
export const databaseEnv = z.object({
  DATABASE_URL: databaseUrlSchema,
  DATABASE_DRIVER: z.enum(["neon", "pg"]).optional(),
});

export const authEnv = z.object({
  AUTH_SECRET: z.string().min(32),
  APP_URL: z
    .url({ protocol: /^https?$/ })
    .superRefine((value, context) => {
      const url = new URL(value);
      const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
        url.hostname,
      );
      if (
        url.origin !== value.replace(/\/$/, "") ||
        (url.protocol === "http:" && !loopback)
      ) {
        context.addIssue({
          code: "custom",
          message: "Use an HTTPS origin, or HTTP localhost for development.",
        });
      }
    })
    .transform((value) => new URL(value).origin),
});
