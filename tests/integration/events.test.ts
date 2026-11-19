import { PGlite } from "@electric-sql/pglite";
import { verifyPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { takeAttempt } from "@/lib/db/feature-limits";
import {
  getGuestEvent,
  getPublishedGate,
  getGuestWish,
  listGuestWishes,
} from "@/lib/db/guest-events";
import { listEventWishes } from "@/lib/db/wishes";
import { changeWish, getHostWish, saveWish } from "@/lib/services/wishes";
import { wishSchema } from "@/lib/validation/wishes";
import { getEvent, listEvents } from "@/lib/db/events";
import * as schema from "@/lib/db/schema";
import {
  createEvent,
  removeParticipant,
  saveParticipant,
  transitionEvent,
  updateEvent,
} from "@/lib/services/events";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => db }));

const engine = new PGlite();
const db = drizzle(engine, { schema });
const owner = "host-a";
const other = "host-b";
const details = {
  title: "Alex & Jules",
  eventType: "wedding" as const,
  story: null,
  eventDate: null,
  timezone: "America/Toronto",
  locationText: null,
};
const privacy = {
  privacy: "unlisted" as const,
  passcode: "",
  showGiverNamesToGuests: false,
  surpriseMode: false,
};
const participant = { displayName: "Taylor", roleLabel: "Partner" };
const gift = wishSchema.parse({
  title: "Tea set",
  description: "",
  notes: "",
  type: "physical",
  category: "home",
  participantId: "",
  isVisible: true,
  priority: "normal",
  externalUrl: "",
  deadline: "",
  quantity: "",
  target: "",
  minimum: "",
  suggested: "",
  currency: "CAD",
  allowMultipleCommitments: false,
});

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
}, 20_000);

beforeEach(async () => {
  await db.execute(sql`truncate table users cascade`);
  await db.insert(schema.user).values([
    { id: owner, email: "owner@example.com", name: "Owner" },
    { id: other, email: "other@example.com", name: "Other" },
  ]);
});

afterAll(async () => {
  await engine.close();
});

