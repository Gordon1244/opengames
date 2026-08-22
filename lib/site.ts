export const DEFAULT_SITE_ORIGIN = "https://opengames-arcade.momognchou.chatgpt.site";

export function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return DEFAULT_SITE_ORIGIN;

  try {
    const url = new URL(configured);
    return url.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}
