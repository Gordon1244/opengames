import { getCurrentUser } from "../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../lib/platform";
import { scanAndExtractZip, storeRelease } from "../../../lib/upload";

function clean(value: FormDataEntryValue | null, max = 300) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `game-${crypto.randomUUID().slice(0, 8)}`; }

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入並驗證 Email。" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("package");
  const titleZh = clean(form.get("titleZh"), 80);
  if (!(file instanceof File) || !titleZh) return Response.json({ error: "需要遊戲名稱與 ZIP 套件。" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".zip")) return Response.json({ error: "只接受 .zip 套件。" }, { status: 400 });
  const { DB, GAMES } = await getPlatformEnv();
  if (!DB || !GAMES) return Response.json({ error: "平台儲存空間尚未就緒。" }, { status: 503 });
  try {
    await ensureCoreTables(DB);
    const today = new Date().toISOString().slice(0, 10);
    const count = await DB.prepare(`SELECT COUNT(*) AS count FROM game_releases r JOIN games g ON g.id = r.game_id WHERE g.creator_id = ? AND r.created_at >= ?`).bind(user.id, `${today} 00:00:00`).first<{ count: number }>();
    if ((count?.count ?? 0) >= 3) return Response.json({ error: "今日已達三個版本的安全上限。" }, { status: 429 });
    const buffer = await file.arrayBuffer();
    const scan = await scanAndExtractZip(buffer);
    const gameId = crypto.randomUUID();
    const releaseId = crypto.randomUUID();
    let slug = slugify(clean(form.get("titleEn"), 80) || titleZh);
    if (await DB.prepare(`SELECT 1 FROM games WHERE slug = ?`).bind(slug).first()) slug += `-${gameId.slice(0, 6)}`;
    await storeRelease(GAMES, releaseId, buffer, scan.files);
    const handleBase = user.email.split("@")[0]?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || `creator-${user.id.slice(0, 6)}`;
    await DB.batch([
      DB.prepare(`INSERT INTO profiles (id,email,handle,display_name,role,status) VALUES (?,?,?,?,?,'active') ON CONFLICT(id) DO UPDATE SET email=excluded.email, updated_at=CURRENT_TIMESTAMP`).bind(user.id, user.email, `${handleBase}-${user.id.slice(0, 4)}`, clean(form.get("creatorName"), 60) || handleBase, user.role),
      DB.prepare(`INSERT INTO games (id,slug,creator_id,title_zh,title_en,description_zh,description_en,category,tags,license,source_url,allow_download,status,current_release_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'published',?)`).bind(gameId, slug, user.id, titleZh, clean(form.get("titleEn"), 80) || titleZh, clean(form.get("descriptionZh"), 1600), clean(form.get("descriptionEn"), 1600), clean(form.get("category"), 40) || "其他", JSON.stringify(clean(form.get("tags"), 180).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8)), clean(form.get("license"), 80) || "All rights reserved", clean(form.get("sourceUrl"), 300) || null, form.get("allowDownload") === "on" ? 1 : 0, releaseId),
      DB.prepare(`INSERT INTO game_releases (id,game_id,version,archive_key,entry_path,checksum,status,scan_report) VALUES (?,?,?,?,?,?, 'published',?)`).bind(releaseId, gameId, clean(form.get("version"), 20) || "1.0.0", `archives/${releaseId}.zip`, "index.html", scan.checksum, JSON.stringify({ fileCount: scan.fileCount, expandedBytes: scan.expandedBytes, checks: ["path", "type", "size", "entry"] })),
    ]);
    return Response.json({ game: { id: gameId, slug, releaseId }, scan: { fileCount: scan.fileCount, expandedBytes: scan.expandedBytes } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "上傳失敗。" }, { status: 400 });
  }
}