describe("event persistence and authorization", () => {
  it("creates a draft and adds owner membership atomically", async () => {
    const id = await createEvent(owner, details, privacy);
    expect(await listEvents(owner)).toMatchObject([{ id, status: "draft" }]);
    expect(await getEvent(owner, id)).toMatchObject({
      event: { id, status: "draft", locale: "en-CA" },
      role: "owner",
    });
    expect(await listEvents(other)).toEqual([]);
  });

  it("updates the time zone and preserves an existing event locale", async () => {
    const id = await createEvent(owner, details, privacy);
    await db
      .update(schema.events)
      .set({ locale: "fr-CA" })
      .where(eq(schema.events.id, id));

    await updateEvent(owner, id, { ...details, timezone: "Asia/Kathmandu" });

    expect(await getEvent(owner, id)).toMatchObject({
      event: { locale: "fr-CA", timezone: "Asia/Kathmandu" },
    });
  });

  it.each(["anniversary", "baby_shower", "birthday"] as const)(
    "saves and publishes a %s wishlist",
    async (eventType) => {
      const id = await createEvent(owner, { ...details, eventType }, privacy);
      expect(await getEvent(owner, id)).toMatchObject({
        event: { eventType, status: "draft" },
      });
      await saveWish(owner, id, null, gift);
      await transitionEvent(owner, id, "published");
      const event = (await getEvent(owner, id))!.event;
      const gate = (await getPublishedGate(event.slug))!;
      expect(await getGuestEvent(gate)).toMatchObject({ type: eventType });
    },
  );

  it("rejects unauthorized reads, edits, lifecycle actions, and participant writes", async () => {
    const id = await createEvent(owner, details, privacy);
    await saveParticipant(owner, id, participant);
    const found = await getEvent(owner, id);
    const participantId = found!.participants[0].id;
    expect(await getEvent(other, id)).toBeNull();
    await expect(
      updateEvent(other, id, { ...details, title: "Tampered" }),
    ).rejects.toThrow("unavailable");
    await expect(transitionEvent(other, id, "published")).rejects.toThrow(
      "unavailable",
    );
    await expect(saveParticipant(other, id, participant)).rejects.toThrow(
      "unavailable",
    );
    await expect(removeParticipant(other, id, participantId)).rejects.toThrow(
      "unavailable",
    );
    expect(await getEvent(owner, id)).toMatchObject({
      event: { title: details.title },
      participants: [participant],
    });
  });

  it("grants cohosts scoped edit access and reserves privacy and lifecycle for owners", async () => {
    const id = await createEvent(owner, details, privacy);
    await db
      .insert(schema.eventMembers)
      .values({ eventId: id, userId: other, role: "cohost" });
    await updateEvent(other, id, { ...details, title: "Updated" });
    await saveParticipant(other, id, participant);
    expect(await getEvent(owner, id)).toMatchObject({
      event: { title: "Updated" },
      participants: [participant],
    });
    await expect(updateEvent(other, id, details, privacy)).rejects.toThrow(
      "Only the event owner",
    );
    await expect(transitionEvent(other, id, "published")).rejects.toThrow(
      "Only the event owner",
    );
  });

  it("scopes participant edits and removals to the specified event", async () => {
    const first = await createEvent(owner, details, privacy);
    const second = await createEvent(owner, details, privacy);
    await saveParticipant(owner, first, participant);
    const firstEvent = await getEvent(owner, first);
    const participantId = firstEvent!.participants[0].id;
    await expect(
      saveParticipant(owner, second, participant, participantId),
    ).rejects.toThrow("unavailable");
    await removeParticipant(owner, second, participantId);
    expect((await getEvent(owner, first))?.participants).toHaveLength(1);
    await saveParticipant(
      owner,
      first,
      { ...participant, roleLabel: "Organizer" },
      participantId,
    );
    expect((await getEvent(owner, first))?.participants[0].roleLabel).toBe(
      "Organizer",
    );
    await removeParticipant(owner, first, participantId);
    expect((await getEvent(owner, first))?.participants).toEqual([]);
  });

  it("hashes, retains, and clears passcodes as privacy changes", async () => {
    const protectedPrivacy = { ...privacy, privacy: "passcode" as const };
    await expect(createEvent(owner, details, protectedPrivacy)).rejects.toThrow(
      "Enter a passcode",
    );
    const id = await createEvent(owner, details, {
      ...protectedPrivacy,
      passcode: "a shared passcode",
    });
    const getHash = async () =>
      (await db.query.events.findFirst({ where: eq(schema.events.id, id) }))
        ?.passcodeHash;
    const hash = await getHash();
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("a shared passcode");
    expect(
      await verifyPassword({ hash: hash!, password: "a shared passcode" }),
    ).toBe(true);
    expect((await getEvent(owner, id))?.event).not.toHaveProperty(
      "passcodeHash",
    );
    await updateEvent(owner, id, details, protectedPrivacy);
    expect(await getHash()).toBe(hash);
    await updateEvent(owner, id, details, privacy);
    expect(await getHash()).toBeNull();
  });

  it("keeps the share slug stable and archives published events permanently", async () => {
    const id = await createEvent(owner, details, privacy);
    const original = (await getEvent(owner, id))?.event.slug;
    await updateEvent(owner, id, { ...details, title: "Changed" });
    await saveWish(owner, id, null, gift);
    await transitionEvent(owner, id, "published");
    const published = (await getEvent(owner, id))?.event;
    expect(published).toMatchObject({
      status: "published",
      slug: original,
      publishedAt: expect.any(Date),
    });
    await transitionEvent(owner, id, "published");
    expect((await getEvent(owner, id))?.event.publishedAt).toEqual(
      published?.publishedAt,
    );
    await transitionEvent(owner, id, "archived");
    expect((await getEvent(owner, id))?.event).toMatchObject({
      status: "archived",
      archivedAt: expect.any(Date),
    });
    await expect(transitionEvent(owner, id, "published")).rejects.toThrow(
      "Archived",
    );
    await expect(updateEvent(owner, id, details)).rejects.toThrow("Archived");
    await expect(saveParticipant(owner, id, participant)).rejects.toThrow(
      "Archived",
    );
  });
});

