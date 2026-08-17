import { unzipSync } from "fflate";

const forbidden = new Set(["exe", "dll", "bat", "cmd", "ps1", "sh", "php", "py", "rb", "cgi", "jar", "msi", "scr", "com", "apk", "dmg", "pkg", "deb", "rpm", "zip", "rar", "7z", "tar", "gz"]);
const mimeTypes: Record<string, string> = { html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json", wasm: "application/wasm", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", mp4: "video/mp4", webm: "video/webm", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", data: "application/octet-stream" };

export type ScanResult = { files: Record<string, Uint8Array>; fileCount: number; expandedBytes: number; warnings: string[]; checksum: string };

function safePath(name: string) {
  const normalized = name.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.includes("../") || normalized.includes("\0") || /^[a-zA-Z]:/.test(normalized)) throw new Error(`不安全的檔案路徑：${name}`);
  const extension = normalized.split(".").pop()?.toLowerCase() ?? "";
  if (forbidden.has(extension)) throw new Error(`不允許的檔案類型：.${extension}`);
  return normalized;
}

export async function scanAndExtractZip(buffer: ArrayBuffer): Promise<ScanResult> {
  if (buffer.byteLength < 22) throw new Error("檔案不是有效的 ZIP 套件。");
  if (buffer.byteLength > 50 * 1024 * 1024) throw new Error("ZIP 超過 50 MiB 上限。");
  let raw: Record<string, Uint8Array>;
  try { raw = unzipSync(new Uint8Array(buffer)); } catch { throw new Error("ZIP 無法解壓，或使用了不支援的壓縮方式。"); }
  const files: Record<string, Uint8Array> = {};
  let expandedBytes = 0;
  const entries = Object.entries(raw);
  if (entries.length > 2000) throw new Error("套件超過 2,000 個檔案上限。");
  for (const [name, bytes] of entries) {
    const path = safePath(name);
    expandedBytes += bytes.byteLength;
    if (expandedBytes > 250 * 1024 * 1024) throw new Error("解壓後大小超過 250 MiB 上限。");
    files[path] = bytes;
  }
  if (!files["index.html"]) throw new Error("ZIP 根目錄必須包含 index.html。");
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const checksum = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { files, fileCount: entries.length, expandedBytes, warnings: [], checksum };
}

export function contentType(path: string) { return mimeTypes[path.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream"; }

export async function storeRelease(bucket: R2Bucket, releaseId: string, archive: ArrayBuffer, files: Record<string, Uint8Array>) {
  await bucket.put(`archives/${releaseId}.zip`, archive, { httpMetadata: { contentType: "application/zip", contentDisposition: `attachment; filename="opengames-${releaseId}.zip"` } });
  for (const [path, bytes] of Object.entries(files)) await bucket.put(`releases/${releaseId}/${path}`, bytes, { httpMetadata: { contentType: contentType(path) } });
}
