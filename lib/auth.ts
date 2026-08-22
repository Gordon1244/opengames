import { createClient } from "./supabase/server";
export type OpenGamesUser = { id: string; email: string; role: "creator" | "admin" };
export async function getCurrentUser(): Promise<OpenGamesUser | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    const authUser = data.user;
    if (error || !authUser?.id || !authUser.email || !authUser.email_confirmed_at) return null;
    const email = authUser.email;
    const admins = (process.env.OPENGAMES_ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    return { id: authUser.id, email, role: admins.includes(email.toLowerCase()) ? "admin" : "creator" };
  } catch { return null; }
}
