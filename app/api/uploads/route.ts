import { getCurrentUser } from "../../../lib/auth";
import { ensureCoreTables, getPlatformEnv } from "../../../lib/platform";
import { scanAndExtractZip, storeRelease } from "../../../lib/upload";

function clean(value: FormDataEntryValue | null, max = 300) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `game-${crypto.randomUUID().slice(0, 8)}`; }
const categories = new Set(["動作", "冒險", "益智", "策略", "休閒", "其他"]);
const licenses = new Set(["All rights reserved", "MIT", "GPL-3.0", "Apache-2.0", "CC BY 4.0", "CC BY-NC 4.0"]);

function optionalHttpUrl(value: FormDataEntryValue | null) {
  const input = clean(value, 300);
  if (!input) return null;
  const url = new URL(input);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("原始碼網址只接受 http 或 https。");
  return url.toString();
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入並驗證 Email。" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("package");
  const titleZh = clean(form.get("titleZh"), 80);
  const titleEn = clean(form.get("titleEn"), 80);
  const descriptionZh = clean(form.get("descriptionZh"), 1600);
  const descriptionEn = clean(form.get("descriptionEn"), 1600);
  const creatorName = clean(form.get("creatorName"), 60);
  const category = clean(form.get("category"), 40);
  const license = clean(form.get("license"), 80);
  const version = clean(form.get("version"), 20);
  if (!(file instanceof File) || !titleZh || !titleEn || !descriptionZh || !descriptionEn || !creatorName) return Response.json({ error: "請完整填寫作品名稱、介紹、創作者與 ZIP 套件。" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".zip")) return Response.json({ error: "只接受 .zip 套件。" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return Response.json({ error: "ZIP 超過 50 MiB 上限。" }, { status: 413 });
  if (!categories.has(category) || !licenses.has(license)) return Response.json({ error: "類別或授權選項無效。" }, { status: 400 });
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{0,19}$/.test(version)) return Response.json({ error: "版本格式無效。" }, { status: 400 });
  if (form.get("rightsConfirmed") !== "yes") return Response.json({ error: "發布前必須確認擁有作品權利。" }, { status: 400 });
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
    let slug = slugify(titleEn || titleZh);
    if (await DB.prepare(`SELECT 1 FROM games WHERE slug = ?`).bind(slug).first()) slug += `-${gameId.slice(0, 6)}`;
    const sourceUrl = optionalHttpUrl(form.get("sourceUrl"));
    const handleBase = `creator-${user.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
    await DB.batch([
      DB.prepare(`INSERT INTO profiles (id,email,handle,display_name,role,status) VALUES (?,?,?,?,?,'active') ON CONFLICT(id) DO UPDATE SET email=excluded.email, display_name=excluded.display_name, role=excluded.role, updated_at=CURRENT_TIMESTAMP`).bind(user.id, user.email, handleBase, creatorName, user.role),
      DB.prepare(`INSERT INTO games (id,slug,creator_id,title_zh,title_en,description_zh,description_en,category,tags,license,source_url,allow_download,status,current_release_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'hidden',NULL)`).bind(gameId, slug, user.id, titleZh, titleEn, descriptionZh, descriptionEn, category, JSON.stringify(clean(form.get("tags"), 180).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8)), license, sourceUrl, form.get("allowDownload") === "on" ? 1 : 0),
      DB.prepare(`INSERT INTO game_releases (id,game_id,version,archive_key,entry_path,checksum,status,scan_report) VALUES (?,?,?,?,?,?, 'scanning',?)`).bind(releaseId, gameId, version, `archives/${releaseId}.zip`, "index.html", scan.checksum, JSON.stringify({ fileCount: scan.fileCount, expandedBytes: scan.expandedBytes, runtime: scan.runtime, warnings: scan.warnings, checks: ["path", "type", "size", "entry", "runtime"] })),
    ]);
    try {
      await storeRelease(GAMES, releaseId, buffer, scan.files);
    } catch (storageError) {
      await DB.batch([
        DB.prepare(`UPDATE game_releases SET status = 'rejected', scan_report = ? WHERE id = ?`).bind(JSON.stringify({ error: "storage_failed" }), releaseId),
        DB.prepare(`UPDATE games SET status = 'removed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(gameId),
      ]);
      throw storageError;
    }
    await DB.batch([
      DB.prepare(`UPDATE game_releases SET status = 'published' WHERE id = ?`).bind(releaseId),
      DB.prepare(`UPDATE games SET status = 'published', current_release_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(releaseId, gameId),
    ]);
    return Response.json({ game: { id: gameId, slug, releaseId }, scan: { fileCount: scan.fileCount, expandedBytes: scan.expandedBytes, runtime: scan.runtime, warnings: scan.warnings } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "上傳失敗。" }, { status: 400 });
  }
}
