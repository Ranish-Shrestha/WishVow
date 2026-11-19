import "server-only";

import { cache } from "react";
import { authEnv } from "@/lib/validation/environment";

export const hostEmailVerification =
  process.env.NODE_ENV === "production" ||
  process.env.HOST_EMAIL_VERIFICATION === "true";

export const getAuthConfig = cache(() =>
  authEnv.parse({
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL,
  }),
);
