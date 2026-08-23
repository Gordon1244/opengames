import { getPlatformEnv, ensureCoreTables } from "./platform";
import { getSiteOrigin } from "./site";
import { createClient } from "./supabase/server";

export type LoginNotificationResult =
  | "sent"
  | "duplicate"
  | "not_configured"
  | "unauthorized"
  | "mfa_required"
  | "unavailable"
  | "failed";

type AmrEntry = string | { method?: string; timestamp?: number };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function methodLabels(entries: AmrEntry[]) {
  const labels = new Set<string>();
  for (const entry of entries) {
    const method = typeof entry === "string" ? entry : entry.method;
    if (!method) continue;
    if (["webauthn", "passkey", "mfa/webauthn"].includes(method)) labels.add("密碼金鑰");
    else if (["mfa/totp", "totp"].includes(method)) labels.add("驗證器二步驟驗證");
    else if (method === "password") labels.add("密碼");
    else if (["magiclink", "otp", "email"].includes(method)) labels.add("Email 驗證連結");
    else if (["oauth", "sso/saml"].includes(method)) labels.add("外部登入服務");
  }
  return [...labels].join("＋") || "OpenGames 登入";
}

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "未知裝置";
  const browser = /Edg\//.test(userAgent) ? "Microsoft Edge"
    : /Chrome\//.test(userAgent) ? "Google Chrome"
      : /Firefox\//.test(userAgent) ? "Firefox"
        : /Safari\//.test(userAgent) ? "Safari" : "網頁瀏覽器";
  const system = /Windows/.test(userAgent) ? "Windows"
    : /Android/.test(userAgent) ? "Android"
      : /iPhone|iPad/.test(userAgent) ? "iPhone／iPad"
        : /Mac OS X/.test(userAgent) ? "macOS"
          : /Linux/.test(userAgent) ? "Linux" : "未知系統";
  return `${browser} · ${system}`;
}

function buildEmail(method: string, device: string, occurredAt: string) {
  const securityUrl = `${getSiteOrigin()}/account/security`;
  const safeMethod = escapeHtml(method);
  const safeDevice = escapeHtml(device);
  const safeTime = escapeHtml(occurredAt);
  const safeUrl = escapeHtml(securityUrl);
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OpenGames 登入安全通知</title></head><body style="margin:0;background:#f2f0e9;color:#11130f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif"><div style="display:none;max-height:0;overflow:hidden">你的 OpenGames 創作者帳號剛剛完成登入。</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0e9"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #d8d5cb;border-radius:14px;overflow:hidden"><tr><td style="height:8px;background:#d6ff45"></td></tr><tr><td style="padding:34px 38px 18px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:42px;height:42px;border-radius:10px;background:#11130f;color:#d6ff45;text-align:center;font-size:24px">◉</td><td style="padding-left:13px"><strong style="font-size:20px;letter-spacing:-.03em">OpenGames</strong><div style="margin-top:3px;color:#ef725f;font:10px monospace;letter-spacing:.14em">SECURITY NOTICE</div></td></tr></table><h1 style="margin:34px 0 12px;font-size:34px;line-height:1.12;letter-spacing:-.045em">你的帳號剛剛登入</h1><p style="margin:0;color:#65675f;font-size:14px;line-height:1.8">這是 OpenGames 創作者帳號的自動安全通知。如果是你本人，無須進行任何操作。</p></td></tr><tr><td style="padding:10px 38px 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ed;border-radius:10px"><tr><td style="padding:18px 20px;border-bottom:1px solid #dedbd1;color:#777970;font-size:12px">登入時間</td><td align="right" style="padding:18px 20px;border-bottom:1px solid #dedbd1;font-size:13px;font-weight:700">${safeTime}</td></tr><tr><td style="padding:18px 20px;border-bottom:1px solid #dedbd1;color:#777970;font-size:12px">登入方式</td><td align="right" style="padding:18px 20px;border-bottom:1px solid #dedbd1;font-size:13px;font-weight:700">${safeMethod}</td></tr><tr><td style="padding:18px 20px;color:#777970;font-size:12px">裝置</td><td align="right" style="padding:18px 20px;font-size:13px;font-weight:700">${safeDevice}</td></tr></table></td></tr><tr><td style="padding:0 38px 34px"><div style="padding:18px 20px;background:#fff0ed;border-left:4px solid #ef725f;border-radius:6px"><strong style="display:block;font-size:14px">不是你登入的？</strong><p style="margin:7px 0 14px;color:#6c504b;font-size:12px;line-height:1.65">請立即前往帳號安全，變更密碼、檢查密碼金鑰並啟用驗證器。</p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:5px;background:#11130f;color:#fff;text-decoration:none;font-size:13px;font-weight:700">檢查帳號安全 →</a></div><p style="margin:24px 0 0;color:#8a8b84;font-size:10px;line-height:1.7">為保護隱私，本通知不收集或顯示完整 IP 位址。這是必要的安全通知，不是行銷郵件。</p></td></tr></table></td></tr></table></body></html>`;
  const text = `OpenGames 登入安全通知\n\n你的創作者帳號剛剛完成登入。\n登入時間：${occurredAt}\n登入方式：${method}\n裝置：${device}\n\n如果不是你本人，請立即前往帳號安全：${securityUrl}\n\n為保護隱私，本通知不收集或顯示完整 IP 位址。`;
  return { html, text };
}

export async function sendLoginNotification(request: Request): Promise<LoginNotificationResult> {
  const supabase = await createClient();
  if (!supabase) return "unavailable";
  const [{ data: userData, error: userError }, claimsResult, aalResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const user = userData.user;
  const claims = claimsResult.data?.claims;
  if (userError || claimsResult.error || !user?.id || !user.email || !user.email_confirmed_at || claims?.sub !== user.id) return "unauthorized";
  if (aalResult.data?.nextLevel === "aal2" && aalResult.data.currentLevel !== "aal2") return "mfa_required";

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN?.trim();
  const from = process.env.LOGIN_ALERT_FROM_EMAIL?.trim();
  if (!accountId || !apiToken || !from) return "not_configured";

  const sessionId = typeof claims.session_id === "string" ? claims.session_id : "";
  if (!sessionId || sessionId.length > 100) return "unauthorized";
  const methods = (claims.amr ?? []) as AmrEntry[];
  const method = methodLabels(methods);
  const { DB } = await getPlatformEnv();
  if (!DB) return "unavailable";
  await ensureCoreTables(DB);
  const insert = await DB.prepare(`INSERT OR IGNORE INTO login_notifications (session_id,user_id,method,status) VALUES (?,?,?,'sending')`).bind(sessionId, user.id, method).run();
  if ((insert.meta.changes ?? 0) === 0) return "duplicate";

  const occurredAt = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "long", timeStyle: "medium", hour12: false }).format(new Date());
  const device = deviceLabel(request.headers.get("user-agent"));
  const email = buildEmail(method, device, occurredAt);
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { address: from, name: "OpenGames Security" },
        to: [user.email],
        subject: "OpenGames｜你的帳號剛剛登入",
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("email_provider_rejected");
    await DB.prepare(`UPDATE login_notifications SET status='sent', sent_at=CURRENT_TIMESTAMP WHERE session_id=?`).bind(sessionId).run();
    return "sent";
  } catch {
    await DB.prepare(`DELETE FROM login_notifications WHERE session_id=? AND status='sending'`).bind(sessionId).run();
    return "failed";
  }
}
