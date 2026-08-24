ALTER TABLE `profiles` ADD `headline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `website_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `skills` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `is_public` integer DEFAULT true NOT NULL;