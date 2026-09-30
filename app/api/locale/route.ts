import { NextResponse } from "next/server";
import { localeCookie, normalizeLocale } from "../../../lib/i18n";
import { safeInternalPath } from "../../../lib/navigation";

export async function POST(request: Request) {
  const form = await request.formData();
  const locale = normalizeLocale(String(form.get("locale") ?? ""));
  const response = NextResponse.redirect(new URL(safeInternalPath(form.get("next")), request.url), 303);
  response.cookies.set(localeCookie, locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
