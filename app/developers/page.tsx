import type { Metadata } from "next";
import { DeveloperCode } from "../../components/DeveloperCode";
import { SiteFooter, SiteHeader } from "../../components/SiteHeader";
import { copy, getLocale } from "../../lib/i18n";
import { getSiteOrigin } from "../../lib/site";

const quickStartCode = `<script src="/opengames-sdk.js"></script>
<script>
  async function startGame() {
    const platform = await OpenGames.ready();
    console.log(platform.locale, platform.cloudSaves.enabled);
    // Initialize your game after the bridge is ready.
  }
  startGame();
</script>`;

const packageTree = `my-game.zip
├─ index.html
├─ game.js
├─ game.wasm
└─ assets/
   ├─ sprites.webp
   └─ music.ogg`;

const localeCode = `const platform = await OpenGames.ready();
const locale = platform.locale; // "zh-Hant", "en", "ja"…
const region = platform.region; // "TW", "JP", "US" or "XX"

loadTranslations(locale);
showRegionalNotice(region);`;

const saveCode = `const loaded = await OpenGames.saves.load("campaign");
let version = loaded.save?.version ?? 0;
let state = loaded.save?.data ?? { level: 1, coins: 0 };

try {
  const written = await OpenGames.saves.write(state, {
    slot: "campaign",
    version
  });
  version = written.save.version;
} catch (error) {
  if (error.message === "VERSION_CONFLICT") {
    // Reload and let the player choose which progress to keep.
  }
}`;

const roomCode = `// Public co-op room
const created = await OpenGames.multiplayer.create({
  visibility: "public",
  mode: "co-op"
});
showInviteCode(created.room.room_code);

// Password-protected team room
await OpenGames.multiplayer.create({
  visibility: "password",
  password: playerEnteredPassword,
  mode: "teams",
  teamCount: 2
});

const { rooms } = await OpenGames.multiplayer.list();
await OpenGames.multiplayer.join(inviteCode, passwordOrNull);`;

const realtimeCode = `const stopMessages = OpenGames.on("multiplayer.message", ({ payload }) => {
  applyRemoteMessage(payload);
});

const stopPresence = OpenGames.on("multiplayer.presence", ({ playerCount }) => {
  updateLobbyCount(playerCount);
});

await OpenGames.multiplayer.send({
  type: "input",
  frame: 1024,
  buttons: ["jump"]
});

// Call the returned functions when your game no longer needs the listeners.
stopMessages();
stopPresence();`;

const managedRoomCode = `// Only the verified creator can create a persistent creator room.
await OpenGames.multiplayer.create({
  creatorManaged: true,
  persistent: true,
  visibility: "public",
  mode: "shared"
});

// Available only when the dashboard policy is "One game-wide world".
await OpenGames.multiplayer.joinGlobal("shared");`;

const localTestCode = `# Run this inside the exported build folder.
py -m http.server 8080

# Then open http://localhost:8080 and inspect Console + Network.`;

const apiRows = [
  ["OpenGames.ready()", "—", "Promise<Capabilities>", "Read sign-in, locale, save and multiplayer capabilities before starting."],
  ["OpenGames.on(type, callback)", "event name, callback", "unsubscribe()", "Listen for multiplayer.message or multiplayer.presence."],
  ["saves.load(slot)", "slot?: string", "{ save: Save | null }", "Load one account save slot."],
  ["saves.write(data, options)", "JSON data, { slot, version }", "{ save: Save }", "Create or version-check and update a slot."],
  ["saves.remove(slot)", "slot?: string", "{ deleted: true }", "Delete one slot."],
  ["multiplayer.list()", "—", "{ rooms: RoomSummary[] }", "List up to 50 public rooms for this game."],
  ["multiplayer.create(options)", "visibility, password?, mode, teamCount?", "{ room: Room }", "Create and automatically connect to a player or creator room."],
  ["multiplayer.join(code, password)", "6-character code, password?", "{ room: Room }", "Join and automatically connect to an invite-code room."],
  ["multiplayer.joinGlobal(mode)", "allowed mode", "{ room: Room }", "Join the single persistent world configured for the game."],
  ["multiplayer.send(payload)", "JSON-compatible payload", "{ sent: true }", "Broadcast a game-defined message to the other room members."],
  ["multiplayer.leave()", "—", "{ left: true }", "Leave the current room and stop its heartbeat."],
  ["multiplayer.close()", "—", "{ closed: true }", "Close the current room; host only."],
] as const;

