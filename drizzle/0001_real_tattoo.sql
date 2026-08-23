CREATE TABLE `game_ratings` (
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`game_id`, `user_id`),
	CONSTRAINT "game_ratings_value_check" CHECK("game_ratings"."rating" BETWEEN 1 AND 5)
);
