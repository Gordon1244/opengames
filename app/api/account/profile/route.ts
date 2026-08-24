import { getCurrentUser } from "../../../../lib/auth";
import { parseCreatorProfileInput } from "../../../../lib/creator-profile";
import { ensureCoreTables, ensureCreatorProfile, getPlatformEnv } from "../../../../lib/platform";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function message(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "DISPLAY_NAME_INVALID") return "顯示名稱需為 2 至 60 個字元。";
  if (code === "HANDLE_INVALID") return "公開代號需為 3 至 30 個小寫英數字，可使用連字號或底線，且不可使用保留名稱。";
  if (code === "WEBSITE_INVALID") return "個人網站必須是有效的 http 或 https 網址。";
  return "個人檔案內容無效。";
}

export async function PUT(request: Request) {
  if (!sameOrigin(request) || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "無效的更新要求。" }, { status: 403, headers: noStoreHeaders });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401, headers: noStoreHeaders });
  const payload = await request.json().catch(() => null);
  let profile;
  try { profile = parseCreatorProfileInput(payload); }
  catch (error) { return Response.json({ error: message(error) }, { status: 400, headers: noStoreHeaders }); }

  const { DB } = await getPlatformEnv();
  if (!DB) return Response.json({ error: "個人檔案服務尚未就緒。" }, { status: 503, headers: noStoreHeaders });
  await ensureCoreTables(DB);
  await ensureCreatorProfile(user);
  try {
    await DB.prepare(`UPDATE profiles SET handle=?, display_name=?, headline=?, bio=?, location=?, website_url=?, skills=?, is_public=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(
      profile.handle, profile.displayName, profile.headline, profile.bio, profile.location,
      profile.websiteUrl, JSON.stringify(profile.skills), profile.isPublic ? 1 : 0, user.id,
    ).run();
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: profiles\.handle/i.test(error.message)) {
      return Response.json({ error: "這個公開代號已有人使用，請換一個。" }, { status: 409, headers: noStoreHeaders });
    }
    return Response.json({ error: "暫時無法儲存個人檔案。" }, { status: 500, headers: noStoreHeaders });
  }
  return Response.json({ ok: true, profile }, { headers: noStoreHeaders });
}
