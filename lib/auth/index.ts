import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { after } from "next/server";
import { sendHostAccountEmail } from "@/lib/email";
import { getAuthConfig, hostEmailVerification } from "./config";

export { getAuthConfig } from "./config";

function queueAccountEmail(
  kind: "verify" | "reset",
  email: string,
  url: string,
  token: string,
) {
  after(async () => {
    try {
      await sendHostAccountEmail(kind, email, url, token);
    } catch {
      console.error("WishVow host account email delivery failed.");
    }
  });
}

function createAuth() {
  const env = getAuthConfig();
  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: hostEmailVerification,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: async ({ user, url, token }) =>
        queueAccountEmail("reset", user.email, url, token),
    },
    emailVerification: {
      sendOnSignUp: hostEmailVerification,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url, token }) =>
        queueAccountEmail("verify", user.email, url, token),
    },
    rateLimit: { enabled: true, storage: "database" },
    advanced: {
      useSecureCookies: env.APP_URL.startsWith("https://"),
      ipAddress: {
        ipAddressHeaders: process.env.VERCEL === "1" ? ["x-forwarded-for"] : [],
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (
          context.path !== "/sign-up/email" &&
          context.path !== "/sign-in/email"
        )
          return;
        const schema =
          context.path === "/sign-up/email" ? signUpSchema : signInSchema;
        const parsed = schema.safeParse(context.body);
        if (!parsed.success)
          throw new APIError("BAD_REQUEST", {
            message: "Invalid credentials.",
          });
        return { context: { body: { ...context.body, ...parsed.data } } };
      }),
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (auth ??= createAuth());
}

export const getHost = cache(async () => {
  const requestHeaders = await headers();
  const host = (await getAuth().api.getSession({ headers: requestHeaders }))
    ?.user;
  if (!host || (hostEmailVerification && !host.emailVerified)) return null;
  return host;
});

export async function requireHost() {
  const host = await getHost();
  if (!host) redirect("/sign-in");
  return host;
}
