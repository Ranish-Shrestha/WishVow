CREATE TYPE "public"."wish_category" AS ENUM('home', 'travel', 'celebration', 'experiences', 'services', 'other');--> statement-breakpoint
CREATE TYPE "public"."wish_priority" AS ENUM('normal', 'favorite');--> statement-breakpoint
CREATE TYPE "public"."wish_type" AS ENUM('physical', 'experience', 'group_fund', 'service', 'open_wish');--> statement-breakpoint
CREATE TABLE "feature_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"participant_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"notes" text,
	"type" "wish_type" NOT NULL,
	"category" "wish_category" NOT NULL,
	"image_key" text,
	"external_url" text,
	"quantity_total" integer,
	"target_amount_minor" integer,
	"minimum_amount_minor" integer,
	"suggested_amount_minor" integer,
	"currency" text,
	"priority" "wish_priority" DEFAULT 'normal' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"allow_multiple_commitments" boolean DEFAULT false NOT NULL,
	"deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "wishes_title_length" CHECK (char_length(btrim("wishes"."title")) between 1 and 120),
	CONSTRAINT "wishes_quantity_type" CHECK (
    ("wishes"."quantity_total" is null or "wishes"."quantity_total" between 1 and 999) and
    case "wishes"."type"
      when 'group_fund' then "wishes"."quantity_total" is null
      when 'service' then "wishes"."description" is not null and char_length(btrim("wishes"."description")) > 0
      when 'open_wish' then ("wishes"."quantity_total" is null) = "wishes"."allow_multiple_commitments"
      else "wishes"."quantity_total" is not null
    end and ("wishes"."type" = 'open_wish' or not "wishes"."allow_multiple_commitments")
  ),
	CONSTRAINT "wishes_amounts_match_type" CHECK (
    case when "wishes"."type" = 'group_fund' then
      "wishes"."target_amount_minor" is not null and "wishes"."target_amount_minor" > 0 and
      ("wishes"."minimum_amount_minor" is null or "wishes"."minimum_amount_minor" between 1 and "wishes"."target_amount_minor")
    else "wishes"."target_amount_minor" is null and "wishes"."minimum_amount_minor" is null end
    and ("wishes"."suggested_amount_minor" is null or ("wishes"."type" in ('physical', 'experience') and "wishes"."suggested_amount_minor" > 0))
    and ("wishes"."currency" is not null) = ("wishes"."target_amount_minor" is not null or "wishes"."suggested_amount_minor" is not null)
    and ("wishes"."currency" is null or "wishes"."currency" ~ '^[A-Z]{3}$')
  ),
	CONSTRAINT "wishes_nonnegative_order" CHECK ("wishes"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_id_event_unique" UNIQUE("id","event_id");--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_participant_event_fk" FOREIGN KEY ("participant_id","event_id") REFERENCES "public"."event_participants"("id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_rate_limits_expiry_idx" ON "feature_rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "wishes_browse_idx" ON "wishes" USING btree ("event_id","is_visible","archived_at","sort_order");--> statement-breakpoint
CREATE INDEX "wishes_participant_idx" ON "wishes" USING btree ("participant_id","event_id");--> statement-breakpoint
