export function safeInternalPath(value: unknown, fallback = "/") {
  const path = typeof value === "string" ? value : String(value ?? "");
  const hasUnsafeCharacter = [...path].some((character) => {
    const code = character.charCodeAt(0);
    return character === "\\" || code <= 0x1f || code === 0x7f;
  });
  return path.startsWith("/") && !path.startsWith("//") && !hasUnsafeCharacter ? path : fallback;
}
