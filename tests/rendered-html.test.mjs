import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

function env() {
  return {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  };
}

async function render(path = "/") {
  const worker = await loadWorker();
  return worker.fetch(
    new Request(`https://opengames.test${path}`, { headers: { accept: "text/html" } }),
    env(),
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the premium public home page and absolute social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>OpenGames — 好遊戲，不該被埋沒<\/title>/);
  assert.match(html, /好遊戲/);
  assert.match(html, /THE OPEN ARCADE/);
  assert.match(html, /http:\/\/localhost:3000\/og\.png/);
  assert.match(html, /aria-label="行動版導覽"/);
  assert.doesNotMatch(html, /opengames\.com/i);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|site-creator-vinext-starter/i);
});

test("renders a playable game detail with sandbox isolation", async () => {
  const response = await render("/games/void-runner");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Void Runner — OpenGames<\/title>/);
  assert.match(html, /sandbox="allow-scripts allow-pointer-lock"/);
  assert.match(html, /\/demo\/void-runner\/index\.html/);
  assert.doesNotMatch(html, /opengames\.test\/og\.png/);
});

test("renders policy and authentication surfaces", async () => {
  const [policy, login] = await Promise.all([render("/guidelines"), render("/login")]);
  assert.equal(policy.status, 200);
  assert.equal(login.status, 200);
  assert.match(await policy.text(), /開放創作，不等於沒有邊界/);
  assert.match(await login.text(), /加入開放的.*遊戲創作社群/s);
});

test("keeps upload and player safety controls in source", async () => {
  const [upload, player, home, header] = await Promise.all([
    readFile(new URL("../lib/upload.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/play/[releaseId]/[...path]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(upload, /buffer\.byteLength > 50 \* 1024 \* 1024/);
  assert.match(upload, /expandedBytes > 250 \* 1024 \* 1024/);
  assert.match(upload, /normalized\.includes\("\.\.\/"\)/);
  assert.match(player, /sandbox allow-scripts allow-pointer-lock/);
  assert.match(player, /connect-src 'self' data: blob:/);
  assert.match(player, /frame-ancestors 'self'/);
  assert.match(player, /g\.current_release_id = r\.id/);
  assert.doesNotMatch(home + header, /next\/link/);
  assert.match(home, /<a className="primary-button" href="\/games">/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
