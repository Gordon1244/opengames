import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "../../../../lib/auth";

type ReauthPayload =
  | { method: "password"; password?: string; captchaToken?: string }
  | { method: "passkey" | "totp"; accessToken?: string };

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function recentAuthenticationMethod(
  methods: Array<string | { method?: string; timestamp?: number }>,
  accepted: Set<string>,
  issuedAt?: number,
) {
  const now = Math.floor(Date.now() / 1000);
  return methods.some((entry) => {
    if (typeof entry === "string") return accepted.has(entry) && Boolean(issuedAt && now - issuedAt <= 120);
    return Boolean(
      entry.method &&
      accepted.has(entry.method) &&
      entry.timestamp &&
      entry.timestamp <= now + 30 &&
      now - entry.timestamp <= 120,
    );
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "無效的驗證要求。" }, { status: 403, headers: noStoreHeaders });
  }

  const currentUser = await getCurrentUser({ requireMfa: false });
  if (!currentUser) return Response.json({ error: "登入已失效，請重新登入。" }, { status: 401, headers: noStoreHeaders });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: "登入服務尚未設定。" }, { status: 503, headers: noStoreHeaders });

  const payload = await request.json().catch(() => null) as ReauthPayload | null;
  if (!payload || !["password", "passkey", "totp"].includes(payload.method)) {
    return Response.json({ error: "請選擇驗證方式。" }, { status: 400, headers: noStoreHeaders });
  }

  const verifier = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  if (payload.method === "password") {
    if (typeof payload.password !== "string" || payload.password.length < 1 || payload.password.length > 1024) {
      return Response.json({ error: "請輸入目前密碼。" }, { status: 400, headers: noStoreHeaders });
    }
    if (typeof payload.captchaToken !== "string" || payload.captchaToken.length < 1 || payload.captchaToken.length > 4096) {
      return Response.json({ error: "請先完成 Cloudflare 安全驗證。" }, { status: 400, headers: noStoreHeaders });
    }
    const { data, error } = await verifier.auth.signInWithPassword({
      email: currentUser.email,
      password: payload.password,
      options: { captchaToken: payload.captchaToken },
    });
    const verified = !error && data.user?.id === currentUser.id;
    if (data.session) await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
    return verified
      ? Response.json({ ok: true }, { headers: noStoreHeaders })
      : Response.json({ error: "密碼或 Cloudflare 安全驗證未通過，請再試一次。" }, { status: 401, headers: noStoreHeaders });
  }

  if (typeof payload.accessToken !== "string" || payload.accessToken.length > 12_000) {
    return Response.json({ error: "驗證憑證無效。" }, { status: 400, headers: noStoreHeaders });
  }

  const [{ data: userData, error: userError }, claimsResult, aalResult] = await Promise.all([
    verifier.auth.getUser(payload.accessToken),
    verifier.auth.getClaims(payload.accessToken),
    verifier.auth.mfa.getAuthenticatorAssuranceLevel(payload.accessToken),
  ]);
  const claims = claimsResult.data?.claims;
  const methods = (claims?.amr ?? []) as Array<string | { method?: string; timestamp?: number }>;
  const accepted = payload.method === "passkey"
    ? new Set(["webauthn", "passkey", "mfa/webauthn"])
    : new Set(["totp", "mfa/totp"]);
  const methodIsRecent = recentAuthenticationMethod(methods, accepted, claims?.iat);
  const aalIsValid = payload.method !== "totp" || aalResult.data?.currentLevel === "aal2";
  const verified = !userError && !claimsResult.error && !aalResult.error &&
    userData.user?.id === currentUser.id && claims?.sub === currentUser.id && methodIsRecent && aalIsValid;

  return verified
    ? Response.json({ ok: true }, { headers: noStoreHeaders })
    : Response.json({ error: "無法確認這次登入，請重新操作。" }, { status: 401, headers: noStoreHeaders });
}
