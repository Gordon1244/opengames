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
  assert.match(html, /https:\/\/opengames-arcade\.com\/og\.png/);
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
  const [policy, login, converter, profile] = await Promise.all([render("/guidelines"), render("/login"), render("/convert"), render("/account/profile")]);
  assert.equal(policy.status, 200);
  assert.equal(login.status, 200);
  assert.equal(converter.status, 200);
  assert.equal(profile.status, 200);
  assert.match(await policy.text(), /開放創作，不等於沒有邊界/);
  assert.match(await login.text(), /加入開放的.*遊戲創作社群/s);
  assert.match(await converter.text(), /只在本機分析/);
  assert.match(await render("/convert", { cookie: "opengames_locale=en" }).then((response) => response.text()), /LOCAL-ONLY ANALYSIS/);
  assert.match(await render("/account/security").then((response) => response.text()), /ACCOUNT SECURITY/);
  assert.match(await profile.text(), /請先登入，再編輯創作者資料/);
});

test("renders bilingual source-export guides with official references and platform limits", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/guides"),
    render("/guides", { cookie: "opengames_locale=en" }),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  assert.match(zh, /Unity C#.*Web 建置/s);
  assert.match(zh, /C／C\+\+.*Emscripten WebAssembly/s);
  assert.match(zh, /Godot 4 的 C# 專案目前不能匯出 Web/);
  assert.match(zh, /py -m http\.server 8080/);
  assert.match(zh, /外部 API／多人連線失敗/);
  assert.match(zh, /docs\.unity3d\.com\/6000\.0/);
  assert.match(zh, /emscripten\.org\/docs\/getting_started\/Tutorial\.html/);
  assert.match(zh, /learn\.microsoft\.com\/aspnet\/core\/blazor/);
  assert.match(zh, /docs\.godotengine\.org\/en\/stable/);
  assert.match(en, /Bring your game.*to the browser/s);
  assert.match(en, /Free guide.*no compilation server required/s);
});

test("renders the bilingual account saves and multiplayer SDK guide", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/guides/platform-services"),
    render("/guides/platform-services", { cookie: "opengames_locale=en" }),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  assert.match(zh, /把帳號服務.*接進你的遊戲/s);
  assert.match(zh, /OpenGames\.saves\.write/);
  assert.match(zh, /全遊戲世界/);
  assert.match(zh, /無活動 10 分鐘後關閉/);
  assert.match(en, /Connect account services.*to your game/s);
  assert.match(en, /OpenGames\.multiplayer\.joinGlobal/);
});

