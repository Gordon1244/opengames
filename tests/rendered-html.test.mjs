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

async function render(path = "/", headers = {}) {
  const worker = await loadWorker();
  return worker.fetch(
    new Request(`https://opengames.test${path}`, { headers: { accept: "text/html", ...headers } }),
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
  assert.match(html, /RATED BY THE COMMUNITY/);
  assert.match(html, /社群現在推薦這些遊戲/);
  assert.match(html, /(?:http:\/\/localhost:3000|https:\/\/opengames-arcade\.momognchou\.chatgpt\.site)\/og\.png/);
  assert.match(html, /aria-label="行動版導覽"/);
  assert.doesNotMatch(html, /opengames\.com/i);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|site-creator-vinext-starter/i);
});

test("renders the English interface from the remembered locale cookie", async () => {
  const [home, games, security] = await Promise.all([
    render("/", { cookie: "opengames_locale=en" }),
    render("/games", { cookie: "opengames_locale=en" }),
    render("/account/security", { cookie: "opengames_locale=en" }),
  ]);
  const [homeHtml, gamesHtml, securityHtml] = await Promise.all([home.text(), games.text(), security.text()]);
  assert.match(homeHtml, /<html lang="en">/);
  assert.match(homeHtml, /Great games.*deserve to be found/s);
  assert.match(gamesHtml, /Your next favorite game/);
  assert.match(securityHtml, /Sign in to OpenGames first/);
  assert.doesNotMatch(gamesHtml, /下一款喜歡的遊戲/);
});

test("remembers a validated locale and keeps redirects on this site", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://opengames.test/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ locale: "en", next: "https://attacker.test" }),
    }),
    env(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://opengames.test/");
  assert.match(response.headers.get("set-cookie") ?? "", /opengames_locale=en/);
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=31536000/i);
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
  assert.match(await render("/account/security").then((response) => response.text()), /ACCOUNT SECURITY/);
});

test("rejects cross-site account reauthentication before reading credentials", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://opengames.test/api/auth/reauth", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.test" },
      body: JSON.stringify({ method: "password", password: "never-inspected" }),
    }),
    env(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 403);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.match(await response.text(), /無效的驗證要求/);
});

test("rejects cross-site rating changes before reading account or database state", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://opengames.test/api/games/demo-void-runner/rating", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.test" },
      body: JSON.stringify({ rating: 5 }),
    }),
    env(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 403);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.match(await response.text(), /無效的評價要求/);
});

test("keeps upload, player, rating, and account security controls in source", async () => {
  const [upload, player, home, header, demoGame, auth, security, securityGate, reauthRoute, securityPage, ratingRoute, ratingPanel, platform, privacy, emailTemplate] = await Promise.all([
    readFile(new URL("../lib/upload.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/play/[releaseId]/[...path]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/demo/void-runner/index.html", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/account/security/SecuritySettings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/account/security/SecurityGate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/reauth/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/account/security/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/games/[gameId]/rating/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/games/[slug]/RatingPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/platform.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../emails/confirm-sign-up.html", import.meta.url), "utf8"),
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
  assert.match(demoGame, /reset\(\);draw\(0\)/);
  assert.match(header, /favicon\.svg/);
  assert.match(auth, /getAuthenticatorAssuranceLevel/);
  assert.match(security, /registerPasskey/);
  assert.match(security, /challengeAndVerify/);
  assert.match(securityGate, /current-password/);
  assert.match(securityGate, /signInWithPasskey/);
  assert.match(securityGate, /challengeAndVerify/);
  assert.match(securityGate, /verifyWithServer/);
  assert.match(reauthRoute, /origin === new URL\(request\.url\)\.origin/);
  assert.match(reauthRoute, /signInWithPassword/);
  assert.match(reauthRoute, /data\.user\?\.id === currentUser\.id/);
  assert.match(reauthRoute, /now - entry\.timestamp <= 120/);
  assert.doesNotMatch(reauthRoute, /console\.(?:log|error).*password/);
  assert.match(securityPage, /<SecurityGate/);
  assert.doesNotMatch(securityPage, /<SecuritySettings/);
  assert.match(ratingRoute, /origin === new URL\(request\.url\)\.origin/);
  assert.match(ratingRoute, /ON CONFLICT\(game_id,user_id\) DO UPDATE/);
  assert.match(ratingRoute, /game\.creatorId === user\.id/);
  assert.match(ratingPanel, /每個帳號只計算一票/);
  assert.match(platform, /CHECK \(rating BETWEEN 1 AND 5\)/);
  assert.match(home, /sortRecommendedGames/);
  assert.match(privacy, /帳號識別碼、遊戲與 1 至 5 星評分/);
  assert.match(emailTemplate, /OpenGames 開源遊戲平台/);
  assert.match(emailTemplate, /\{\{ \.ConfirmationURL \}\}/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