const errors = [
  ["FEATURE_DISABLED", "The creator has not enabled this service."],
  ["AUTH_REQUIRED", "The player must sign in to an OpenGames account."],
  ["VERSION_CONFLICT", "The save changed elsewhere; reload and ask the player which state to keep."],
  ["MODE_NOT_ALLOWED", "The selected multiplayer mode is not enabled in the dashboard."],
  ["PLAYER_ROOMS_DISABLED", "The room policy does not allow player-created rooms."],
  ["CREATOR_ROOM_NOT_ALLOWED", "The caller is not the verified creator or the policy disallows creator rooms."],
  ["GLOBAL_WORLD_DISABLED", "The game is not configured for a game-wide world."],
  ["NOT_IN_ROOM", "Join or create a room before sending or closing."],
  ["MESSAGE_TOO_LARGE", "The serialized message exceeds 8 KiB."],
  ["RATE_LIMITED", "The page sent more than 30 messages in one second."],
  ["HOST_ONLY", "Only the room host can close this room."],
  ["MULTIPLAYER_UNAVAILABLE", "Realtime is unavailable in the current environment."],
  ["SEND_FAILED / ROOM_REQUEST_FAILED", "The provider or connection rejected the operation; show retry or offline UI."],
] as const;

const engines = {
  "zh-Hant": [
    { id: "unity", badge: "UNITY WEB", title: "Unity C# → Web", lead: "從 Unity 原始專案建立 Web 版本；Windows EXE 或 Android APK 不能取代原始專案。", steps: ["在 Unity Hub 為專案使用的 Editor 版本安裝 Web Build Support。", "建立並切換到 Web Build Profile，加入要發布的場景，關閉 Development Build。", "移除原生 DLL、桌面檔案系統、原生 Socket，以及強制使用 SharedArrayBuffer 的套件。", "輸出到新的空資料夾；ZIP 只包含輸出資料夾內的 index.html、Build 與資源。"], href: "https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-gettingstarted.html", source: "Unity 官方 Web 文件" },
    { id: "cpp", badge: "C / C++ / WASM", title: "C／C++ → Emscripten", lead: "Emscripten 重新編譯原始碼；Windows API、桌面視窗與同步檔案流程通常需要改寫。", steps: ["安裝並啟用 emsdk；Windows 使用 Emscripten Command Prompt。", "使用 em++ 或 emcmake 建立 Release 網頁版本，輸出檔名設為 index.html。", "把阻塞式 while 遊戲迴圈改為 Emscripten main loop，並以 --preload-file 封裝素材。", "透過 emrun 或本機 HTTP 伺服器測試，不要直接雙擊 HTML。"], href: "https://emscripten.org/docs/getting_started/Tutorial.html", source: "Emscripten 官方教學" },
    { id: "dotnet", badge: "C# / .NET WASM", title: "獨立 Blazor WebAssembly", lead: "只適用於能發布成靜態檔案的獨立 WebAssembly 專案；WinForms、WPF、MAUI 與需要 ASP.NET Server 的專案不能直接上傳。", steps: ["確認是獨立 Blazor WebAssembly，而不是桌面 UI 或必須常駐伺服器的專案。", "移除 Registry、本機任意檔案、原生 DLL 與伺服器端相依。", "執行 dotnet publish -c Release。", "從 publish/wwwroot 或 browser-wasm/publish 取出包含 index.html 與 _framework 的靜態輸出。"], href: "https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/?view=aspnetcore-10.0", source: "Microsoft 官方部署文件" },
    { id: "godot", badge: "GODOT WEB", title: "Godot → Web", lead: "Godot 4 的 GDScript 專案可匯出；Godot 4 C# 目前不能匯出到 Web。", steps: ["優先使用 Compatibility renderer，移除 Web 不支援的原生外掛。", "安裝與 Editor 同版本的 Export Templates。", "新增 Web preset，選好主場景與資源，輸出檔名設為 index.html。", "採用單執行緒相容建置，透過 HTTP 測試後再封裝。"], href: "https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html", source: "Godot 官方 Web 文件" },
  ],
  en: [
    { id: "unity", badge: "UNITY WEB", title: "Unity C# → Web", lead: "Build from the Unity source project. A Windows EXE or Android APK is not a substitute for the source.", steps: ["Install Web Build Support for the project's Editor version in Unity Hub.", "Create and switch to a Web Build Profile, include the published scenes, and disable Development Build.", "Remove native DLLs, desktop filesystem access, native sockets, and packages that require SharedArrayBuffer.", "Build into a new empty folder; ZIP only the index.html, Build folder, and assets inside the output."], href: "https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-gettingstarted.html", source: "Official Unity Web documentation" },
    { id: "cpp", badge: "C / C++ / WASM", title: "C / C++ → Emscripten", lead: "Emscripten recompiles source code. Windows APIs, desktop windows, and synchronous file workflows usually need changes.", steps: ["Install and activate emsdk; use the Emscripten Command Prompt on Windows.", "Use em++ or emcmake for a Release web build and output index.html.", "Replace a blocking while loop with the Emscripten main loop and package assets with --preload-file.", "Test through emrun or a local HTTP server instead of double-clicking the HTML file."], href: "https://emscripten.org/docs/getting_started/Tutorial.html", source: "Official Emscripten tutorial" },
    { id: "dotnet", badge: "C# / .NET WASM", title: "Standalone Blazor WebAssembly", lead: "Only projects that publish as static files work. WinForms, WPF, MAUI, and apps requiring an ASP.NET Server cannot be uploaded directly.", steps: ["Confirm the project is standalone Blazor WebAssembly, not a desktop UI or server-dependent app.", "Remove Registry, arbitrary local file, native DLL, and server-side dependencies.", "Run dotnet publish -c Release.", "Use the static output from publish/wwwroot or browser-wasm/publish, including index.html and _framework."], href: "https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/?view=aspnetcore-10.0", source: "Official Microsoft deployment documentation" },
    { id: "godot", badge: "GODOT WEB", title: "Godot → Web", lead: "Godot 4 projects using GDScript can export to Web. Godot 4 C# currently cannot.", steps: ["Prefer the Compatibility renderer and remove native plugins that do not support Web.", "Install Export Templates matching the Editor version.", "Add a Web preset, select the main scene and resources, and export as index.html.", "Use a single-thread-compatible build and test it over HTTP before packaging."], href: "https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html", source: "Official Godot Web documentation" },
  ],
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const origin = getSiteOrigin();
  const title = copy(locale, "OpenGames 開發者中心 — 遊戲規格與 SDK", "OpenGames Developer Center — Game requirements and SDK");
  const description = copy(locale, "從 Web 匯出、ZIP 封裝、沙箱限制到帳號存檔與多人連線的完整 OpenGames 開發文件。", "Complete OpenGames documentation for Web exports, ZIP packaging, sandbox limits, account saves, and multiplayer.");
  return {
    title, description,
    alternates: { canonical: "/developers" },
    openGraph: { title, description, type: "website", url: `${origin}/developers` },
    twitter: { card: "summary", title, description },
  };
}

