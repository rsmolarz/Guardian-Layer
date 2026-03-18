CREATE TABLE IF NOT EXISTS "backup_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"interval_hours" integer DEFAULT 6 NOT NULL,
	"retention_days" integer DEFAULT 30 NOT NULL,
	"max_backups" integer DEFAULT 50 NOT NULL,
	"auto_backup_enabled" boolean DEFAULT true,
	"last_auto_backup_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text DEFAULT 'manual' NOT NULL,
	"size_bytes" integer,
	"checksum" text,
	"checksum_verified" boolean DEFAULT false,
	"local_path" text,
	"drive_file_id" text,
	"drive_folder_id" text,
	"includes_database" boolean DEFAULT true,
	"includes_source_code" boolean DEFAULT true,
	"includes_packages" boolean DEFAULT true,
	"error_message" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
