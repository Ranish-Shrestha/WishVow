import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { eventTypes } from "../event-types";

const time = (name: string) => timestamp(name, { withTimezone: true });
const created = () => time("created_at").defaultNow().notNull();
const updated = () => time("updated_at").defaultNow().notNull();

export const user = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text(),
  createdAt: created(),
  updatedAt: updated(),
});

export const session = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    token: text().notNull().unique(),
    expiresAt: time("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const account = pgTable(
  "accounts",
  {
    id: text().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: time("access_token_expires_at"),
    refreshTokenExpiresAt: time("refresh_token_expires_at"),
    scope: text(),
    password: text(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (table) => [
    index("accounts_user_idx").on(table.userId),
    unique("accounts_provider_identity_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "verifications",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: time("expires_at").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const rateLimit = pgTable("auth_rate_limits", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const eventType = pgEnum("event_type", eventTypes);
export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "archived",
]);
export const eventPrivacy = pgEnum("event_privacy", ["unlisted", "passcode"]);
export const memberRole = pgEnum("event_member_role", ["owner", "cohost"]);

export const events = pgTable(
  "events",
  {
    id: uuid().defaultRandom().primaryKey(),
    title: text().notNull(),
    slug: text().notNull().unique(),
    eventType: eventType("event_type").notNull(),
    status: eventStatus().default("draft").notNull(),
    story: text(),
    eventDate: date("event_date"),
    locale: text().notNull().default("en-CA"),
    timezone: text().notNull(),
    locationText: text("location_text"),
    privacy: eventPrivacy().default("unlisted").notNull(),
    passcodeHash: text("passcode_hash"),
    showGiverNamesToGuests: boolean("show_giver_names_to_guests")
      .notNull()
      .default(false),
    surpriseMode: boolean("surprise_mode").notNull().default(false),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: created(),
    updatedAt: updated(),
    publishedAt: time("published_at"),
    archivedAt: time("archived_at"),
  },
  (table) => [
    check(
      "events_title_length",
      sql`char_length(btrim(${table.title})) between 1 and 120`,
    ),
    check(
      "events_passcode_matches_privacy",
      sql`(${table.privacy} = 'passcode') = (${table.passcodeHash} is not null)`,
    ),
    check(
      "events_publish_timestamp",
      sql`${table.status} <> 'published' or ${table.publishedAt} is not null`,
    ),
    check(
      "events_archive_timestamp",
      sql`(${table.status} = 'archived') = (${table.archivedAt} is not null)`,
    ),
  ],
);

export const eventMembers = pgTable(
  "event_members",
  {
    id: uuid().defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    role: memberRole().notNull(),
    createdAt: created(),
  },
  (table) => [
    unique("event_members_event_user_unique").on(table.eventId, table.userId),
    index("event_members_user_event_idx").on(table.userId, table.eventId),
  ],
);

export const eventParticipants = pgTable(
  "event_participants",
  {
    id: uuid().defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    roleLabel: text("role_label").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: created(),
  },
  (table) => [
    unique("event_participants_id_event_unique").on(table.id, table.eventId),
    index("event_participants_event_order_idx").on(
      table.eventId,
      table.sortOrder,
      table.id,
    ),
    check(
      "event_participants_name_length",
      sql`char_length(btrim(${table.displayName})) between 1 and 120`,
    ),
    check(
      "event_participants_role_length",
      sql`char_length(btrim(${table.roleLabel})) between 1 and 80`,
    ),
    check("event_participants_nonnegative_order", sql`${table.sortOrder} >= 0`),
  ],
);

export const wishType = pgEnum("wish_type", [
  "physical",
  "experience",
  "group_fund",
  "service",
  "open_wish",
]);
export const wishCategory = pgEnum("wish_category", [
  "home",
  "travel",
  "celebration",
  "experiences",
  "services",
  "other",
]);
export const wishPriority = pgEnum("wish_priority", ["normal", "favorite"]);

export const wishes = pgTable(
  "wishes",
  {
    id: uuid().defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id"),
    title: text().notNull(),
    description: text(),
    notes: text(),
    type: wishType().notNull(),
    category: wishCategory().notNull(),
    imageKey: text("image_key"),
    externalUrl: text("external_url"),
    quantityTotal: integer("quantity_total"),
    targetAmountMinor: integer("target_amount_minor"),
    minimumAmountMinor: integer("minimum_amount_minor"),
    suggestedAmountMinor: integer("suggested_amount_minor"),
    currency: text(),
    priority: wishPriority().notNull().default("normal"),
    isVisible: boolean("is_visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    allowMultipleCommitments: boolean("allow_multiple_commitments")
      .notNull()
      .default(false),
    deadline: date(),
    createdAt: created(),
    updatedAt: updated(),
    archivedAt: time("archived_at"),
  },
  (table) => [
    foreignKey({
      name: "wishes_participant_event_fk",
      columns: [table.participantId, table.eventId],
      foreignColumns: [eventParticipants.id, eventParticipants.eventId],
    }),
    unique("wishes_id_event_unique").on(table.id, table.eventId),
    index("wishes_browse_idx").on(
      table.eventId,
      table.isVisible,
      table.archivedAt,
      table.sortOrder,
    ),
    index("wishes_participant_idx").on(table.participantId, table.eventId),
    check(
      "wishes_title_length",
      sql`char_length(btrim(${table.title})) between 1 and 120`,
    ),
    check(
      "wishes_quantity_type",
      sql`
    (${table.quantityTotal} is null or ${table.quantityTotal} between 1 and 999) and
    case ${table.type}
      when 'group_fund' then ${table.quantityTotal} is null
      when 'service' then ${table.description} is not null and char_length(btrim(${table.description})) > 0
      when 'open_wish' then (${table.quantityTotal} is null) = ${table.allowMultipleCommitments}
      else ${table.quantityTotal} is not null
    end and (${table.type} = 'open_wish' or not ${table.allowMultipleCommitments})
  `,
    ),
    check(
      "wishes_amounts_match_type",
      sql`
    case when ${table.type} = 'group_fund' then
      ${table.targetAmountMinor} is not null and ${table.targetAmountMinor} > 0 and
      (${table.minimumAmountMinor} is null or ${table.minimumAmountMinor} between 1 and ${table.targetAmountMinor})
    else ${table.targetAmountMinor} is null and ${table.minimumAmountMinor} is null end
    and (${table.suggestedAmountMinor} is null or (${table.type} in ('physical', 'experience') and ${table.suggestedAmountMinor} > 0))
    and (${table.currency} is not null) = (${table.targetAmountMinor} is not null or ${table.suggestedAmountMinor} is not null)
    and (${table.currency} is null or ${table.currency} ~ '^[A-Z]{3}$')
  `,
    ),
    check("wishes_nonnegative_order", sql`${table.sortOrder} >= 0`),
  ],
);

export const featureRateLimits = pgTable(
  "feature_rate_limits",
  {
    key: text().primaryKey(),
    attempts: integer().notNull(),
    expiresAt: time("expires_at").notNull(),
  },
  (table) => [index("feature_rate_limits_expiry_idx").on(table.expiresAt)],
);

export const commitmentKind = pgEnum("commitment_kind", [
  "reservation",
  "pledge",
  "service_promise",
]);
export const commitmentStatus = pgEnum("commitment_status", [
  "pending_verification",
  "active",
  "purchased",
  "fulfilled",
  "cancelled",
  "expired",
]);
export const tokenPurpose = pgEnum("guest_token_purpose", ["verify", "manage"]);

export const guests = pgTable(
  "guests",
  {
    id: uuid().defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    emailNormalized: text("email_normalized").notNull(),
    createdAt: created(),
  },
  (table) => [
    unique("guests_event_email_unique").on(
      table.eventId,
      table.emailNormalized,
    ),
    unique("guests_id_event_unique").on(table.id, table.eventId),
  ],
);

export const commitments = pgTable(
  "commitments",
  {
    id: uuid().defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    wishId: uuid("wish_id").notNull(),
    guestId: uuid("guest_id").notNull(),
    displayName: text("display_name").notNull(),
    kind: commitmentKind().notNull(),
    status: commitmentStatus().notNull().default("pending_verification"),
    quantity: integer(),
    amountMinor: integer("amount_minor"),
    currency: text(),
    message: text(),
    allowPublicName: boolean("allow_public_name").notNull().default(false),
    expectedFulfilmentDate: date("expected_fulfilment_date"),
    accessStamp: text("access_stamp").notNull(),
    expiresAt: time("expires_at").notNull(),
    verifiedAt: time("verified_at"),
    hostNote: text("host_note"),
    cancelledAt: time("cancelled_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (table) => [
    foreignKey({
      name: "commitments_wish_event_fk",
      columns: [table.wishId, table.eventId],
      foreignColumns: [wishes.id, wishes.eventId],
    }).onDelete("cascade"),
    foreignKey({
      name: "commitments_guest_event_fk",
      columns: [table.guestId, table.eventId],
      foreignColumns: [guests.id, guests.eventId],
    }).onDelete("cascade"),
    index("commitments_wish_status_idx").on(table.wishId, table.status),
    index("commitments_guest_created_idx").on(table.guestId, table.createdAt),
    index("commitments_event_created_idx").on(table.eventId, table.createdAt),
    uniqueIndex("commitments_one_current_wish_idx")
      .on(table.wishId, table.guestId)
      .where(
        sql`${table.status} in ('pending_verification', 'active', 'purchased', 'fulfilled')`,
      ),
    check(
      "commitments_terms_match_kind",
      sql`
    case when ${table.kind} = 'pledge' then
      ${table.amountMinor} is not null and ${table.amountMinor} > 0 and
      ${table.currency} is not null and ${table.currency} ~ '^[A-Z]{3}$' and ${table.quantity} is null
    else ${table.amountMinor} is null and ${table.currency} is null and
      ${table.quantity} is not null and ${table.quantity} between 1 and 999 end
    and (${table.kind} = 'service_promise' or ${table.expectedFulfilmentDate} is null)
  `,
    ),
    check(
      "commitments_verified_status",
      sql`
    (${table.verifiedAt} is not null) = (${table.status} in ('active', 'purchased', 'fulfilled', 'cancelled'))
    and (${table.cancelledAt} is not null) = (${table.status} = 'cancelled')
  `,
    ),
  ],
);

export const guestTokens = pgTable(
  "guest_tokens",
  {
    id: uuid().primaryKey(),
    commitmentId: uuid("commitment_id")
      .notNull()
      .references(() => commitments.id, { onDelete: "cascade" }),
    purpose: tokenPurpose().notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: time("expires_at").notNull(),
    consumedAt: time("consumed_at"),
    revokedAt: time("revoked_at"),
    createdAt: created(),
  },
  (table) => [
    index("guest_tokens_commitment_purpose_idx").on(
      table.commitmentId,
      table.purpose,
    ),
  ],
);

export const invitationTemplate = pgEnum("invitation_template", [
  "classic",
  "modern",
  "garden",
]);
export const rsvpStatus = pgEnum("rsvp_status", ["attending", "not_attending"]);

export const invitationCards = pgTable(
  "invitation_cards",
  {
    eventId: uuid("event_id")
      .primaryKey()
      .references(() => events.id, { onDelete: "cascade" }),
    names: text().notNull(),
    invitationDate: date("invitation_date").notNull(),
    venue: text().notNull(),
    template: invitationTemplate().notNull().default("classic"),
    accentColor: text("accent_color").notNull(),
    backgroundColor: text("background_color").notNull(),
    imageKey: text("image_key"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (table) => [
    check(
      "invitation_card_names_length",
      sql`char_length(btrim(${table.names})) between 1 and 88`,
    ),
    check(
      "invitation_card_venue_length",
      sql`char_length(btrim(${table.venue})) between 1 and 120`,
    ),
    check(
      "invitation_card_colors",
      sql`${table.accentColor} ~ '^#[0-9a-f]{6}$' and ${table.backgroundColor} ~ '^#[0-9a-f]{6}$'`,
    ),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid().defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => invitationCards.eventId, { onDelete: "cascade" }),
    label: text().notNull(),
    maxParty: integer("max_party").notNull(),
    tokenVersion: uuid("token_version").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: rsvpStatus(),
    partySize: integer("party_size"),
    message: text(),
    respondedAt: time("responded_at"),
    revokedAt: time("revoked_at"),
    createdAt: created(),
  },
  (table) => [
    index("invitations_event_created_idx").on(
      table.eventId,
      table.createdAt,
      table.id,
    ),
    check(
      "invitation_label_length",
      sql`char_length(btrim(${table.label})) between 1 and 100`,
    ),
    check("invitation_max_party", sql`${table.maxParty} between 1 and 12`),
    check(
      "invitation_response_consistent",
      sql`
    case
      when ${table.status} is null then ${table.partySize} is null and ${table.respondedAt} is null and ${table.message} is null
      when ${table.status} = 'not_attending' then ${table.partySize} is not null and ${table.partySize} = 0 and ${table.respondedAt} is not null
      else ${table.partySize} is not null and ${table.partySize} between 1 and ${table.maxParty} and ${table.respondedAt} is not null
    end
    and (${table.message} is null or char_length(${table.message}) <= 1000)
  `,
    ),
  ],
);

export const contributionReceipts = pgTable(
  "contribution_receipts",
  {
    commitmentId: uuid("commitment_id")
      .primaryKey()
      .references(() => commitments.id, { onDelete: "cascade" }),
    amountMinor: integer("amount_minor").notNull(),
    currency: text().notNull(),
    confirmedBy: text("confirmed_by")
      .notNull()
      .references(() => user.id),
    updatedAt: updated(),
  },
  (table) => [
    check("receipt_positive_amount", sql`${table.amountMinor} > 0`),
    check("receipt_currency_format", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const commitmentAudit = pgTable(
  "commitment_audit",
  {
    id: uuid().defaultRandom().primaryKey(),
    commitmentId: uuid("commitment_id")
      .notNull()
      .references(() => commitments.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    action: text().notNull(),
    createdAt: created(),
  },
  (table) => [
    index("commitment_audit_commitment_created_idx").on(
      table.commitmentId,
      table.createdAt,
    ),
  ],
);
