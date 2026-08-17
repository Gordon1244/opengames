import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/dashboard";
  if (code) { const supabase = await createClient(); const { error } = await supabase!.auth.exchangeCodeForSession(code); if (!error) return Response.redirect(new URL(next, url.origin), 303); }
  return Response.redirect(new URL("/login?error=callback", url.origin), 303);
}
