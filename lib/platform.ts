type PlatformEnv = { DB?: D1Database; GAMES?: R2Bucket };

export async function getPlatformEnv() {
  try {
    const { env } = await import("cloudflare:workers");
    return env as unknown as PlatformEnv;
  } catch {
    return {} as PlatformEnv;
  }
}

export async function ensureCoreTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, handle TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'creator', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, creator_id TEXT NOT NULL, title_zh TEXT NOT NULL, title_en TEXT NOT NULL, description_zh TEXT NOT NULL, description_en TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', cover_key TEXT, license TEXT NOT NULL DEFAULT 'All rights reserved', source_url TEXT, allow_download INTEGER NOT NULL DEFAULT 0, cloud_saves_enabled INTEGER NOT NULL DEFAULT 0, multiplayer_enabled INTEGER NOT NULL DEFAULT 0, multiplayer_max_players INTEGER NOT NULL DEFAULT 4, multiplayer_modes TEXT NOT NULL DEFAULT '["shared"]', multiplayer_room_policy TEXT NOT NULL DEFAULT 'player', multiplayer_managed_unlimited INTEGER NOT NULL DEFAULT 0, supported_locales TEXT NOT NULL DEFAULT '["zh-Hant"]', default_locale TEXT NOT NULL DEFAULT 'zh-Hant', status TEXT NOT NULL DEFAULT 'published', current_release_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS game_releases (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, version TEXT NOT NULL, archive_key TEXT NOT NULL, entry_path TEXT NOT NULL DEFAULT 'index.html', checksum TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'scanning', scan_report TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, reporter_id TEXT, reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS play_metrics (game_id TEXT NOT NULL, day TEXT NOT NULL, plays INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (game_id, day))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS game_ratings (game_id TEXT NOT NULL, user_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (game_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS login_notifications (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'sending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, sent_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS game_saves (game_id TEXT NOT NULL, user_id TEXT NOT NULL, slot TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (game_id, user_id, slot))`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_games_status_created ON games(status, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_games_creator ON games(creator_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_login_notifications_user_created ON login_notifications(user_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_game_saves_user_updated ON game_saves(user_id, updated_at)`),
  ]);

  // Sites D1 databases created before creator capabilities existed need a
  // small, idempotent runtime migration. PRAGMA keeps repeated requests safe.
  const existing = await db.prepare(`PRAGMA table_info(games)`).all<{ name: string }>();
  const columns = new Set((existing.results ?? []).map((column) => column.name));
  const additions = [
    ["cloud_saves_enabled", `ALTER TABLE games ADD COLUMN cloud_saves_enabled INTEGER NOT NULL DEFAULT 0`],
    ["multiplayer_enabled", `ALTER TABLE games ADD COLUMN multiplayer_enabled INTEGER NOT NULL DEFAULT 0`],
    ["multiplayer_max_players", `ALTER TABLE games ADD COLUMN multiplayer_max_players INTEGER NOT NULL DEFAULT 4`],
    ["multiplayer_modes", `ALTER TABLE games ADD COLUMN multiplayer_modes TEXT NOT NULL DEFAULT '["shared"]'`],
    ["multiplayer_room_policy", `ALTER TABLE games ADD COLUMN multiplayer_room_policy TEXT NOT NULL DEFAULT 'player'`],
    ["multiplayer_managed_unlimited", `ALTER TABLE games ADD COLUMN multiplayer_managed_unlimited INTEGER NOT NULL DEFAULT 0`],
    ["supported_locales", `ALTER TABLE games ADD COLUMN supported_locales TEXT NOT NULL DEFAULT '["zh-Hant"]'`],
    ["default_locale", `ALTER TABLE games ADD COLUMN default_locale TEXT NOT NULL DEFAULT 'zh-Hant'`],
  ] as const;
  const missing = additions.filter(([name]) => !columns.has(name)).map(([, sql]) => db.prepare(sql));
  if (missing.length) await db.batch(missing);
}

