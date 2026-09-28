CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"tag" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"bio" text NOT NULL,
	"specialties" text[] DEFAULT '{}' NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"photo_url" text,
	"achievements" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_monthly" integer NOT NULL,
	"features" text[] DEFAULT '{}' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"academy_name" text NOT NULL,
	"tagline" text NOT NULL,
	"hero_title" text NOT NULL,
	"hero_subtitle" text NOT NULL,
	"about_text" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text,
	"address" text NOT NULL,
	"map_embed_url" text,
	"opening_hours" text NOT NULL,
	"instagram_url" text,
	"facebook_url" text,
	"youtube_url" text,
	"courts_count" integer DEFAULT 0 NOT NULL,
	"students_count" integer DEFAULT 0 NOT NULL,
	"years_running" integer DEFAULT 0 NOT NULL,
	"titles_won" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"days" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"level" text NOT NULL,
	"capacity" integer NOT NULL,
	"enrolled" integer DEFAULT 0 NOT NULL,
	"coach_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"phone" text,
	"date_of_birth" text,
	"skill_level" text DEFAULT 'beginner' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_updated_at" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_slots" ADD CONSTRAINT "training_slots_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");