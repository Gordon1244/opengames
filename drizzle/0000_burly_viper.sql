CREATE TABLE `game_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`version` text NOT NULL,
	`archive_key` text NOT NULL,
	`entry_path` text DEFAULT 'index.html' NOT NULL,
	`checksum` text NOT NULL,
	`status` text DEFAULT 'scanning' NOT NULL,
	`scan_report` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_releases_game_version` ON `game_releases` (`game_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_releases_status` ON `game_releases` (`status`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`creator_id` text NOT NULL,
	`title_zh` text NOT NULL,
	`title_en` text NOT NULL,
	`description_zh` text NOT NULL,
	`description_en` text NOT NULL,
	`category` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`cover_key` text,
	`license` text DEFAULT 'All rights reserved' NOT NULL,
	`source_url` text,
	`allow_download` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`current_release_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_games_slug` ON `games` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_games_status_created` ON `games` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_games_creator` ON `games` (`creator_id`);--> statement-breakpoint
CREATE TABLE `play_metrics` (
	`game_id` text NOT NULL,
	`day` text NOT NULL,
	`plays` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`game_id`, `day`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'creator' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_handle` ON `profiles` (`handle`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_email` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`reporter_id` text,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reports_status_created` ON `reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reports_game` ON `reports` (`game_id`);