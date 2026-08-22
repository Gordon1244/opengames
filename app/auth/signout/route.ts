import { createClient } from "../../../lib/supabase/server";
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  const response = Response.redirect(new URL("/", request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
