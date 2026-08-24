import type { Locale } from "./i18n";

export type Game = {
  id: string; slug: string; title: string; titleEn: string; creator: string; creatorHandle: string; creatorId?: string; creatorProfilePublic?: boolean;
  description: string; category: string; tags: string[]; plays: number; badge: string; ratingAverage: number; ratingCount: number;
  art: "tide" | "orbit" | "garden" | "void"; license: string; allowDownload: boolean;
  sourceUrl?: string; version: string; playUrl: string; releaseId?: string;
  descriptionEn?: string; categoryEn?: string; tagsEn?: string[]; badgeEn?: string;
  cloudSavesEnabled?: boolean; multiplayerEnabled?: boolean; multiplayerMaxPlayers?: number;
  multiplayerModes?: string[];
  multiplayerRoomPolicy?: "player" | "creator" | "global" | "hybrid"; multiplayerManagedUnlimited?: boolean;
  supportedLocales?: string[]; defaultLocale?: string;
};

export const demoGames: Game[] = [
  { id: "demo-void-runner", slug: "void-runner", title: "Void Runner", titleEn: "Void Runner", creator: "OpenGames Lab", creatorHandle: "opengames", description: "穿越無盡星門，在速度與節奏之間找到唯一安全的路線。支援鍵盤與觸控。", descriptionEn: "Race through endless stargates and find the only safe line between speed and rhythm. Supports keyboard and touch.", category: "動作", categoryEn: "Action", tags: ["街機", "太空", "單人"], tagsEn: ["Arcade", "Space", "Single-player"], plays: 8241, badge: "本週精選", badgeEn: "Pick of the week", art: "void", license: "MIT", allowDownload: true, sourceUrl: "https://github.com/Gordon1244/opengames", version: "1.0.0", playUrl: "/demo/void-runner/index.html", ratingAverage: 0, ratingCount: 0 },
  { id: "demo-neon-tideline", slug: "neon-tideline", title: "Neon Tideline", titleEn: "Neon Tideline", creator: "Morrow Studio", creatorHandle: "morrow", description: "跟著潮汐脈動，在變形的色彩海岸收集散落的訊號。", descriptionEn: "Follow the pulse of the tide and collect scattered signals along a shifting coast of color.", category: "冒險", categoryEn: "Adventure", tags: ["節奏", "氛圍", "短篇"], tagsEn: ["Rhythm", "Atmospheric", "Short"], plays: 6214, badge: "編輯精選", badgeEn: "Editor's pick", art: "tide", license: "CC BY-NC 4.0", allowDownload: false, version: "0.9.2", playUrl: "/demo/neon-tideline/index.html", ratingAverage: 0, ratingCount: 0 },
  { id: "demo-orbital-common", slug: "orbital-common", title: "Orbital Common", titleEn: "Orbital Common", creator: "Ada & Finch", creatorHandle: "ada-finch", description: "在微型星系裡配置軌道，讓每一顆行星都找到共存的位置。", descriptionEn: "Arrange orbits in a miniature galaxy so every planet can find a place to coexist.", category: "策略", categoryEn: "Strategy", tags: ["益智", "太空", "開源"], tagsEn: ["Puzzle", "Space", "Open source"], plays: 4832, badge: "開放原始碼", badgeEn: "Open source", art: "orbit", license: "MIT", allowDownload: true, sourceUrl: "https://github.com/Gordon1244/opengames", version: "1.2.0", playUrl: "/demo/orbital-common/index.html", ratingAverage: 0, ratingCount: 0 },
  { id: "demo-moon-garden", slug: "moon-garden", title: "Moon Garden", titleEn: "Moon Garden", creator: "Soft Relay", creatorHandle: "soft-relay", description: "在月光落下以前，照料一座只在夜晚生長的小花園。", descriptionEn: "Tend a tiny garden that grows only at night before the moonlight fades.", category: "休閒", categoryEn: "Casual", tags: ["療癒", "模擬", "短篇"], tagsEn: ["Cozy", "Simulation", "Short"], plays: 3941, badge: "新作", badgeEn: "New", art: "garden", license: "All rights reserved", allowDownload: false, version: "1.0.1", playUrl: "/demo/moon-garden/index.html", ratingAverage: 0, ratingCount: 0 },
];

