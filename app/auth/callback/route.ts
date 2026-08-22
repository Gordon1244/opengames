import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/dashboard";
  if (code) { const supabase = await createClient(); if (supabase) { const { error } = await supabase.auth.exchangeCodeForSession(code); if (!error) return noStoreRedirect(new URL(next, url.origin)); } }
  return noStoreRedirect(new URL("/login?error=callback", url.origin));
}

function noStoreRedirect(url: URL) {
  const response = Response.redirect(url, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
