import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { createEvent, transitionEvent } from "@/lib/services/events";
import {
  changeInvitationLink,
  createInvitation,
  invitationDashboard,
  invitationForExport,
  invitationForGuest,
  respondToInvitation,
  saveInvitationCard,
  shareableInvitation,
} from "@/lib/services/invitations";
import { saveWish } from "@/lib/services/wishes";
import {
  invitationCardSchema,
  invitationLinkSchema,
  rsvpSchema,
} from "@/lib/validation/invitations";
import { wishSchema } from "@/lib/validation/wishes";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => db }));

const engine = new PGlite();
const db = drizzle(engine, { schema });
const secret = "test-secret-for-invitations";
const origin = "http://localhost:3000";
const details = {
  title: "Ari & Morgan",
  eventType: "wedding" as const,
  story: null,
  eventDate: "2027-06-12",
  locale: "en-CA",
  timezone: "America/Toronto",
  locationText: "Lake House",
};
const privacy = {
  privacy: "passcode" as const,
  passcode: "private event code",
  showGiverNamesToGuests: false,
  surpriseMode: false,
};
const design = invitationCardSchema.parse({
  names: details.title,
  invitationDate: details.eventDate,
  venue: details.locationText,
  template: "garden",
  accentColor: "#4a5241",
  backgroundColor: "#ecf0e1",
});
const link = invitationLinkSchema.parse({
  label: "Rivera household",
  maxParty: "2",
});

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
}, 20_000);
beforeEach(async () => {
  await db.execute(sql`truncate table users cascade`);
  await db.insert(schema.user).values([
    { id: "owner", name: "Owner", email: "owner@example.test" },
    { id: "stranger", name: "Stranger", email: "other@example.test" },
  ]);
});
afterAll(async () => engine.close());

async function draft() {
  const id = await createEvent("owner", details, privacy);
  await saveWish(
    "owner",
    id,
    null,
    wishSchema.parse({
      title: "Ceramic pitcher",
      description: "",
      notes: "",
      type: "physical",
      category: "home",
      participantId: "",
      priority: "normal",
      isVisible: true,
      quantity: "1",
      deadline: "",
      externalUrl: "",
      target: "",
      minimum: "",
      suggested: "",
      currency: "CAD",
      allowMultipleCommitments: false,
    }),
  );
  await saveInvitationCard("owner", id, design);
  return id;
}

async function token(eventId: string, recipientId: string) {
  const data = (await invitationDashboard("owner", eventId))!;
  const row = data.recipients.find(({ id }) => id === recipientId)!;
  return new URL(shareableInvitation(row, secret, origin)!).pathname
    .split("/")
    .at(-1)!;
}

it("keeps designs, guest records, and exports scoped to event members", async () => {
  const eventId = await draft();
  expect(await invitationDashboard("stranger", eventId)).toBeNull();
  expect(await invitationForExport("stranger", eventId)).toBeNull();
  await expect(saveInvitationCard("stranger", eventId, design)).rejects.toThrow(
    "unavailable",
  );
  await expect(
    createInvitation("stranger", eventId, link, secret),
  ).rejects.toThrow("unavailable");
  const recipient = await createInvitation("owner", eventId, link, secret);
  expect(await invitationForExport("owner", eventId, recipient)).toBeNull();
  const otherEvent = await draft();
  await expect(
    changeInvitationLink("owner", otherEvent, recipient, "revoke", secret),
  ).rejects.toThrow("unavailable");
});

it("opens only published live invitations, caps party sizes, and isolates household replies", async () => {
  const eventId = await draft();
  const first = await createInvitation("owner", eventId, link, secret);
  const second = await createInvitation(
    "owner",
    eventId,
    { ...link, label: "Other household" },
    secret,
  );
  const privateToken = await token(eventId, first);
  const secondToken = await token(eventId, second);
  expect(privateToken).not.toBe(secondToken);
  expect(await invitationForGuest(privateToken)).toBeNull();
  await transitionEvent("owner", eventId, "published");

  const view = (await invitationForGuest(privateToken))!;
  expect(view.invitation.label).toBe(link.label);
  expect(view.event).not.toHaveProperty("passcodeHash");
  expect(view.invitation).not.toHaveProperty("tokenHash");
  await expect(
    respondToInvitation(privateToken, {
      status: "attending",
      partySize: 3,
      message: null,
    }),
  ).rejects.toThrow("up to 2");
  const yes = rsvpSchema.parse({
    status: "attending",
    partySize: "2",
    message: "Looking forward to it!",
  });
  await respondToInvitation(privateToken, yes);
  const firstSaved = (await invitationDashboard(
    "owner",
    eventId,
  ))!.recipients.find(({ id }) => id === first)!;
  await respondToInvitation(privateToken, yes);
  const resubmitted = (await invitationDashboard(
    "owner",
    eventId,
  ))!.recipients.find(({ id }) => id === first)!;
  expect(resubmitted.respondedAt).toEqual(firstSaved.respondedAt);
  expect((await invitationForGuest(secondToken))!.invitation.status).toBeNull();

  await respondToInvitation(
    privateToken,
    rsvpSchema.parse({ status: "not_attending", partySize: "2", message: "" }),
  );
  expect((await invitationForGuest(privateToken))!.invitation).toMatchObject({
    status: "not_attending",
    partySize: 0,
    message: null,
  });
  await transitionEvent("owner", eventId, "archived");
  expect(await invitationForGuest(privateToken)).toBeNull();
  await expect(respondToInvitation(privateToken, yes)).rejects.toThrow(
    "unavailable",
  );
});

it("rotates and revokes access while preserving the saved reply", async () => {
  const eventId = await draft();
  await transitionEvent("owner", eventId, "published");
  const id = await createInvitation("owner", eventId, link, secret);
  const old = await token(eventId, id);
  await respondToInvitation(old, {
    status: "attending",
    partySize: 1,
    message: "See you there",
  });
  await changeInvitationLink("owner", eventId, id, "rotate", secret);
  const newer = await token(eventId, id);
  expect(newer).not.toBe(old);
  expect(await invitationForGuest(old)).toBeNull();
  expect((await invitationForGuest(newer))!.invitation).toMatchObject({
    partySize: 1,
    message: "See you there",
  });
  await changeInvitationLink("owner", eventId, id, "revoke", secret);
  expect(await invitationForGuest(newer)).toBeNull();
  expect(await invitationForExport("owner", eventId, id)).toBeNull();
  expect(
    (await invitationDashboard("owner", eventId))!.recipients[0],
  ).toMatchObject({ status: "attending", revokedAt: expect.any(Date) });
});
