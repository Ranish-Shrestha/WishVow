CREATE TYPE "public"."commitment_kind" AS ENUM('reservation', 'pledge', 'service_promise');--> statement-breakpoint
CREATE TYPE "public"."commitment_status" AS ENUM('pending_verification', 'active', 'purchased', 'fulfilled', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."guest_token_purpose" AS ENUM('verify', 'manage');--> statement-breakpoint
CREATE TABLE "commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"wish_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"kind" "commitment_kind" NOT NULL,
	"status" "commitment_status" DEFAULT 'pending_verification' NOT NULL,
	"quantity" integer,
	"amount_minor" integer,
	"currency" text,
	"message" text,
	"allow_public_name" boolean DEFAULT false NOT NULL,
	"expected_fulfilment_date" date,
	"access_stamp" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commitments_terms_match_kind" CHECK (
    case when "commitments"."kind" = 'pledge' then
      "commitments"."amount_minor" is not null and "commitments"."amount_minor" > 0 and
      "commitments"."currency" is not null and "commitments"."currency" ~ '^[A-Z]{3}$' and "commitments"."quantity" is null
    else "commitments"."amount_minor" is null and "commitments"."currency" is null and
      "commitments"."quantity" is not null and "commitments"."quantity" between 1 and 999 end
    and ("commitments"."kind" = 'service_promise' or "commitments"."expected_fulfilment_date" is null)
  ),
	CONSTRAINT "commitments_verified_status" CHECK (
    ("commitments"."verified_at" is not null) = ("commitments"."status" in ('active', 'purchased', 'fulfilled', 'cancelled'))
    and ("commitments"."cancelled_at" is not null) = ("commitments"."status" = 'cancelled')
  )
);
--> statement-breakpoint
CREATE TABLE "guest_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"commitment_id" uuid NOT NULL,
	"purpose" "guest_token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"email_normalized" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_event_email_unique" UNIQUE("event_id","email_normalized"),
	CONSTRAINT "guests_id_event_unique" UNIQUE("id","event_id")
);
--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_id_event_unique" UNIQUE("id","event_id");--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_wish_event_fk" FOREIGN KEY ("wish_id","event_id") REFERENCES "public"."wishes"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_guest_event_fk" FOREIGN KEY ("guest_id","event_id") REFERENCES "public"."guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_tokens" ADD CONSTRAINT "guest_tokens_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commitments_wish_status_idx" ON "commitments" USING btree ("wish_id","status");--> statement-breakpoint
CREATE INDEX "commitments_guest_created_idx" ON "commitments" USING btree ("guest_id","created_at");--> statement-breakpoint
CREATE INDEX "commitments_event_created_idx" ON "commitments" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commitments_one_current_wish_idx" ON "commitments" USING btree ("wish_id","guest_id") WHERE "commitments"."status" in ('pending_verification', 'active', 'purchased', 'fulfilled');--> statement-breakpoint
CREATE INDEX "guest_tokens_commitment_purpose_idx" ON "guest_tokens" USING btree ("commitment_id","purpose");--> statement-breakpoint
