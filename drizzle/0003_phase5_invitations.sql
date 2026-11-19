CREATE TYPE "public"."invitation_template" AS ENUM('classic', 'modern', 'garden');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('attending', 'not_attending');--> statement-breakpoint
CREATE TABLE "invitation_cards" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"names" text NOT NULL,
	"invitation_date" date NOT NULL,
	"venue" text NOT NULL,
	"template" "invitation_template" DEFAULT 'classic' NOT NULL,
	"accent_color" text NOT NULL,
	"background_color" text NOT NULL,
	"image_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_card_names_length" CHECK (char_length(btrim("invitation_cards"."names")) between 1 and 88),
	CONSTRAINT "invitation_card_venue_length" CHECK (char_length(btrim("invitation_cards"."venue")) between 1 and 120),
	CONSTRAINT "invitation_card_colors" CHECK ("invitation_cards"."accent_color" ~ '^#[0-9a-f]{6}$' and "invitation_cards"."background_color" ~ '^#[0-9a-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text NOT NULL,
	"max_party" integer NOT NULL,
	"token_version" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"status" "rsvp_status",
	"party_size" integer,
	"message" text,
	"responded_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "invitation_label_length" CHECK (char_length(btrim("invitations"."label")) between 1 and 100),
	CONSTRAINT "invitation_max_party" CHECK ("invitations"."max_party" between 1 and 12),
	CONSTRAINT "invitation_response_consistent" CHECK (
    case
      when "invitations"."status" is null then "invitations"."party_size" is null and "invitations"."responded_at" is null and "invitations"."message" is null
      when "invitations"."status" = 'not_attending' then "invitations"."party_size" is not null and "invitations"."party_size" = 0 and "invitations"."responded_at" is not null
      else "invitations"."party_size" is not null and "invitations"."party_size" between 1 and "invitations"."max_party" and "invitations"."responded_at" is not null
    end
    and ("invitations"."message" is null or char_length("invitations"."message") <= 1000)
  )
);
--> statement-breakpoint
ALTER TABLE "invitation_cards" ADD CONSTRAINT "invitation_cards_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_event_id_invitation_cards_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."invitation_cards"("event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitations_event_created_idx" ON "invitations" USING btree ("event_id","created_at","id");