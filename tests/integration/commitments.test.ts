import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { migrate as pgMigrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle as localDrizzle } from "drizzle-orm/pglite";
import { migrate as localMigrate } from "drizzle-orm/pglite/migrator";
import { Client, Pool } from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Database } from "@/lib/db";
import { usedCapacity } from "@/lib/db/commitments";
import { getPublishedGate, visibleGiverNames } from "@/lib/db/guest-events";
import {
  getCommitmentDashboard,
  revealCommitmentGiver,
  updateHostCommitment,
} from "@/lib/services/host-commitments";
import { commitmentFilters } from "@/lib/validation/host-commitments";
import * as schema from "@/lib/db/schema";
import {
  changeCommitment,
  confirmCommitment,
  managedCommitment,
  recoverCommitment,
  requestCommitment,
  verificationPage,
} from "@/lib/services/commitments";
import {
  createEvent,
  transitionEvent,
  updateEvent,
} from "@/lib/services/events";
import { saveWish } from "@/lib/services/wishes";
import { wishSchema } from "@/lib/validation/wishes";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => db }));

const adminUrl = process.env.WISHVOW_TEST_POSTGRES_ADMIN_URL;
const secret = "test-only-secret-for-guest-commitments";
let db: Database;
let cleanup: (() => Promise<void>) | undefined;
const details = {
  title: "Test wedding",
  eventType: "wedding" as const,
  eventDate: null,
  story: null,
  locationText: null,
  locale: "en-CA",
  timezone: "UTC",
};
const privacy = {
  privacy: "unlisted" as const,
  passcode: "",
  showGiverNamesToGuests: false,
  surpriseMode: false,
};
const wishInput = {
  title: "Gift",
  description: "",
  notes: "",
  type: "physical",
  category: "home",
  participantId: "",
  isVisible: true,
  priority: "normal",
  externalUrl: "",
  deadline: "",
  quantity: "1",
  target: "",
  minimum: "",
  suggested: "",
  currency: "CAD",
  allowMultipleCommitments: false,
};
const guest = (name: string, amount = "") => ({
  displayName: name,
  email: name + "@example.test",
  quantity: "1",
  amount,
  message: null,
  expectedFulfilmentDate: null,
  allowPublicName: false,
});

beforeAll(async () => {
  if (!adminUrl) {
    const engine = new PGlite();
    cleanup = () => engine.close();
    const local = localDrizzle(engine, { schema });
    db = local;
    await localMigrate(local, { migrationsFolder: "drizzle" });
    return;
  }
  const url = new URL(adminUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(
      "Concurrency tests require a disposable PostgreSQL server on loopback.",
    );
  }
  const database = "wishvow_test_" + randomUUID().replaceAll("-", "");
  const admin = new Client({ connectionString: url.href });
  await admin.connect();
  url.pathname = "/" + database;
  const pool = new Pool({ connectionString: url.href, max: 6 });
  let created = false;
  cleanup = async () => {
    await pool.end();
    try {
      if (created) await admin.query("drop database " + database);
    } finally {
      await admin.end();
    }
  };
  await admin.query("create database " + database);
  created = true;
  const postgres = pgDrizzle(pool, { schema });
  db = postgres;
  await pgMigrate(postgres, { migrationsFolder: "drizzle" });
}, 25_000);

beforeEach(async () => {
  await db.execute(sql`truncate users cascade`);
  await db
    .insert(schema.user)
    .values({ id: "host", email: "host@example.test", name: "Host" });
});

afterAll(async () => {
  await cleanup?.();
});

async function publishedWish(overrides: Partial<typeof wishInput> = {}) {
  const eventId = await createEvent("host", details, privacy);
  await saveWish(
    "host",
    eventId,
    null,
    wishSchema.parse({ ...wishInput, ...overrides }),
  );
  await transitionEvent("host", eventId, "published");
  const [event] = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.id, eventId));
  const [wish] = await db
    .select()
    .from(schema.wishes)
    .where(eq(schema.wishes.eventId, eventId));
  return { gate: (await getPublishedGate(event.slug))!, wish, eventId };
}

