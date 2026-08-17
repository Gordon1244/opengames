import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  handle: text("handle").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["creator", "admin"] }).notNull().default("creator"),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_profiles_handle").on(table.handle), uniqueIndex("idx_profiles_email").on(table.email)]);

export const games = sqliteTable("games", {
  id: text("id").primaryKey(), slug: text("slug").notNull(),
  creatorId: text("creator_id").notNull().references(() => profiles.id),
  titleZh: text("title_zh").notNull(), titleEn: text("title_en").notNull(),
  descriptionZh: text("description_zh").notNull(), descriptionEn: text("description_en").notNull(),
  category: text("category").notNull(), tags: text("tags").notNull().default("[]"), coverKey: text("cover_key"),
  license: text("license").notNull().default("All rights reserved"), sourceUrl: text("source_url"),
  allowDownload: integer("allow_download", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["published", "hidden", "removed"] }).notNull().default("published"),
  currentReleaseId: text("current_release_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_games_slug").on(table.slug), index("idx_games_status_created").on(table.status, table.createdAt), index("idx_games_creator").on(table.creatorId)]);

export const gameReleases = sqliteTable("game_releases", {
  id: text("id").primaryKey(), gameId: text("game_id").notNull().references(() => games.id), version: text("version").notNull(),
  archiveKey: text("archive_key").notNull(), entryPath: text("entry_path").notNull().default("index.html"), checksum: text("checksum").notNull(),
  status: text("status", { enum: ["scanning", "published", "quarantined", "rejected"] }).notNull().default("scanning"),
  scanReport: text("scan_report").notNull().default("{}"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_releases_game_version").on(table.gameId, table.version), index("idx_releases_status").on(table.status)]);

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(), gameId: text("game_id").notNull().references(() => games.id), reporterId: text("reporter_id"),
  reason: text("reason").notNull(), details: text("details").notNull().default(""),
  status: text("status", { enum: ["open", "reviewing", "resolved", "dismissed"] }).notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_reports_status_created").on(table.status, table.createdAt), index("idx_reports_game").on(table.gameId)]);

export const playMetrics = sqliteTable("play_metrics", {
  gameId: text("game_id").notNull().references(() => games.id), day: text("day").notNull(), plays: integer("plays").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.gameId, table.day] })]);