test("keeps the game bridge, save limits, and Realtime policies in source", async () => {
  const [bridge, sdk, saves, schema] = await Promise.all([
    readFile(new URL("../components/GamePlayer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/opengames-sdk.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/games/[gameId]/saves/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/multiplayer.sql", import.meta.url), "utf8"),
  ]);
  assert.match(bridge, /event\.source !== iframeRef\.current\?\.contentWindow/);
  assert.match(bridge, /MESSAGE_TOO_LARGE/);
  assert.match(bridge, /30/);
  assert.doesNotMatch(bridge, /service_role|user\.email/);
  assert.match(sdk, /OpenGames/);
  assert.match(saves, /MAX_SAVE_BYTES = 64 \* 1024/);
  assert.match(saves, /MAX_SLOTS = 10/);
  assert.match(saves, /VERSION_CONFLICT/);
  assert.match(schema, /extensions\.crypt\(p_password/);
  assert.match(schema, /interval '10 minutes'/);
  assert.match(schema, /OpenGames room members receive realtime/);
  assert.match(schema, /revoke all .* from public, anon/);
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

test("logout redirects instead of throwing on an already-cleared session", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://opengames.test/auth/signout", { method: "POST" }),
    env(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://opengames.test/");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
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

test("rejects cross-site login notification requests", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://opengames.test/api/auth/login-notification", {
      method: "POST",
      headers: { Origin: "https://attacker.test" },
    }),
    env(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 403);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("keeps upload, player, rating, login notification, and account security controls in source", async () => {
  const [upload, uploadForm, uploadPage, player, home, header, demoGame, auth, security, securityGate, reauthRoute, securityPage, ratingRoute, ratingPanel, platform, loginForm, turnstile, updatePassword, passwordPolicy, callback, loginNotification, privacy, emailTemplate, analyzer, converter] = await Promise.all([
    readFile(new URL("../lib/upload.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/upload/UploadForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/upload/page.tsx", import.meta.url), "utf8"),
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
    readFile(new URL("../app/login/LoginForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/TurnstileWidget.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/account/password/UpdatePasswordForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/password-policy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/login-notifications.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../emails/confirm-sign-up.html", import.meta.url), "utf8"),
    readFile(new URL("../lib/project-analyzer.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/convert/Converter.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(upload, /buffer\.byteLength > 50 \* 1024 \* 1024/);
  assert.match(upload, /expandedBytes > 250 \* 1024 \* 1024/);
  assert.match(upload, /normalized\.includes\("\.\.\/"\)/);
  assert.match(upload, /"unity-web" \| "dotnet-webassembly" \| "webassembly" \| "web"/);
  assert.match(upload, /isDotNetFrameworkAssembly/);
  assert.match(upload, /contentEncoding/);
  assert.match(uploadForm, /C# WebAssembly/);
  assert.match(uploadForm, /Unity Web/);
  assert.match(uploadForm, /EXE 與 APK 不是網頁建置/);
  assert.match(uploadPage, /C# Unity Web 與 \.NET WebAssembly/);
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
  assert.match(securityGate, /action="account_security"/);
  assert.match(securityGate, /signInWithPasskey\(\{ options: \{ captchaToken \} \}\)/);
  assert.match(reauthRoute, /origin === new URL\(request\.url\)\.origin/);
  assert.match(reauthRoute, /signInWithPassword/);
  assert.match(reauthRoute, /options: \{ captchaToken: payload\.captchaToken \}/);
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
  assert.match(security, /auth\.registerPasskey\(\)/);
  assert.doesNotMatch(security, /金鑰名稱|passkeyName|auth\.passkey\.update/);
  assert.match(loginForm, /api\/auth\/login-notification/);
  assert.match(loginForm, /signInWithPassword\(\{ email, password, options: \{ captchaToken \} \}\)/);
  assert.match(loginForm, /resetPasswordForEmail[\s\S]*captchaToken/);
  assert.match(loginForm, /signInWithPasskey\(\{ options: \{ captchaToken \} \}\)/);
  assert.match(turnstile, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(turnstile, /"refresh-expired": "auto"/);
  assert.match(turnstile, /window\.turnstile\.reset/);
  assert.doesNotMatch(turnstile, /Human verification complete|真人驗證完成|Complete the security check to continue|完成安全檢查後即可繼續/);
  assert.match(loginForm, /passwordMeetsPolicy/);
  assert.match(passwordPolicy, /lowercase/);
  assert.match(passwordPolicy, /uppercase/);
  assert.match(passwordPolicy, /digit/);
  assert.match(updatePassword, /auth\.reauthenticate\(\)/);
  assert.match(updatePassword, /reauthentication_needed/);
  assert.match(updatePassword, /updateUser\(\{ password, \.\.\.\(nonce \? \{ nonce \}/);
  assert.match(callback, /sendLoginNotification/);
  assert.match(loginNotification, /INSERT OR IGNORE INTO login_notifications/);
  assert.match(loginNotification, /claims\.session_id/);
  assert.match(loginNotification, /CLOUDFLARE_EMAIL_API_TOKEN/);
  assert.match(loginNotification, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(loginNotification, /api\.cloudflare\.com\/client\/v4\/accounts/);
  assert.match(loginNotification, /LOGIN_ALERT_FROM_EMAIL/);
  assert.match(loginNotification, /不收集或顯示完整 IP 位址/);
  assert.doesNotMatch(loginNotification, /cf-connecting-ip|x-forwarded-for|request\.headers\.get\(["'](?:x-real-ip|cf-connecting-ip)/i);
  assert.doesNotMatch(loginNotification, /console\.(?:log|error)/);
  assert.match(privacy, /登入安全通知/);
  assert.match(emailTemplate, /OpenGames 開源遊戲平台/);
  assert.match(emailTemplate, /\{\{ \.ConfirmationURL \}\}/);
  assert.match(header, /href="\/convert"/);
  assert.match(header, /href="\/guides"/);
  assert.match(uploadForm, /先在本機檢查專案或成品/);
  assert.match(uploadForm, /查看完整匯出與封裝教學/);
  assert.match(analyzer, /MAX_CENTRAL_DIRECTORY/);
  assert.match(analyzer, /inspectExecutableHeader/);
  assert.doesNotMatch(converter, /fetch\(/);
  assert.match(converter, /never runs the program/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("rejects cross-site creator profile updates before reading account data", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://opengames.test/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.test" },
      body: JSON.stringify({ displayName: "Attacker", handle: "attacker", isPublic: true }),
    }),
    env(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 403);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.match(await response.text(), /無效的更新要求/);
});

test("keeps creator profiles private-by-design and connected to published games", async () => {
  const [profileForm, profileRoute, publicPage, platform, uploadRoute, uploadForm, gamePage, privacy] = await Promise.all([
    readFile(new URL("../app/account/profile/ProfileForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/creators/[handle]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/platform.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/uploads/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/upload/UploadForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/games/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(profileForm, /Email 永遠不會顯示在公開頁面/);
  assert.match(profileForm, /創作者身分／職稱/);
  assert.match(profileForm, /技能／專長標籤/);
  assert.match(profileRoute, /origin === new URL\(request\.url\)\.origin/);
  assert.match(profileRoute, /UPDATE profiles SET handle=\?, display_name=\?/);
  assert.doesNotMatch(profileRoute, /UPDATE profiles SET[^\n]*(?:email|role|status)=/);
  assert.match(publicPage, /getPublicCreatorProfile/);
  assert.doesNotMatch(publicPage, /profile\.email|user\.email/);
  assert.match(platform, /is_public = 1/);
  assert.match(platform, /display_name,is_public,role,status\) VALUES \(\?,\?,\?,\?,0,\?,'active'\)/);
  assert.match(platform, /ALTER TABLE profiles ADD COLUMN bio/);
  assert.match(uploadRoute, /ensureCreatorProfile\(user\)/);
  assert.doesNotMatch(uploadRoute, /creatorName|display_name=excluded\.display_name/);
  assert.match(uploadForm, /創作者身分會使用你的個人檔案/);
  assert.match(gamePage, /game\.creatorProfilePublic/);
  assert.match(gamePage, /\/creators\/\$\{game\.creatorHandle\}/);
  assert.match(privacy, /完整創作者頁是否公開/);
});

test("rejects cross-site save and creator-setting changes before account access", async () => {
  const worker = await loadWorker();
  const context = { waitUntil() {}, passThroughOnException() {} };
  const [save, settings] = await Promise.all([
    worker.fetch(new Request("https://opengames.test/api/games/game-id/saves", { method: "PUT", headers: { "Content-Type": "application/json", Origin: "https://attacker.test" }, body: JSON.stringify({ slot: "default", data: {}, version: 0 }) }), env(), context),
    worker.fetch(new Request("https://opengames.test/api/creator/games/game-id", { method: "PATCH", headers: { "Content-Type": "application/json", Origin: "https://attacker.test" }, body: JSON.stringify({ cloudSavesEnabled: true }) }), env(), context),
  ]);
  assert.equal(save.status, 403);
  assert.equal(settings.status, 403);
  assert.match(await save.text(), /Invalid save request/);
  assert.match(await settings.text(), /Invalid settings request/);
});
