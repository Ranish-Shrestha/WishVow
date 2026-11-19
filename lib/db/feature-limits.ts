import "server-only";

import { lt, sql } from "drizzle-orm";
import { getDb } from "./index";
import { featureRateLimits } from "./schema";

export async function takeAttempt(
  key: string,
  limit: number,
  windowMs: number,
) {
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const [{ attempts }] = await db
    .insert(featureRateLimits)
    .values({ key, attempts: 1, expiresAt })
    .onConflictDoUpdate({
      target: featureRateLimits.key,
      set: {
        attempts: sql`case when ${featureRateLimits.expiresAt} <= ${now.toISOString()} then 1 else least(${featureRateLimits.attempts} + 1, ${limit + 1}) end`,
        expiresAt: sql`case when ${featureRateLimits.expiresAt} <= ${now.toISOString()} then excluded.expires_at else ${featureRateLimits.expiresAt} end`,
      },
    })
    .returning({ attempts: featureRateLimits.attempts });
  if (Math.random() < 0.01)
    await db
      .delete(featureRateLimits)
      .where(lt(featureRateLimits.expiresAt, now));
  return attempts <= limit;
}