function ApiTable({ english }: { english: boolean }) {
  return <div className="developer-table-wrap"><table className="developer-table"><thead><tr><th>{english ? "Method" : "方法"}</th><th>{english ? "Input" : "輸入"}</th><th>{english ? "Resolves with" : "回傳"}</th><th>{english ? "Purpose" : "用途"}</th></tr></thead><tbody>{apiRows.map(([method, input, output, purpose]) => <tr key={method}><th><code>{method}</code></th><td><code>{input}</code></td><td><code>{output}</code></td><td>{english ? purpose : ({
    "Read sign-in, locale, save and multiplayer capabilities before starting.": "遊戲啟動前讀取登入、語言、存檔與多人功能。",
    "Listen for multiplayer.message or multiplayer.presence.": "監聽多人訊息或 Presence 人數事件。",
    "Load one account save slot.": "載入一個帳號存檔槽。",
    "Create or version-check and update a slot.": "建立存檔，或檢查版本後更新。",
    "Delete one slot.": "刪除一個存檔槽。",
    "List up to 50 public rooms for this game.": "列出這款遊戲最多 50 個公開房。",
    "Create and automatically connect to a player or creator room.": "建立玩家房或創作者房，並自動連線。",
    "Join and automatically connect to an invite-code room.": "以邀請碼加入房間並自動連線。",
    "Join the single persistent world configured for the game.": "加入此遊戲設定的單一永久世界。",
    "Broadcast a game-defined message to the other room members.": "向房內其他成員廣播遊戲自訂訊息。",
    "Leave the current room and stop its heartbeat.": "離開目前房間並停止續租。",
    "Close the current room; host only.": "關閉目前房間，僅房主可用。",
  } as Record<string, string>)[purpose]}</td></tr>)}</tbody></table></div>;
}