export async function getUploadedGames() {
  const { DB } = await getPlatformEnv();
  if (!DB) return [];
  await ensureCoreTables(DB);
  const result = await DB.prepare(`SELECT g.id, g.slug, g.title_zh, g.title_en, g.description_zh, g.category, g.tags, g.license, g.source_url, g.allow_download, g.current_release_id, p.display_name, p.handle, COALESCE((SELECT SUM(pm.plays) FROM play_metrics pm WHERE pm.game_id = g.id), 0) AS plays, COALESCE((SELECT ROUND(AVG(gr.rating), 1) FROM game_ratings gr WHERE gr.game_id = g.id), 0) AS rating_average, COALESCE((SELECT COUNT(*) FROM game_ratings gr WHERE gr.game_id = g.id), 0) AS rating_count FROM games g JOIN profiles p ON p.id = g.creator_id WHERE g.status = 'published' ORDER BY g.created_at DESC LIMIT 60`).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function getUploadedGame(slug: string) {
  const { DB } = await getPlatformEnv();
  if (!DB) return null;
  await ensureCoreTables(DB);
  return DB.prepare(`SELECT g.*, p.display_name, p.handle, r.version, r.entry_path, COALESCE((SELECT SUM(pm.plays) FROM play_metrics pm WHERE pm.game_id = g.id), 0) AS plays, COALESCE((SELECT ROUND(AVG(gr.rating), 1) FROM game_ratings gr WHERE gr.game_id = g.id), 0) AS rating_average, COALESCE((SELECT COUNT(*) FROM game_ratings gr WHERE gr.game_id = g.id), 0) AS rating_count FROM games g JOIN profiles p ON p.id = g.creator_id LEFT JOIN game_releases r ON r.id = g.current_release_id WHERE g.slug = ? AND g.status = 'published' LIMIT 1`).bind(slug).first<Record<string, unknown>>();
}

export type RatingSummary = { average: number; count: number };

export async function getRatingSummaries(gameIds: string[]) {
  const summaries = new Map<string, RatingSummary>();
  const uniqueIds = [...new Set(gameIds)].filter(Boolean).slice(0, 100);
  const { DB } = await getPlatformEnv();
  if (!DB || uniqueIds.length === 0) return summaries;
  await ensureCoreTables(DB);
  const placeholders = uniqueIds.map(() => "?").join(",");
  const result = await DB.prepare(`SELECT game_id, ROUND(AVG(rating), 1) AS rating_average, COUNT(*) AS rating_count FROM game_ratings WHERE game_id IN (${placeholders}) GROUP BY game_id`).bind(...uniqueIds).all<{ game_id: string; rating_average: number; rating_count: number }>();
  for (const row of result.results ?? []) summaries.set(row.game_id, { average: Number(row.rating_average || 0), count: Number(row.rating_count || 0) });
  return summaries;
}

export async function getCreatorGames(creatorId: string) {
  const { DB } = await getPlatformEnv();
  if (!DB) return [];
  await ensureCoreTables(DB);
  const result = await DB.prepare(`SELECT g.id, g.slug, g.title_zh, g.title_en, g.status, g.allow_download, g.cloud_saves_enabled, g.multiplayer_enabled, g.multiplayer_max_players, g.multiplayer_modes, g.multiplayer_room_policy, g.multiplayer_managed_unlimited, g.supported_locales, g.default_locale, g.updated_at, r.version, r.status AS release_status, COALESCE((SELECT SUM(pm.plays) FROM play_metrics pm WHERE pm.game_id = g.id), 0) AS plays FROM games g LEFT JOIN game_releases r ON r.id = g.current_release_id WHERE g.creator_id = ? ORDER BY g.updated_at DESC`).bind(creatorId).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function getOpenReports() {
  const { DB } = await getPlatformEnv();
  if (!DB) return [];
  await ensureCoreTables(DB);
  const result = await DB.prepare(`SELECT r.id, r.game_id, r.reason, r.details, r.status, r.created_at, g.slug, g.title_zh FROM reports r LEFT JOIN games g ON g.id = r.game_id WHERE r.status IN ('open','reviewing') ORDER BY r.created_at DESC LIMIT 100`).all<Record<string, unknown>>();
  return result.results ?? [];
}