export function localizeGame(game: Game, locale: Locale): Game {
  if (locale !== "en") return game;
  return { ...game, title: game.titleEn || game.title, description: game.descriptionEn || game.description, category: game.categoryEn || game.category, tags: game.tagsEn || game.tags, badge: game.badgeEn || game.badge };
}

export function findDemoGame(slug: string) { return demoGames.find((game) => game.slug === slug); }
export function findDemoGameById(id: string) { return demoGames.find((game) => game.id === id); }

export function recommendationScore(game: Pick<Game, "ratingAverage" | "ratingCount" | "plays">) {
  const priorMean = 3.5;
  const minimumVotes = 5;
  const weightedRating = ((game.ratingAverage * game.ratingCount) + (priorMean * minimumVotes)) / (game.ratingCount + minimumVotes);
  return weightedRating + Math.log10(Math.max(1, game.plays)) * 0.005;
}

export function sortRecommendedGames(games: Game[]) {
  return [...games].sort((a, b) => recommendationScore(b) - recommendationScore(a) || b.ratingCount - a.ratingCount || b.plays - a.plays);
}

export function uploadedRowToGame(row: Record<string, unknown>, locale: Locale = "zh-Hant"): Game {
  const releaseId = String(row.current_release_id || "");
  const entryPath = String(row.entry_path || "index.html");
  return {
    id: String(row.id), slug: String(row.slug), title: String(locale === "en" ? row.title_en || row.title_zh : row.title_zh), titleEn: String(row.title_en), creator: String(row.display_name), creatorHandle: String(row.handle), creatorId: String(row.creator_id || ""), creatorProfilePublic: Boolean(row.is_public),
    description: String(locale === "en" ? row.description_en || row.description_zh : row.description_zh), category: locale === "en" ? categoryEnglish(String(row.category)) : String(row.category), tags: parseTags(row.tags), plays: Number(row.plays || 0), badge: locale === "en" ? "Community release" : "社群新作", art: "void",
    license: String(row.license), allowDownload: Boolean(row.allow_download), sourceUrl: row.source_url ? String(row.source_url) : undefined, version: String(row.version || "1.0.0"),
    releaseId: releaseId || undefined, playUrl: `/api/play/${releaseId}/${entryPath}`, ratingAverage: Number(row.rating_average || 0), ratingCount: Number(row.rating_count || 0),
    cloudSavesEnabled: Boolean(row.cloud_saves_enabled), multiplayerEnabled: Boolean(row.multiplayer_enabled), multiplayerMaxPlayers: Math.min(8, Math.max(2, Number(row.multiplayer_max_players || 4))),
    multiplayerModes: parseMultiplayerModes(row.multiplayer_modes),
    multiplayerRoomPolicy: (["player", "creator", "global", "hybrid"].includes(String(row.multiplayer_room_policy)) ? String(row.multiplayer_room_policy) : "player") as Game["multiplayerRoomPolicy"], multiplayerManagedUnlimited: Boolean(row.multiplayer_managed_unlimited),
    supportedLocales: parseSupportedLocales(row.supported_locales), defaultLocale: String(row.default_locale || "zh-Hant"),
  };
}

export function parseSupportedLocales(value: unknown): string[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return ["zh-Hant"];
    const locales = parsed.filter((item): item is string => typeof item === "string" && /^[a-z]{2,3}(?:-[A-Za-z]{2,8}){0,2}$/.test(item)).slice(0, 8);
    return locales.length ? [...new Set(locales)] : ["zh-Hant"];
  } catch { return ["zh-Hant"]; }
}

export function parseMultiplayerModes(value: unknown): string[] {
  const allowed = new Set(["shared", "co-op", "versus", "teams"]);
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return ["shared"];
    const modes = parsed.filter((item): item is string => typeof item === "string" && allowed.has(item));
    return modes.length ? [...new Set(modes)] : ["shared"];
  } catch { return ["shared"]; }
}

export function categoryEnglish(category: string) {
  return ({ "動作": "Action", "冒險": "Adventure", "益智": "Puzzle", "策略": "Strategy", "休閒": "Casual", "其他": "Other" } as Record<string, string>)[category] ?? category;
}

export function parseTags(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}
