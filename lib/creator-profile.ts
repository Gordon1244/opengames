export type CreatorProfile = {
  id: string;
  handle: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  websiteUrl: string;
  skills: string[];
  isPublic: boolean;
  createdAt: string;
};

const reservedHandles = new Set([
  "account", "admin", "api", "auth", "convert", "creators", "dashboard", "games",
  "guides", "login", "opengames", "privacy", "support", "upload",
]);

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function parseSkills(value: unknown) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(raw.map((item) => text(item, 24)).filter(Boolean))].slice(0, 8);
}

export function parseCreatorProfileInput(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("PROFILE_INVALID");
  const input = value as Record<string, unknown>;
  const displayName = text(input.displayName, 60);
  const handle = text(input.handle, 30).toLowerCase();
  const headline = text(input.headline, 80);
  const bio = typeof input.bio === "string" ? input.bio.trim().replace(/\r\n?/g, "\n").slice(0, 500) : "";
  const location = text(input.location, 80);
  const skills = parseSkills(input.skills);
  if (displayName.length < 2) throw new Error("DISPLAY_NAME_INVALID");
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/.test(handle) || reservedHandles.has(handle)) throw new Error("HANDLE_INVALID");

  let websiteUrl = "";
  const website = text(input.websiteUrl, 300);
  if (website) {
    const url = new URL(website);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("WEBSITE_INVALID");
    websiteUrl = url.toString().replace(/\/$/, "");
  }
  return { displayName, handle, headline, bio, location, websiteUrl, skills, isPublic: input.isPublic !== false };
}

export function profileFromRow(row: Record<string, unknown>): CreatorProfile {
  let skills: string[] = [];
  try { skills = parseSkills(JSON.parse(String(row.skills || "[]"))); } catch { skills = []; }
  return {
    id: String(row.id || ""),
    handle: String(row.handle || ""),
    displayName: String(row.display_name || ""),
    headline: String(row.headline || ""),
    bio: String(row.bio || ""),
    location: String(row.location || ""),
    websiteUrl: String(row.website_url || ""),
    skills,
    isPublic: Boolean(row.is_public),
    createdAt: String(row.created_at || ""),
  };
}
