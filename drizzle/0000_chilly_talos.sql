CREATE TABLE `review_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_key` text NOT NULL,
	`language` text NOT NULL,
	`module` text NOT NULL,
	`prompt` text NOT NULL,
	`answer` text NOT NULL,
	`status` text DEFAULT 'learning' NOT NULL,
	`next_review_at` text NOT NULL,
	`interval_days` integer DEFAULT 1 NOT NULL,
	`seen_count` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_review_item_key` ON `review_items` (`item_key`);--> statement-breakpoint
CREATE INDEX `idx_review_due` ON `review_items` (`next_review_at`,`language`);--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`language` text NOT NULL,
	`module` text NOT NULL,
	`mode` text NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`score` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_created_at` ON `study_sessions` (`created_at`);--> statement-breakpoint
PRAGMA optimize;
