import { createClient } from "../../../lib/supabase/server";
import { sendLoginNotification } from "../../../lib/login-notifications";

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/dashboard";
  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
          return noStoreRedirect(new URL(`/account/security?challenge=1&notify=1&next=${encodeURIComponent(next)}`, url.origin));
        }
        await sendLoginNotification(request);
        return noStoreRedirect(new URL(next, url.origin));
      }
    }
  }
  return noStoreRedirect(new URL("/login?error=callback", url.origin));
}

function noStoreRedirect(url: URL) {
  const response = Response.redirect(url, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
