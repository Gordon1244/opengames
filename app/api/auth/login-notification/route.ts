import { sendLoginNotification } from "../../../../lib/login-notifications";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "無效的通知要求。" }, { status: 403, headers: noStoreHeaders });
  }
  const result = await sendLoginNotification(request);
  if (result === "unauthorized") return Response.json({ error: "登入已失效。" }, { status: 401, headers: noStoreHeaders });
  if (result === "mfa_required") return Response.json({ error: "請先完成二步驟驗證。" }, { status: 403, headers: noStoreHeaders });
  if (result === "not_configured" || result === "unavailable" || result === "failed") {
    return Response.json({ ok: false }, { status: 503, headers: noStoreHeaders });
  }
  return Response.json({ ok: true }, { headers: noStoreHeaders });
}
