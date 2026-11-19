import { z } from "zod";

export const commitmentStatuses = [
  "pending_verification",
  "active",
  "purchased",
  "fulfilled",
  "cancelled",
  "expired",
] as const;
export const commitmentKinds = [
  "reservation",
  "pledge",
  "service_promise",
] as const;

export const commitmentFilters = z.object({
  status: z.enum(commitmentStatuses).optional().catch(undefined),
  kind: z.enum(commitmentKinds).optional().catch(undefined),
  wish: z.uuid().optional().catch(undefined),
  page: z
    .string()
    .regex(/^[1-9]\d{0,5}$/)
    .transform(Number)
    .catch(1),
});

export const hostCommitmentUpdate = z.discriminatedUnion("intent", [
  z.object({
    intent: z.enum(["purchased", "fulfilled", "cancelled"]),
    note: z
      .string()
      .trim()
      .max(1000)
      .transform((value) => value || null),
  }),
  z.object({
    intent: z.literal("receipt"),
    amount: z.string().trim().min(1).max(16),
  }),
]);

export type CommitmentFilters = z.output<typeof commitmentFilters>;
export type HostCommitmentUpdate = z.output<typeof hostCommitmentUpdate>;
export type CommitmentStatus = (typeof commitmentStatuses)[number];
export type CommitmentKind = (typeof commitmentKinds)[number];
