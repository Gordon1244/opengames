type PlatformEnv = { DB?: D1Database; GAMES?: R2Bucket };

export async function getPlatformEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as PlatformEnv;
}

export async function ensureCoreTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, handle TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'creator', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, creator_id TEXT NOT NULL, title_zh TEXT NOT NULL, title_en TEXT NOT NULL, description_zh TEXT NOT NULL, description_en TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', cover_key TEXT, license TEXT NOT NULL DEFAULT 'All rights reserved', source_url TEXT, allow_download INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'published', current_release_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS game_releases (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, version TEXT NOT NULL, archive_key TEXT NOT NULL, entry_path TEXT NOT NULL DEFAULT 'index.html', checksum TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'scanning', scan_report TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, reporter_id TEXT, reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS play_metrics (game_id TEXT NOT NULL, day TEXT NOT NULL, plays INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (game_id, day))`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_games_status_created ON games(status, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_games_creator ON games(creator_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at)`),
  ]);
}

export async function getUploadedGames() {
  const { DB } = await getPlatformEnv();
  if (!DB) return [];
  await ensureCoreTables(DB);
  const result = await DB.prepare(`SELECT g.id, g.slug, g.title_zh, g.title_en, g.description_zh, g.category, g.tags, g.license, g.source_url, g.allow_download, g.current_release_id, p.display_name, p.handle FROM games g JOIN profiles p ON p.id = g.creator_id WHERE g.status = 'published' ORDER BY g.created_at DESC LIMIT 60`).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function getUploadedGame(slug: string) {
  const { DB } = await getPlatformEnv();
  if (!DB) return null;
  await ensureCoreTables(DB);
  return DB.prepare(`SELECT g.*, p.display_name, p.handle, r.version, r.entry_path FROM games g JOIN profiles p ON p.id = g.creator_id LEFT JOIN game_releases r ON r.id = g.current_release_id WHERE g.slug = ? AND g.status = 'published' LIMIT 1`).bind(slug).first<Record<string, unknown>>();
}

export async function getCreatorGames(creatorId: string) {
  const { DB } = await getPlatformEnv();
  if (!DB) return [];
  await ensureCoreTables(DB);
  const result = await DB.prepare(`SELECT g.id, g.slug, g.title_zh, g.status, g.updated_at, r.version, r.status AS release_status FROM games g LEFT JOIN game_releases r ON r.id = g.current_release_id WHERE g.creator_id = ? ORDER BY g.updated_at DESC`).bind(creatorId).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function getOpenReports() {
  const { DB } = await getPlatformEnv();
  if (!DB) return [];
  await ensureCoreTables(DB);
  const result = await DB.prepare(`SELECT r.id, r.game_id, r.reason, r.details, r.status, r.created_at, g.slug, g.title_zh FROM reports r LEFT JOIN games g ON g.id = r.game_id WHERE r.status IN ('open','reviewing') ORDER BY r.created_at DESC LIMIT 100`).all<Record<string, unknown>>();
  return result.results ?? [];
}
