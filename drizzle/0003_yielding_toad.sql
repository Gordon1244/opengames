CREATE TABLE `game_saves` (
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`slot` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`game_id`, `user_id`, `slot`)
);
--> statement-breakpoint
CREATE INDEX `idx_game_saves_user_updated` ON `game_saves` (`user_id`,`updated_at`);--> statement-breakpoint
ALTER TABLE `games` ADD `cloud_saves_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `multiplayer_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `multiplayer_max_players` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `multiplayer_modes` text DEFAULT '["shared"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `multiplayer_room_policy` text DEFAULT 'player' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `multiplayer_managed_unlimited` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `supported_locales` text DEFAULT '["zh-Hant"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `default_locale` text DEFAULT 'zh-Hant' NOT NULL;