describe("Phase 2 wishlist persistence", () => {
  it("publishes only with a visible wish and filters private records from guest reads", async () => {
    const id = await createEvent(owner, details, privacy);
    const slug = (await getEvent(owner, id))!.event.slug;
    await saveWish(owner, id, null, { ...gift, isVisible: false });
    expect(await getPublishedGate(slug)).toBeNull();
    await expect(transitionEvent(owner, id, "published")).rejects.toThrow(
      "visible wish",
    );
    await saveWish(owner, id, null, { ...gift, title: "Guest gift" });
    await saveWish(owner, id, null, { ...gift, title: "Archived gift" });
    const [hidden, shown, archived] = await listEventWishes(db, id);
    await changeWish(owner, id, archived.wish.id, "archive");
    await transitionEvent(owner, id, "published");
    const gate = (await getPublishedGate(slug))!;
    expect(await listGuestWishes(gate)).toMatchObject([
      { id: shown.wish.id, title: "Guest gift" },
    ]);
    expect(await getGuestWish(gate, hidden.wish.id)).toBeNull();
    expect(await getGuestWish(gate, archived.wish.id)).toBeNull();
    await transitionEvent(owner, id, "archived");
    expect(await getGuestWish(gate, shown.wish.id)).toBeNull();
  });

  it("isolates wish writes, preserves order, and reassigns wishes when their participant is removed", async () => {
    const id = await createEvent(owner, details, privacy);
    const otherId = await createEvent(other, details, privacy);
    await saveParticipant(other, otherId, participant);
    const wrongPerson = (await getEvent(other, otherId))!.participants[0].id;
    await expect(
      saveWish(owner, id, null, { ...gift, participantId: wrongPerson }),
    ).rejects.toThrow("wishlist owner");
    await saveParticipant(owner, id, participant);
    const assigned = (await getEvent(owner, id))!.participants[0].id;
    await saveWish(owner, id, null, { ...gift, participantId: assigned });
    await saveWish(owner, id, null, { ...gift, title: "Towels" });
    const [tea, towels] = await listEventWishes(db, id);
    expect(await getHostWish(other, id, tea.wish.id)).toBeNull();
    await expect(saveWish(other, id, tea.wish.id, gift)).rejects.toThrow(
      "unavailable",
    );
    await expect(changeWish(other, id, tea.wish.id, "archive")).rejects.toThrow(
      "unavailable",
    );
    await expect(
      changeWish(other, otherId, tea.wish.id, "archive"),
    ).rejects.toThrow("unavailable");
    await changeWish(owner, id, towels.wish.id, "up");
    expect(
      (await listEventWishes(db, id)).map(({ wish }) => wish.title),
    ).toEqual(["Towels", "Tea set"]);
    await removeParticipant(owner, id, assigned);
    expect(await getHostWish(owner, id, tea.wish.id)).toMatchObject({
      title: "Tea set",
      participantId: null,
    });
  });

  it("limits attempts in the database and opens a fresh window after expiry", async () => {
    expect(await takeAttempt("integration", 2, 10_000)).toBe(true);
    expect(await takeAttempt("integration", 2, 10_000)).toBe(true);
    expect(await takeAttempt("integration", 2, 10_000)).toBe(false);
    await db.update(schema.featureRateLimits).set({ expiresAt: new Date(0) });
    expect(await takeAttempt("integration", 2, 10_000)).toBe(true);
  });
});