describe(
  adminUrl
    ? "Guest commitments on concurrent PostgreSQL connections"
    : "Guest commitments on isolated PGlite",
  () => {
    it("holds no capacity before an explicit confirmation and lets only one claim the last unit", async () => {
      const { gate, wish } = await publishedWish();
      const first = await requestCommitment(
        gate,
        wish.id,
        guest("first"),
        secret,
      );
      const second = await requestCommitment(
        gate,
        wish.id,
        guest("second"),
        secret,
      );
      expect(await verificationPage(first.token)).toMatchObject({
        quantity: 1,
      });
      expect(await verificationPage(first.token)).toMatchObject({
        quantity: 1,
      });
      expect(await usedCapacity(db, wish.id)).toEqual({
        count: 0,
        quantity: 0,
        amount: 0,
      });

      const outcomes = await Promise.all([
        confirmCommitment(first.token, secret),
        confirmCommitment(second.token, secret),
      ]);
      expect(outcomes.map(({ status }) => status).sort()).toEqual([
        "confirmed",
        "unavailable",
      ]);
      expect(await usedCapacity(db, wish.id)).toEqual({
        count: 1,
        quantity: 1,
        amount: 0,
      });
      expect(await confirmCommitment(first.token, secret)).toEqual({
        status: "invalid",
      });
      expect(await confirmCommitment(second.token, secret)).toEqual({
        status: "invalid",
      });
    });

    it("accepts at most one of two simultaneous pledges that would exceed the same goal", async () => {
      const { gate, wish } = await publishedWish({
        type: "group_fund",
        quantity: "",
        target: "100",
        minimum: "10",
      });
      const first = await requestCommitment(
        gate,
        wish.id,
        guest("first", "60"),
        secret,
      );
      const second = await requestCommitment(
        gate,
        wish.id,
        guest("second", "70"),
        secret,
      );
      const results = await Promise.all([
        confirmCommitment(first.token, secret),
        confirmCommitment(second.token, secret),
      ]);
      expect(results.map(({ status }) => status).sort()).toEqual([
        "confirmed",
        "unavailable",
      ]);
      expect(await usedCapacity(db, wish.id)).toMatchObject({
        count: 1,
        quantity: 0,
      });
      expect([6000, 7000]).toContain((await usedCapacity(db, wish.id)).amount);
    });

    it("expires links, reuses pending email keys, and binds verifications to current event access", async () => {
      const { gate, wish, eventId } = await publishedWish();
      const first = await requestCommitment(
        gate,
        wish.id,
        guest("first"),
        secret,
      );
      expect(
        await requestCommitment(gate, wish.id, guest("first"), secret),
      ).toEqual(first);
      await db.update(schema.guestTokens).set({ expiresAt: new Date(0) });
      expect(await verificationPage(first.token)).toBeNull();
      expect(await confirmCommitment(first.token, secret)).toEqual({
        status: "invalid",
      });
      const next = await requestCommitment(
        gate,
        wish.id,
        guest("first"),
        secret,
      );
      expect(next.token).not.toBe(first.token);
      await updateEvent("host", eventId, details, {
        ...privacy,
        privacy: "passcode",
        passcode: "a rotated passcode",
      });
      expect(await confirmCommitment(next.token, secret)).toMatchObject({
        status: "unavailable",
      });
      expect((await usedCapacity(db, wish.id)).count).toBe(0);
    });

    it("scopes access to one commitment, rotates expired management tokens, and restores capacity on cancellation", async () => {
      const { gate, wish } = await publishedWish({ quantity: "3" });
      const first = await requestCommitment(
        gate,
        wish.id,
        guest("first"),
        secret,
      );
      const second = await requestCommitment(
        gate,
        wish.id,
        { ...guest("second"), message: "private message" },
        secret,
      );
      const [a, b] = await Promise.all([
        confirmCommitment(first.token, secret),
        confirmCommitment(second.token, secret),
      ]);
      if (a.status !== "confirmed" || b.status !== "confirmed")
        throw new Error("Fixture commitments could not be verified.");
      expect(await managedCommitment(a.token)).toMatchObject({
        quantity: 1,
        message: null,
      });
      expect(await managedCommitment(first.token)).toBeNull();
      await expect(changeCommitment(first.token, null)).rejects.toThrow(
        "invalid or expired",
      );
      await expect(
        changeCommitment(a.token, { ...guest("first"), quantity: "3" }),
      ).rejects.toThrow("no longer available");
      await changeCommitment(a.token, { ...guest("first"), quantity: "2" });
      expect(await managedCommitment(b.token)).toMatchObject({
        quantity: 1,
        message: "private message",
      });
      expect(await usedCapacity(db, wish.id)).toMatchObject({ quantity: 3 });
      await db
        .update(schema.guestTokens)
        .set({ expiresAt: new Date(0) })
        .where(eq(schema.guestTokens.commitmentId, a.id));
      const restored = (await recoverCommitment(
        gate,
        wish.id,
        "first@example.test",
        secret,
      ))!;
      expect(await managedCommitment(a.token)).toBeNull();
      expect(restored.token).not.toBe(a.token);
      expect(await changeCommitment(restored.token, null)).toMatchObject({
        id: a.id,
      });
      expect(await changeCommitment(restored.token, null)).toBeNull();
      expect(await managedCommitment(restored.token)).toMatchObject({
        status: "cancelled",
      });
      expect(await usedCapacity(db, wish.id)).toMatchObject({ quantity: 1 });
    });

    it("preserves service notes and allows cancellation after event archival", async () => {
      const { gate, wish, eventId } = await publishedWish({
        type: "service",
        description: "Photograph the ceremony",
      });
      const request = await requestCommitment(
        gate,
        wish.id,
        {
          ...guest("first"),
          message: "I can bring my camera.",
          expectedFulfilmentDate: "2027-03-03",
        },
        secret,
      );
      const verified = await confirmCommitment(request.token, secret);
      if (verified.status !== "confirmed")
        throw new Error("Fixture commitment could not be verified.");
      expect(await managedCommitment(verified.token)).toMatchObject({
        kind: "service_promise",
        message: "I can bring my camera.",
        expectedFulfilmentDate: "2027-03-03",
      });
      await expect(
        saveWish("host", eventId, wish.id, wishSchema.parse(wishInput)),
      ).rejects.toThrow("Keep the wish type");
      await transitionEvent("host", eventId, "archived");
      expect(await managedCommitment(verified.token)).toMatchObject({
        canEdit: false,
      });
      await changeCommitment(verified.token, null);
      expect((await usedCapacity(db, wish.id)).count).toBe(0);
    });
  },
);

