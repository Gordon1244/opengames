CREATE TABLE `login_notifications` (
	`session_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text DEFAULT 'sending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_login_notifications_user_created` ON `login_notifications` (`user_id`,`created_at`);