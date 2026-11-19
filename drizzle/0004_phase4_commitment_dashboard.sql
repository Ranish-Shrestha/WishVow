CREATE TABLE "commitment_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commitment_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution_receipts" (
	"commitment_id" uuid PRIMARY KEY NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"confirmed_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_positive_amount" CHECK ("contribution_receipts"."amount_minor" > 0),
	CONSTRAINT "receipt_currency_format" CHECK ("contribution_receipts"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "commitments" ADD COLUMN "host_note" text;--> statement-breakpoint
ALTER TABLE "commitment_audit" ADD CONSTRAINT "commitment_audit_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_audit" ADD CONSTRAINT "commitment_audit_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_receipts" ADD CONSTRAINT "contribution_receipts_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_receipts" ADD CONSTRAINT "contribution_receipts_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commitment_audit_commitment_created_idx" ON "commitment_audit" USING btree ("commitment_id","created_at");