describe("host fulfilment and privacy", () => {
  const all = commitmentFilters.parse({});

  it("keeps unverified and surprise-mode giver details private until fulfilment", async () => {
    const { gate, wish, eventId } = await publishedWish();
    await updateEvent("host", eventId, details, {
      ...privacy,
      surpriseMode: true,
      showGiverNamesToGuests: true,
    });
    const pending = await requestCommitment(
      gate,
      wish.id,
      { ...guest("first"), message: "Private note", allowPublicName: true },
      secret,
    );
    expect(
      (await getCommitmentDashboard("host", eventId, all))?.rows[0],
    ).toMatchObject({
      status: "pending_verification",
      name: null,
      email: null,
      message: null,
    });
    expect(await getCommitmentDashboard("stranger", eventId, all)).toBeNull();
    await expect(
      updateHostCommitment("stranger", eventId, pending.id, {
        intent: "fulfilled",
        note: null,
      }),
    ).rejects.toThrow("unavailable");

    await confirmCommitment(pending.token, secret);
    expect(await visibleGiverNames(gate, wish.id)).toEqual([]);
    expect(
      await revealCommitmentGiver("host", eventId, pending.id),
    ).toMatchObject({ name: "first", message: "Private note" });
    await db
      .insert(schema.user)
      .values({ id: "cohost", email: "cohost@example.test", name: "Co-host" });
    await db
      .insert(schema.eventMembers)
      .values({ userId: "cohost", eventId, role: "cohost" });
    expect(
      (await getCommitmentDashboard("cohost", eventId, all))?.rows[0].name,
    ).toBeNull();
    await expect(
      revealCommitmentGiver("cohost", eventId, pending.id),
    ).rejects.toThrow("unavailable");
    await updateHostCommitment("host", eventId, pending.id, {
      intent: "purchased",
      note: null,
    });
    const purchased = (await getCommitmentDashboard(
      "host",
      eventId,
      commitmentFilters.parse({ status: "purchased" }),
    ))!.rows;
    expect(purchased).toMatchObject([
      { status: "purchased", name: null, email: null },
    ]);

    await updateHostCommitment("host", eventId, pending.id, {
      intent: "fulfilled",
      note: "Gift arrived",
    });
    const fulfilled = (await getCommitmentDashboard("host", eventId, all))!
      .rows;
    expect(fulfilled).toMatchObject([
      {
        status: "fulfilled",
        name: "first",
        email: "first@example.test",
        hostNote: "Gift arrived",
      },
    ]);
    expect(await visibleGiverNames(gate, wish.id)).toEqual(["first"]);
    expect((await usedCapacity(db, wish.id)).quantity).toBe(1);
    await expect(
      updateHostCommitment("host", eventId, pending.id, {
        intent: "cancelled",
        note: null,
      }),
    ).rejects.toThrow("no longer available");
    expect(
      await db
        .select({ action: schema.commitmentAudit.action })
        .from(schema.commitmentAudit)
        .orderBy(asc(schema.commitmentAudit.action)),
    ).toEqual([
      { action: "identity_revealed" },
      { action: "status_fulfilled" },
      { action: "status_purchased" },
    ]);
  });

  it("keeps pledge and receipt totals separate and protects the recorded amount", async () => {
    const { gate, wish, eventId } = await publishedWish({
      type: "group_fund",
      quantity: "",
      target: "100",
      minimum: "10",
    });
    const pending = await requestCommitment(
      gate,
      wish.id,
      guest("first", "60"),
      secret,
    );
    const verified = await confirmCommitment(pending.token, secret);
    if (verified.status !== "confirmed")
      throw new Error("Fixture did not confirm.");
    await expect(
      updateHostCommitment("host", eventId, pending.id, {
        intent: "receipt",
        amount: "61",
      }),
    ).rejects.toThrow("between zero");
    await updateHostCommitment("host", eventId, pending.id, {
      intent: "receipt",
      amount: "25",
    });
    expect(
      (await getCommitmentDashboard("host", eventId, all))!.metrics,
    ).toMatchObject([{ pledged: 6000, received: 2500, currency: "CAD" }]);
    expect(await managedCommitment(verified.token)).toMatchObject({
      canCancel: false,
    });
    await expect(changeCommitment(verified.token, null)).rejects.toThrow(
      "before cancelling",
    );
    await expect(
      changeCommitment(verified.token, guest("first", "20")),
    ).rejects.toThrow("cannot be lower");
    await expect(
      updateHostCommitment("host", eventId, pending.id, {
        intent: "cancelled",
        note: null,
      }),
    ).rejects.toThrow("no longer available");

    await updateHostCommitment("host", eventId, pending.id, {
      intent: "receipt",
      amount: "0",
    });
    expect(
      await updateHostCommitment("host", eventId, pending.id, {
        intent: "cancelled",
        note: null,
      }),
    ).toMatchObject({ email: "first@example.test" });
    expect((await usedCapacity(db, wish.id)).amount).toBe(0);
    expect(await managedCommitment(verified.token)).toMatchObject({
      status: "cancelled",
    });
  });

  it("displays pending requests whose email link has expired in the expired filter", async () => {
    const { gate, wish, eventId } = await publishedWish();
    const pending = await requestCommitment(
      gate,
      wish.id,
      guest("first"),
      secret,
    );
    await db
      .update(schema.commitments)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.commitments.id, pending.id));
    const expired = await getCommitmentDashboard(
      "host",
      eventId,
      commitmentFilters.parse({ status: "expired", wish: wish.id }),
    );
    expect(expired?.rows).toMatchObject([
      { id: pending.id, status: "expired", name: null },
    ]);
    await transitionEvent("host", eventId, "archived");
    expect(
      (await getCommitmentDashboard("host", eventId, all))?.rows,
    ).toHaveLength(1);
    await expect(
      updateHostCommitment("host", eventId, pending.id, {
        intent: "fulfilled",
        note: null,
      }),
    ).rejects.toThrow("Archived");
  });
});
