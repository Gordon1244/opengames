import { createClient } from "./supabase/server";
export type OpenGamesUser = { id: string; email: string; role: "creator" | "admin" };
export async function getCurrentUser(): Promise<OpenGamesUser | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    const email = typeof claims.email === "string" ? claims.email : "";
    const admins = (process.env.OPENGAMES_ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    return { id: claims.sub, email, role: admins.includes(email.toLowerCase()) ? "admin" : "creator" };
  } catch { return null; }
}
