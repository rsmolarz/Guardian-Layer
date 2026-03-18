CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"destination" text NOT NULL,
	"amount" double precision NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"risk_score" double precision NOT NULL,
	"status" text DEFAULT 'ALLOWED' NOT NULL,
	"category" text DEFAULT 'general',
	"ip_address" text,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"source" text NOT NULL,
	"detail" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"ip_address" text,
	"metadata" jsonb,
	"response_time_ms" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dark_web_exposures" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_type" text NOT NULL,
	"source_marketplace" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"discovery_date" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"recommended_actions" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"exposure_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_exposure_id_dark_web_exposures_id_fk" FOREIGN KEY ("exposure_id") REFERENCES "public"."dark_web_exposures"("id") ON DELETE no action ON UPDATE no action;