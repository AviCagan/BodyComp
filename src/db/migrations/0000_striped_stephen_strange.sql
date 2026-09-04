CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bodyweight_log` (
	`id` text PRIMARY KEY NOT NULL,
	`weight_kg` real NOT NULL,
	`logged_at` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `bodyweight_logged_idx` ON `bodyweight_log` (`logged_at`);--> statement-breakpoint
CREATE TABLE `exercise_muscles` (
	`exercise_id` text NOT NULL,
	`group_id` text NOT NULL,
	`weight` real NOT NULL,
	`region_distribution` text,
	`needs_review` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`exercise_id`, `group_id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercise_muscles_group_idx` ON `exercise_muscles` (`group_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`equipment` text DEFAULT 'other' NOT NULL,
	`mechanic` text DEFAULT 'compound' NOT NULL,
	`pattern` text DEFAULT 'other' NOT NULL,
	`force` text,
	`level` text,
	`category` text,
	`instructions` text DEFAULT '[]' NOT NULL,
	`media_refs` text DEFAULT '[]' NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `exercises_name_idx` ON `exercises` (`name`);--> statement-breakpoint
CREATE TABLE `muscle_status_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`computed_at` integer NOT NULL,
	`effective_sets` real NOT NULL,
	`ratio` real NOT NULL,
	`status` text NOT NULL,
	`flags` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	`set_id` text,
	`achieved_at` integer NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`set_id`) REFERENCES `sets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `pr_exercise_idx` ON `personal_records` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text DEFAULT 'beginner' NOT NULL,
	`units` text DEFAULT 'lb' NOT NULL,
	`goal` text DEFAULT 'hypertrophy' NOT NULL,
	`equipment_profile` text DEFAULT 'commercial_gym' NOT NULL,
	`body_model` text DEFAULT 'male' NOT NULL,
	`priority_groups` text DEFAULT '[]' NOT NULL,
	`target_overrides` text DEFAULT '{}' NOT NULL,
	`enabled_optional_groups` text DEFAULT '[]' NOT NULL,
	`rest_timer_default_sec` integer DEFAULT 120 NOT NULL,
	`bodyweight_kg` real,
	`height_cm` real,
	`onboarding_completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`rir` real,
	`rpe` real,
	`set_type` text DEFAULT 'working' NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`performed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sets_we_idx` ON `sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE INDEX `sets_performed_idx` ON `sets` (`performed_at`);--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`superset_group` integer,
	`rest_timer_sec` integer,
	`notes` text,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `template_exercises_template_idx` ON `template_exercises` (`template_id`);--> statement-breakpoint
CREATE TABLE `template_schedule` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`weekday` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `template_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`template_exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`set_type` text DEFAULT 'working' NOT NULL,
	`target_weight_kg` real,
	`target_reps` integer,
	`target_rir` real,
	FOREIGN KEY (`template_exercise_id`) REFERENCES `template_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `template_sets_te_idx` ON `template_sets` (`template_exercise_id`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `video_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`superset_group` integer,
	`rest_timer_sec` integer,
	`notes` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_exercises_exercise_idx` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`name` text,
	`template_id` text,
	`notes` text,
	`is_provisional` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workouts_started_idx` ON `workouts` (`started_at`);