import { createClient } from "../../../lib/supabase/server";
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    // A stale or already-cleared session must not turn logout into a 500 page.
  }

  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "private, no-store",
      Location: new URL("/", request.url).toString(),
    },
  });
}