export default async function DevelopersPage() {
  const locale = await getLocale();
  const english = locale === "en";
  const codeProps = { copyLabel: english ? "Copy" : "複製", copiedLabel: english ? "Copied" : "已複製" };
  const engineList = engines[locale];
  return <main><SiteHeader />
    <header className="developer-hero">
      <div><p className="eyebrow"><span /> OPENGAMES DEVELOPER CENTER</p><h1>{english ? <>Build once.<br />Play in the browser.</> : <>把遊戲做好，<br />直接在瀏覽器玩。</>}</h1><p>{english ? "The complete contract for exporting, packaging, testing, publishing, account saves, and multiplayer on OpenGames." : "從匯出、封裝、測試、發布，到帳號存檔與多人連線，這裡是 OpenGames 遊戲的完整開發規格。"}</p><div className="developer-hero-actions"><a className="primary-button" href="/convert">{english ? "Check a build" : "檢查建置"} <span>↗</span></a><a className="secondary-button" href="/upload">{english ? "Publish a game" : "發布遊戲"}</a></div></div>
      <DeveloperCode code={quickStartCode} label="index.html · SDK v1" {...codeProps} />
    </header>

    <div className="developer-layout">
      <nav className="developer-nav" aria-label={english ? "Developer documentation" : "開發文件章節"}>
        <span>{english ? "ON THIS PAGE" : "本頁章節"}</span>
        <a href="#quickstart"><b>01</b>{english ? "Quick start" : "快速開始"}</a>
        <a href="#build-export"><b>02</b>{english ? "Web exports" : "Web 匯出"}</a>
        <a href="#package"><b>03</b>{english ? "Package & publish" : "封裝與發布"}</a>
        <a href="#runtime"><b>04</b>{english ? "Runtime limits" : "執行限制"}</a>
        <a href="#sdk"><b>05</b>SDK v1</a>
        <a href="#saves"><b>06</b>{english ? "Account saves" : "帳號存檔"}</a>
        <a href="#multiplayer"><b>07</b>{english ? "Multiplayer" : "多人連線"}</a>
        <a href="#errors"><b>08</b>{english ? "Errors" : "錯誤處理"}</a>
        <a href="#checklist"><b>09</b>{english ? "Release checklist" : "發布檢查"}</a>
      </nav>

      <article className="developer-content">
        <section id="quickstart" className="developer-section">
          <header><span>01</span><div><p>{english ? "START HERE" : "從這裡開始"}</p><h2>{english ? "A browser build, not an installer" : "準備網頁建置，不是安裝檔"}</h2></div></header>
          <p className="developer-lead">{english ? "OpenGames runs static HTML, JavaScript, WebAssembly, media, and font files in a restricted iframe. Start from the source project, export a Web build, test it through HTTP, then ZIP the files inside the output folder." : "OpenGames 會在受限 iframe 中執行靜態 HTML、JavaScript、WebAssembly、媒體與字型。請從原始專案匯出 Web 版本，透過 HTTP 測試，再壓縮輸出資料夾裡面的檔案。"}</p>
          <div className="developer-three-up"><article><strong>1</strong><h3>{english ? "Export" : "匯出"}</h3><p>{english ? "Produce a static browser build with index.html." : "建立包含 index.html 的靜態瀏覽器版本。"}</p></article><article><strong>2</strong><h3>{english ? "Test" : "測試"}</h3><p>{english ? "Serve it over HTTP and fix every Console and Network error." : "透過 HTTP 開啟，修正 Console 與 Network 的所有錯誤。"}</p></article><article><strong>3</strong><h3>{english ? "Check & publish" : "檢查並發布"}</h3><p>{english ? "Run the local converter, ZIP the root contents, then upload." : "先用本機轉換檢查，再壓縮根目錄內容並上傳。"}</p></article></div>
          <DeveloperCode code={packageTree} label={english ? "Required ZIP structure" : "必要 ZIP 結構"} {...codeProps} />
        </section>

        <section id="build-export" className="developer-section">
          <header><span>02</span><div><p>WEB EXPORTS</p><h2>{english ? "Export from the source project" : "從原始專案匯出"}</h2></div></header>
          <p className="developer-lead">{english ? "An EXE, APK, IPA, or desktop installer cannot be converted reliably. Use the matching source project and official Web toolchain." : "EXE、APK、IPA 或桌面安裝程式無法可靠轉換。請使用對應的原始專案與官方 Web 工具鏈。"}</p>
          <div className="developer-engines">{engineList.map((engine, index) => <details key={engine.id} id={engine.id} open={index === 0}><summary><span>{engine.badge}</span><strong>{engine.title}</strong><i>＋</i></summary><div><p>{engine.lead}</p><ol>{engine.steps.map((step) => <li key={step}>{step}</li>)}</ol><a href={engine.href} target="_blank" rel="noreferrer">{engine.source} ↗</a></div></details>)}</div>
          <DeveloperCode code={localTestCode} label={english ? "Local HTTP test" : "本機 HTTP 測試"} {...codeProps} />
        </section>

        <section id="package" className="developer-section">
          <header><span>03</span><div><p>PACKAGE &amp; PUBLISH</p><h2>{english ? "The package is a public release" : "套件就是公開版本"}</h2></div></header>
          <div className="developer-requirements"><article><h3>{english ? "ZIP hard limits" : "ZIP 硬性限制"}</h3><ul><li>{english ? "index.html must be at the ZIP root." : "ZIP 根目錄必須直接看到 index.html。"}</li><li>{english ? "50 MiB compressed, 250 MiB extracted, at most 2,000 files." : "壓縮後 50 MiB、解壓後 250 MiB、最多 2,000 個檔案。"}</li><li>{english ? "No encrypted archive, nested archive, absolute path, parent traversal, or drive path." : "不能加密、巢狀壓縮，也不能含絕對路徑、上層路徑或磁碟機路徑。"}</li><li>{english ? "Paths are case-sensitive after publishing; use relative asset URLs." : "發布後路徑區分大小寫；素材請使用相對網址。"}</li></ul></article><article><h3>{english ? "Blocked files" : "禁止檔案"}</h3><p>{english ? "Executable, script, installer, mobile package, and nested archive extensions are rejected:" : "可執行檔、腳本、安裝程式、行動套件與巢狀壓縮檔會被拒絕："}</p><code>exe bat cmd ps1 sh php py rb cgi jar msi scr com apk dmg pkg deb rpm zip rar 7z tar</code><p>{english ? "DLL files are allowed only under a .NET WebAssembly _framework folder. Gzip files are limited to recognized compressed Web build assets." : "DLL 只允許位於 .NET WebAssembly 的 _framework 目錄；Gzip 只允許用於平台可辨識的 Web 建置資源。"}</p></article><article><h3>{english ? "Listing requirements" : "作品資料要求"}</h3><ul><li>{english ? "Traditional Chinese and English titles: 1–80 characters each." : "繁中與英文名稱皆必填，各 1–80 字元。"}</li><li>{english ? "Traditional Chinese and English descriptions: 1–1,600 characters each." : "繁中與英文介紹皆必填，各 1–1,600 字元。"}</li><li>{english ? "Up to 8 comma-separated tags; version is 1–20 letters, numbers, dots, underscores, or hyphens." : "最多 8 個逗號分隔標籤；版本為 1–20 個英數字、點、底線或連字號。"}</li><li>{english ? "A creator can publish at most 3 releases per day." : "每位創作者每天最多發布 3 個版本。"}</li></ul></article><article><h3>{english ? "Rights are separate choices" : "權利設定彼此獨立"}</h3><p>{english ? "Choose the game license, optional source URL, and ZIP download permission separately. Publishing on an open-source platform does not force the game to be open source." : "作品授權、選填的原始碼網址與 ZIP 下載權限要分開設定。發布到開源平台，不代表遊戲必須開源。"}</p><p>{english ? "You must own the publishing rights and meet the all-ages community guidelines." : "發布者必須擁有發布權利，並符合全年齡社群規範。"}</p></article></div>
        </section>

        <section id="runtime" className="developer-section">
          <header><span>04</span><div><p>SANDBOX CONTRACT</p><h2>{english ? "Know what the game can access" : "先確認遊戲能存取什麼"}</h2></div></header>
          <div className="developer-boundary"><article><span>{english ? "AVAILABLE" : "可使用"}</span><ul><li>HTML / CSS / JavaScript / WebAssembly</li><li>{english ? "Files bundled in the same release, data: and blob: resources" : "同一版本內的檔案、data: 與 blob: 資源"}</li><li>{english ? "Scripts, Web Workers, pointer lock, autoplay, fullscreen, and gamepad" : "腳本、Web Worker、指標鎖定、自動播放、全螢幕與遊戲手把"}</li><li>{english ? "OpenGames SDK bridge for locale, account saves, and multiplayer" : "透過 OpenGames SDK 橋接語言、帳號存檔與多人連線"}</li></ul></article><article><span>{english ? "BLOCKED" : "禁止"}</span><ul><li>{english ? "External APIs, arbitrary servers, raw TCP/UDP, and native sockets" : "外部 API、任意伺服器、原生 TCP／UDP 與 Socket"}</li><li>{english ? "Popups, forms, top navigation, browser plugins, and object embeds" : "彈窗、表單、頂層導覽、瀏覽器外掛與 object 嵌入"}</li><li>{english ? "Camera, microphone, geolocation, payment, USB, serial, and clipboard" : "相機、麥克風、定位、付款、USB、序列埠與剪貼簿"}</li><li>{english ? "OpenGames cookies, email addresses, access tokens, and direct account data" : "OpenGames Cookie、Email、存取權杖與直接帳號資料"}</li></ul></article></div>
          <aside className="developer-warning"><strong>SharedArrayBuffer</strong><p>{english ? "The player does not provide cross-origin isolation. Export a single-thread-compatible build and do not require SharedArrayBuffer. Inside OpenGames, do not treat localStorage as durable storage; use account saves or an in-memory/offline fallback." : "遊戲播放器不提供跨來源隔離。請匯出不依賴 SharedArrayBuffer 的單執行緒相容版本。在 OpenGames 內也不要把 localStorage 當成可靠存檔；請使用帳號存檔或記憶體／離線備援。"}</p></aside>
        </section>

        <section id="sdk" className="developer-section">
          <header><span>05</span><div><p>OPENGAMES SDK v1</p><h2>{english ? "One bridge, no credentials exposed" : "一個橋接，不暴露帳號憑證"}</h2></div></header>
          <p className="developer-lead">{english ? "Include /opengames-sdk.js from the platform origin and wait for ready(). The SDK works only while the game is embedded by OpenGames; outside the platform, detect window.OpenGames and provide offline behavior." : "從平台來源載入 /opengames-sdk.js，並等待 ready()。SDK 只會在遊戲由 OpenGames 嵌入時運作；站外測試請先檢查 window.OpenGames，並提供離線行為。"}</p>
          <ApiTable english={english} />
          <h3>{english ? "Capabilities returned by ready()" : "ready() 回傳的能力"}</h3>
          <div className="developer-schema"><code>{`{
  account: { signedIn },
  locale,
  region,
  cloudSaves: { enabled, maxSlots: 10, maxBytes: 65536 },
  multiplayer: {
    enabled, maxPlayers, modes, roomPolicy,
    managedUnlimited, canManageRooms, voice: false
  }
}`}</code></div>
          <DeveloperCode code={localeCode} label={english ? "Locale and coarse region" : "語言與概略地區"} {...codeProps} />
          <aside className="developer-note">{english ? "OpenGames chooses among translations included by the creator. It never translates missing game text. region is a two-letter country code or XX, never an IP address." : "OpenGames 只會從創作者實際提供的翻譯中選擇，不會自動翻譯缺少的文字。region 是兩碼國家代碼或 XX，不包含 IP 位址。"}</aside>
        </section>

        <section id="saves" className="developer-section">
          <header><span>06</span><div><p>ACCOUNT SAVES</p><h2>{english ? "Version every write" : "每次寫入都要帶版本"}</h2></div></header>
          <div className="developer-facts"><div><strong>10</strong><span>{english ? "slots per player and game" : "每位玩家、每款遊戲的槽位"}</span></div><div><strong>64 KiB</strong><span>{english ? "maximum JSON per slot" : "每格 JSON 上限"}</span></div><div><strong>1–32</strong><span>{english ? "slot characters: A–Z, a–z, 0–9, _ and -" : "槽位字元：英數字、_ 與 -"}</span></div></div>
          <p>{english ? "The player must be signed in and the creator must enable Cloud saves in the dashboard. Save data must be JSON-compatible. Keep the returned version and send it on the next write; version 0 creates a new slot." : "玩家必須登入，創作者也要先在控制台啟用帳號存檔。資料必須可轉為 JSON。保存每次回傳的 version，下一次寫入時再送回；version 0 用於建立新槽位。"}</p>
          <DeveloperCode code={saveCode} label={english ? "Load, write, and resolve conflicts" : "載入、寫入與處理衝突"} {...codeProps} />
          <aside className="developer-note">{english ? "On VERSION_CONFLICT, reload the slot and ask the player which progress to keep. Never overwrite another device silently." : "遇到 VERSION_CONFLICT 時，重新載入槽位並讓玩家選擇要保留的進度，不要無聲覆蓋另一台裝置。"}</aside>
        </section>

        <section id="multiplayer" className="developer-section">
          <header><span>07</span><div><p>REALTIME MULTIPLAYER</p><h2>{english ? "Rooms carry messages; your game defines the rules" : "房間負責傳送，遊戲定義規則"}</h2></div></header>
          <p className="developer-lead">{english ? "Players must sign in. The creator enables multiplayer, permitted modes, maximum players, and room policy in the dashboard. The SDK connects to a private Realtime channel after create, join, or joinGlobal succeeds." : "玩家必須登入。創作者要先在控制台啟用多人連線，設定允許模式、人數上限與房間政策。create、join 或 joinGlobal 成功後，SDK 會自動連到私人 Realtime 頻道。"}</p>
          <div className="developer-mode-grid"><article><code>shared</code><p>{english ? "Everyone shares one state." : "所有玩家共享同一份狀態。"}</p></article><article><code>co-op</code><p>{english ? "Players cooperate toward a common goal." : "玩家合作完成共同目標。"}</p></article><article><code>versus</code><p>{english ? "Players compete; the game decides scoring and authority." : "玩家競賽；計分與權威狀態由遊戲決定。"}</p></article><article><code>teams</code><p>{english ? "2–4 teams; the game assigns members." : "2–4 隊；成員分配由遊戲決定。"}</p></article></div>
          <div className="developer-policy-table"><div><strong>player</strong><span>{english ? "Players create temporary invite-code rooms." : "玩家建立臨時邀請碼房間。"}</span></div><div><strong>creator</strong><span>{english ? "Only the verified creator creates persistent rooms." : "只有已驗證創作者可建立永久房。"}</span></div><div><strong>global</strong><span>{english ? "One persistent game-wide world; use joinGlobal()." : "單一全遊戲永久世界；使用 joinGlobal()。"}</span></div><div><strong>hybrid</strong><span>{english ? "Player rooms and creator rooms are both available." : "同時提供玩家房與創作者房。"}</span></div></div>
          <DeveloperCode code={roomCode} label={english ? "Create, list, and join rooms" : "建立、列出與加入房間"} {...codeProps} />
          <DeveloperCode code={realtimeCode} label={english ? "Messages and presence" : "訊息與 Presence"} {...codeProps} />
          <DeveloperCode code={managedRoomCode} label={english ? "Creator room and global world" : "創作者房與全遊戲世界"} {...codeProps} />
          <div className="developer-requirements"><article><h3>{english ? "Room limits" : "房間限制"}</h3><ul><li>{english ? "Password rooms require 4–32 characters; only a one-way hash is stored." : "密碼房需要 4–32 字元；平台只保存不可逆雜湊。"}</li><li>{english ? "Player limits configured in the dashboard are 2–8. Teams require 2–4 teams." : "控制台的玩家上限為 2–8 人；分組模式需要 2–4 隊。"}</li><li>{english ? "An account can keep at most 5 open rooms in a room flow; public lists return at most 50 rooms." : "同一帳號在單一建房流程最多保留 5 個開啟房間；公開清單最多回傳 50 房。"}</li><li>{english ? "Inactive temporary rooms close after 10 minutes. The SDK renews active membership automatically." : "臨時房無活動 10 分鐘後關閉；SDK 會自動續租在線成員。"}</li></ul></article><article><h3>{english ? "Message limits" : "訊息限制"}</h3><ul><li>{english ? "JSON-compatible payloads, at most 8 KiB after serialization." : "訊息必須可轉為 JSON，序列化後最多 8 KiB。"}</li><li>{english ? "At most 30 sends per second per game page." : "每個遊戲頁每秒最多傳送 30 次。"}</li><li>{english ? "Messages are not echoed to the sender; update local state immediately when appropriate." : "訊息不會回送給發送者；需要時請立即更新本機狀態。"}</li><li>{english ? "No voice chat, durable chat history, or authoritative game server is provided." : "不提供語音、持久聊天紀錄或權威遊戲伺服器。"}</li></ul></article></div>
          <div className="developer-responsibility"><article><span>OpenGames</span><p>{english ? "Isolates credentials, verifies room membership, handles invite codes, private channels, presence, password hashes, and transport limits." : "隔離憑證、驗證房間成員，並處理邀請碼、私人頻道、Presence、密碼雜湊與傳輸限制。"}</p></article><article><span>{english ? "YOUR GAME" : "你的遊戲"}</span><p>{english ? "Builds the lobby, defines message schemas, chooses authority, assigns teams, validates moves, resynchronizes state, reconnects, and provides an offline fallback." : "實作大廳、訊息格式、權威規則、分隊、操作驗證、狀態重同步、重連與離線備援。"}</p></article></div>
          <aside className="developer-warning"><strong>{english ? "Capacity is not infinite" : "容量不是無限"}</strong><p>{english ? "Removing the OpenGames player cap from managed rooms does not remove Supabase connection or message quotas. Large worlds need sharding, load testing, and potentially paid capacity." : "移除受管房的 OpenGames 人數上限，不代表解除 Supabase 的連線或訊息配額。大型世界仍需要分流、負載測試，並可能需要付費容量。"}</p></aside>
        </section>

        <section id="errors" className="developer-section">
          <header><span>08</span><div><p>ERROR CONTRACT</p><h2>{english ? "Handle stable bridge errors" : "處理穩定的橋接錯誤"}</h2></div></header>
          <p className="developer-lead">{english ? "SDK promises reject with Error. Branch only on the stable codes below. Provider, database, browser, and network text may change; treat any unrecognized message as REQUEST_FAILED and offer retry or offline play." : "SDK Promise 失敗時會拋出 Error。只有下列代碼可作為穩定分支依據。供應商、資料庫、瀏覽器與網路文字可能變動；未知訊息一律視為 REQUEST_FAILED，並提供重試或離線遊玩。"}</p>
          <div className="developer-error-list">{errors.map(([code, explanation]) => <article key={code}><code>{code}</code><p>{english ? explanation : ({
            "The creator has not enabled this service.": "創作者尚未啟用這項服務。",
            "The player must sign in to an OpenGames account.": "玩家必須先登入 OpenGames 帳號。",
            "The save changed elsewhere; reload and ask the player which state to keep.": "存檔已在別處更新；重新載入並讓玩家選擇保留版本。",
            "The selected multiplayer mode is not enabled in the dashboard.": "控制台未啟用所選多人模式。",
            "The room policy does not allow player-created rooms.": "房間政策不允許玩家自行開房。",
            "The caller is not the verified creator or the policy disallows creator rooms.": "呼叫者不是已驗證創作者，或政策不允許創作者房。",
            "The game is not configured for a game-wide world.": "遊戲未設定全遊戲共用世界。",
            "Join or create a room before sending or closing.": "傳送或關房前必須先建立或加入房間。",
            "The serialized message exceeds 8 KiB.": "序列化後的訊息超過 8 KiB。",
            "The page sent more than 30 messages in one second.": "遊戲頁在一秒內傳送超過 30 則訊息。",
            "Only the room host can close this room.": "只有房主可以關閉房間。",
            "Realtime is unavailable in the current environment.": "目前環境無法使用 Realtime。",
            "The provider or connection rejected the operation; show retry or offline UI.": "供應商或連線拒絕操作；請顯示重試或離線介面。",
          } as Record<string, string>)[explanation]}</p></article>)}</div>
        </section>

        <section id="checklist" className="developer-section developer-final">
          <header><span>09</span><div><p>RELEASE CHECKLIST</p><h2>{english ? "Check the whole player journey" : "檢查完整玩家流程"}</h2></div></header>
          <ol className="developer-checklist"><li>{english ? "Serve the exported folder through HTTP; never validate only with file://." : "用 HTTP 伺服器開啟匯出資料夾，不要只用 file:// 測試。"}</li><li>{english ? "Test keyboard, mouse, touch, gamepad, audio, fullscreen, every scene, and mobile viewport." : "測試鍵盤、滑鼠、觸控、手把、音效、全螢幕、所有場景與手機視窗。"}</li><li>{english ? "Fix every Console error, missing Network request, MIME issue, and case mismatch." : "修正所有 Console 錯誤、Network 缺檔、MIME 問題與大小寫不符。"}</li><li>{english ? "Test signed-out, signed-in, save conflict, reconnect, room full, wrong password, host leaving, and offline fallback states." : "測試未登入、已登入、存檔衝突、重連、房滿、密碼錯誤、房主離開與離線備援。"}</li><li>{english ? "Confirm that no secret, token, private URL, personal data, or development-only asset is inside the ZIP or multiplayer payloads." : "確認 ZIP 與多人訊息都不含密鑰、權杖、私人網址、個資或開發用檔案。"}</li><li>{english ? "Run the local converter, recreate the ZIP from the output contents, then upload and play the published version once." : "執行本機轉換檢查，從輸出內容重新建立 ZIP，上傳後再實際玩一次正式版本。"}</li></ol>
          <div className="developer-final-actions"><a className="primary-button" href="/convert">{english ? "Check my build" : "檢查我的建置"} <span>↗</span></a><a className="secondary-button" href="/upload">{english ? "Upload the ZIP" : "上傳 ZIP"}</a></div>
        </section>
      </article>
    </div>
    <SiteFooter />
  </main>;
}
