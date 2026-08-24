import { SiteFooter, SiteHeader } from "../../components/SiteHeader";
import { getLocale, type Locale } from "../../lib/i18n";

type Guide = {
  id: string;
  badge: string;
  title: string;
  lead: string;
  steps: Array<{ title: string; body: string }>;
  command?: string;
  commandLabel?: string;
  note?: string;
  sourceHref: string;
  sourceLabel: string;
};

const content = {
  "zh-Hant": {
    heroTitle: "把你的遊戲，\n正確帶進瀏覽器。",
    heroBody: "從原始專案匯出 Web 版本、在本機測試，再封裝成 OpenGames 可接受的 ZIP。所有步驟都在你的電腦完成。",
    status: "免費教學・不需要編譯伺服器",
    chooseTitle: "先確認你手上的是什麼",
    chooseBody: "只有原始專案才能可靠建立網頁版本。若只有 EXE／APK，請先向原作者取得 Unity、Visual Studio、Godot 或 C／C++ 專案。",
    chooseCards: [
      ["UNITY", "Unity 專案", "找到 Assets 與 ProjectSettings 資料夾", "#unity"],
      ["C++", "C／C++ 專案", "找到 .cpp、CMakeLists.txt 或 Makefile", "#cpp"],
      ["C#", ".NET／C# 專案", "找到 .csproj 或 .sln；Unity 專案請看 Unity", "#dotnet"],
      ["GODOT", "Godot 專案", "找到 project.godot；Godot 4 C# 有限制", "#godot"],
    ],
    guides: [
      {
        id: "unity", badge: "01 / UNITY WEB", title: "Unity C# → Web 建置", lead: "必須從 Unity 原始專案重新建立 Web 版本；Windows EXE 或 Android APK 不能代替原始專案。",
        steps: [
          { title: "安裝對應版本的 Web 模組", body: "開啟 Unity Hub，在該 Editor 版本的模組管理中加入 Web Build Support。Editor 版本應與專案使用的版本一致。" },
          { title: "建立 Web Build Profile", body: "在 Unity 選擇 File → Build Profiles → Add Build Profile → Web，加入後切換到這個 Profile。" },
          { title: "確認場景與瀏覽器相容性", body: "加入要發布的 Scenes，關閉 Development Build。避免依賴原生 DLL、直接 Socket、桌面檔案系統及需要 SharedArrayBuffer 的多執行緒套件。" },
          { title: "輸出到全新的空資料夾", body: "按 Build，選擇空資料夾。完成後應看到 index.html、Build 資料夾，以及 Unity 產生的其他資源。" },
          { title: "壓縮輸出內容", body: "進入輸出資料夾後選取裡面的所有檔案再建立 ZIP，不能把外層資料夾一起包進去。" },
        ],
        note: "OpenGames 目前建議單執行緒相容建置。若套件強制使用 SharedArrayBuffer，遊戲可能無法啟動。",
        sourceHref: "https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-gettingstarted.html", sourceLabel: "Unity 6 官方 Web 開發與發布流程",
      },
      {
        id: "cpp", badge: "02 / C · C++ · WASM", title: "C／C++ → Emscripten WebAssembly", lead: "Emscripten 會重新編譯原始碼；使用 Windows API、桌面視窗、同步檔案或原生 Socket 的部分通常需要修改。",
        steps: [
          { title: "安裝並啟用 Emscripten SDK", body: "在 Windows 安裝 emsdk，啟用後使用 Emscripten Command Prompt。每次開啟新的終端機都要先載入 emsdk 環境。" },
          { title: "先建立最小可執行版本", body: "用 em++ 編譯 C++，並將輸出指定為 index.html。大型 CMake 專案應使用 emcmake，而不是把所有原始碼塞進單一指令。" },
          { title: "處理遊戲迴圈與瀏覽器 API", body: "不能用永不返回的桌面 while 迴圈阻塞頁面；改用 Emscripten main loop。SDL、OpenGL ES 與部分 POSIX 功能可移植，但仍須逐項測試。" },
          { title: "把素材預載進虛擬檔案系統", body: "如果程式用 fopen 讀取 assets，使用 --preload-file 將素材加入建置。不要把密鑰或私人檔案一起編進去。" },
          { title: "使用本機 HTTP 伺服器測試", body: "用 emrun 開啟輸出的 index.html；不要直接雙擊 HTML，否則瀏覽器的 CORS 規則可能阻擋資源。" },
        ],
        commandLabel: "最小 Windows 範例（請依專案調整）",
        command: "em++ src/main.cpp -O3 --preload-file assets -o build/index.html\nemrun build/index.html",
        note: "遊戲仍不能直接連到外部 API、TCP 或任意伺服器；帳號存檔與多人連線請在控制台開啟遊戲服務，並使用 OpenGames SDK 教學。",
        sourceHref: "https://emscripten.org/docs/getting_started/Tutorial.html", sourceLabel: "Emscripten 官方入門教學",
      },
      {
        id: "dotnet", badge: "03 / C# · .NET WASM", title: "C# → .NET WebAssembly", lead: "這條路適用於可發布成靜態檔案的獨立 Blazor WebAssembly 專案；WinForms、WPF、MAUI Android 或需要 ASP.NET 伺服器的程式不能直接放進 OpenGames。",
        steps: [
          { title: "先判斷 C# 專案類型", body: "Unity C# 請使用上方 Unity 流程。若是 WinForms／WPF，需要重新製作瀏覽器 UI；若是獨立 Blazor WebAssembly，可繼續發布。" },
          { title: "移除桌面與伺服器相依功能", body: "瀏覽器不能直接使用 Windows Registry、本機任意檔案、原生 DLL 或監聽連接埠。需要後端資料庫或 ASP.NET Server 的專案目前不適用。" },
          { title: "以 Release 模式發布", body: "在包含 .csproj 的專案目錄執行 dotnet publish -c Release。發布會產生瀏覽器所需的靜態檔案。" },
          { title: "找到獨立 WebAssembly 的 wwwroot", body: "在 bin/Release/{目標框架}/publish/wwwroot 或 browser-wasm/publish 內找到 index.html 與 _framework。只壓縮 wwwroot 裡面的內容。" },
          { title: "本機測試完整載入", body: "確認首頁、路由、字型和 _framework 檔案都能透過 HTTP 載入，並檢查瀏覽器主控台沒有 404。" },
        ],
        commandLabel: ".NET CLI",
        command: "dotnet publish -c Release",
        note: "若發布結果需要一個持續運作的 ASP.NET Server，便不是純靜態 WebAssembly 建置，不能當作 OpenGames 遊戲 ZIP 上傳。",
        sourceHref: "https://learn.microsoft.com/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-10.0", sourceLabel: "Microsoft 官方 Blazor WebAssembly 發布文件",
      },
      {
        id: "godot", badge: "04 / GODOT WEB", title: "Godot → Web 匯出", lead: "Godot 的 GDScript 專案可使用 Web 匯出；Godot 4 的 C# 專案目前不能匯出 Web。",
        steps: [
          { title: "確認腳本語言與 Renderer", body: "Godot 4 C# 專案目前不適用。一般 Web 發布建議先用 Compatibility renderer，並移除不支援 Web 的原生外掛。" },
          { title: "安裝 Export Templates", body: "若 Godot 顯示缺少匯出範本，先從 Editor → Manage Export Templates 安裝與 Editor 同版本的範本。" },
          { title: "新增 Web Preset", body: "開啟 Project → Export，選擇 Add… → Web，確認要匯出的資源與主場景。" },
          { title: "輸出為 index.html", body: "將輸出檔名設為 index.html，並匯出到新的空資料夾。Godot 會產生 HTML、JavaScript、Wasm 與 PCK 等檔案。" },
          { title: "透過 HTTP 測試並封裝", body: "使用本機伺服器測試，再將輸出資料夾內的所有檔案直接壓縮成 ZIP。" },
        ],
        note: "如果專案是 Godot 4 C#，請保留原始專案並改用受支援的 Web 技術；不要嘗試從 Windows EXE 反向轉換。",
        sourceHref: "https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html", sourceLabel: "Godot 官方 Web 匯出文件",
      },
    ] satisfies Guide[],
    packageTitle: "最後一步：正確封裝 ZIP",
    packageLead: "OpenGames 會從 ZIP 根目錄尋找 index.html。最常見的錯誤，是把整個輸出資料夾再包進一層。",
    good: "正確",
    bad: "錯誤",
    packageRules: ["ZIP 最大 50 MiB", "解壓後最大 250 MiB", "最多 2,000 個檔案", "不能加密或設定密碼", "不要包含 EXE、APK、安裝程式或密鑰", "原始碼請使用獨立的 GitHub 網址分享"],
    testTitle: "發布前的本機檢查",
    testSteps: ["在輸出資料夾開啟終端機。", "執行 py -m http.server 8080（或使用 emrun）。", "前往 http://localhost:8080。", "測試鍵盤、滑鼠、觸控、音效、全螢幕與所有關卡。", "按 F12 檢查 Console 與 Network，修正所有 404、Wasm 載入和路徑錯誤。", "重新建立 ZIP，再到轉換中心檢查。"],
    troubleTitle: "常見問題",
    troubleRows: [
      ["打開後白畫面", "通常是 index.html 路徑、素材路徑或瀏覽器 Console 錯誤。請先用本機 HTTP 測試。"],
      ["找不到 index.html", "打開 ZIP 後第一層就必須看見 index.html，不能先看到 build、release 或遊戲名稱資料夾。"],
      ["Wasm／素材出現 404", "改用相對路徑，並確認所有建置輸出都在 ZIP 中；注意大小寫。"],
      ["SharedArrayBuffer 錯誤", "目前請建立不依賴跨來源隔離的單執行緒版本。"],
      ["外部 API／多人連線失敗", "沙箱會封鎖任意外部連線。帳號存檔與多人連線請使用 OpenGames SDK，並保留離線備援。"],
      ["ZIP 太大", "移除 Development Build、除錯符號與未使用素材，壓縮音訊／貼圖，並啟用引擎的 Release 最佳化。"],
      ["我只有 EXE／APK", "無法可靠轉換。向原作者取得原始專案，或由原作者依本頁重新匯出 Web 版本。"],
    ],
    ctaTitle: "準備好了嗎？",
    ctaBody: "先讓轉換中心檢查 ZIP；確認為可發布的網頁建置後，再登入上傳。",
    ctaCheck: "檢查我的檔案",
    ctaUpload: "前往上傳",
  },
  en: {
    heroTitle: "Bring your game\nto the browser—properly.",
    heroBody: "Export a Web build from the source project, test it locally, and package a ZIP that OpenGames can accept. Every build step stays on your computer.",
    status: "Free guide · no compilation server required",
    chooseTitle: "First, identify what you have",
    chooseBody: "Only a source project can reliably produce a Web build. If you only have an EXE or APK, ask the original creator for the Unity, Visual Studio, Godot, or C/C++ project.",
    chooseCards: [
      ["UNITY", "Unity project", "Look for Assets and ProjectSettings", "#unity"],
      ["C++", "C / C++ project", "Look for .cpp, CMakeLists.txt, or Makefile", "#cpp"],
      ["C#", ".NET / C# project", "Look for .csproj or .sln; use Unity above when applicable", "#dotnet"],
      ["GODOT", "Godot project", "Look for project.godot; Godot 4 C# is limited", "#godot"],
    ],
    guides: [
      {
        id: "unity", badge: "01 / UNITY WEB", title: "Unity C# → Web build", lead: "Rebuild from the Unity source project. A Windows EXE or Android APK is not a substitute for the source.",
        steps: [
          { title: "Install Web support for the matching Editor", body: "In Unity Hub, add Web Build Support to the Editor version used by the project." },
          { title: "Create a Web Build Profile", body: "Choose File → Build Profiles → Add Build Profile → Web, add it, then switch to that profile." },
          { title: "Check scenes and browser compatibility", body: "Add the scenes to publish and turn off Development Build. Avoid native DLLs, raw sockets, desktop filesystem access, and packages that require SharedArrayBuffer." },
          { title: "Build into a new empty folder", body: "Select Build and choose an empty folder. The output should contain index.html, a Build folder, and Unity's supporting assets." },
          { title: "ZIP the output contents", body: "Enter the output folder, select everything inside, and create the ZIP. Do not wrap it in another outer folder." },
        ],
        note: "OpenGames currently recommends a single-thread-compatible build. Packages that require SharedArrayBuffer may fail to start.",
        sourceHref: "https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-gettingstarted.html", sourceLabel: "Official Unity 6 Web workflow",
      },
      {
        id: "cpp", badge: "02 / C · C++ · WASM", title: "C / C++ → Emscripten WebAssembly", lead: "Emscripten recompiles source code. Windows APIs, desktop windows, synchronous files, and native sockets usually require changes.",
        steps: [
          { title: "Install and activate the Emscripten SDK", body: "Install emsdk on Windows and use the Emscripten Command Prompt. Load the emsdk environment in each new terminal." },
          { title: "Create a minimal working build first", body: "Compile C++ with em++ and output index.html. Large CMake projects should use emcmake instead of placing every source file in one command." },
          { title: "Adapt the game loop and browser APIs", body: "A desktop while loop must not block the page. Use the Emscripten main loop and test SDL, OpenGL ES, and POSIX features individually." },
          { title: "Preload game assets", body: "If the program reads assets with fopen, add them with --preload-file. Never compile private keys or personal files into the build." },
          { title: "Test through a local HTTP server", body: "Use emrun to open the generated index.html. Double-clicking the HTML may fail because of browser CORS rules." },
        ],
        commandLabel: "Minimal Windows example—adapt it to your project",
        command: "em++ src/main.cpp -O3 --preload-file assets -o build/index.html\nemrun build/index.html",
        note: "Direct external APIs, TCP, and arbitrary servers remain blocked. For account saves and multiplayer, enable Game services and use the OpenGames SDK guide.",
        sourceHref: "https://emscripten.org/docs/getting_started/Tutorial.html", sourceLabel: "Official Emscripten tutorial",
      },
      {
        id: "dotnet", badge: "03 / C# · .NET WASM", title: "C# → .NET WebAssembly", lead: "This path is for standalone Blazor WebAssembly projects that publish to static files. WinForms, WPF, MAUI Android, and apps that require an ASP.NET server cannot be uploaded directly.",
        steps: [
          { title: "Identify the C# project type", body: "Use the Unity guide for Unity C#. WinForms and WPF require a browser UI rewrite. Continue here for standalone Blazor WebAssembly." },
          { title: "Remove desktop and server dependencies", body: "Browsers cannot directly use the Windows Registry, arbitrary local files, native DLLs, or listening ports. Apps that need a backend are not supported here." },
          { title: "Publish in Release mode", body: "Run dotnet publish -c Release in the directory containing the .csproj file." },
          { title: "Find the standalone wwwroot", body: "Locate index.html and _framework under bin/Release/{target framework}/publish/wwwroot or browser-wasm/publish. ZIP only the contents of wwwroot." },
          { title: "Test a complete local load", body: "Verify routes, fonts, and _framework assets load over HTTP with no 404 errors in the browser console." },
        ],
        commandLabel: ".NET CLI",
        command: "dotnet publish -c Release",
        note: "If the published result needs a continuously running ASP.NET Server, it is not a static WebAssembly build and cannot be uploaded as an OpenGames game ZIP.",
        sourceHref: "https://learn.microsoft.com/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-10.0", sourceLabel: "Official Microsoft Blazor WebAssembly deployment guide",
      },
      {
        id: "godot", badge: "04 / GODOT WEB", title: "Godot → Web export", lead: "Godot projects using GDScript can export to Web. Godot 4 C# projects currently cannot export to Web.",
        steps: [
          { title: "Check the language and renderer", body: "Godot 4 C# isn't supported for Web export. For regular Web projects, prefer the Compatibility renderer and remove native plugins without Web support." },
          { title: "Install Export Templates", body: "If templates are missing, use Editor → Manage Export Templates and install the version that matches the Editor." },
          { title: "Add a Web preset", body: "Open Project → Export, choose Add… → Web, and confirm the resources and main scene." },
          { title: "Export as index.html", body: "Export into a new empty folder with index.html as the filename. Godot creates HTML, JavaScript, Wasm, and PCK files." },
          { title: "Test over HTTP and package", body: "Test through a local server, then ZIP every file directly inside the output folder." },
        ],
        note: "For Godot 4 C#, keep the source project and move to a supported Web technology. Do not attempt to reverse-convert the Windows EXE.",
        sourceHref: "https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html", sourceLabel: "Official Godot Web export guide",
      },
    ] satisfies Guide[],
    packageTitle: "Final step: package the ZIP correctly",
    packageLead: "OpenGames looks for index.html at the ZIP root. The most common error is wrapping the build inside one extra folder.",
    good: "Correct",
    bad: "Wrong",
    packageRules: ["ZIP up to 50 MiB", "Up to 250 MiB extracted", "Up to 2,000 files", "No encryption or password", "Do not include EXE, APK, installers, or secrets", "Share source separately with a GitHub URL"],
    testTitle: "Local checks before publishing",
    testSteps: ["Open a terminal in the build folder.", "Run py -m http.server 8080, or use emrun.", "Open http://localhost:8080.", "Test keyboard, mouse, touch, audio, fullscreen, and every level.", "Press F12 and check Console and Network; fix all 404, Wasm, and path errors.", "Recreate the ZIP and check it in the Converter."],
    troubleTitle: "Common problems",
    troubleRows: [
      ["Blank screen", "Usually an index.html path, asset path, or browser Console error. Test over local HTTP first."],
      ["index.html not found", "Opening the ZIP must show index.html immediately—not a build, release, or game-name folder."],
      ["Wasm or assets return 404", "Use relative paths, include every build output, and check letter case."],
      ["SharedArrayBuffer error", "Create a single-thread build that doesn't require cross-origin isolation."],
      ["External API or multiplayer fails", "The sandbox blocks arbitrary external connections. Use the OpenGames SDK for approved account saves and multiplayer, and keep an offline fallback."],
      ["ZIP is too large", "Remove Development Build data, debug symbols, and unused assets; optimize textures and audio."],
      ["I only have an EXE or APK", "It cannot be reliably converted. Obtain the source project or ask the creator to export Web."],
    ],
    ctaTitle: "Ready to continue?",
    ctaBody: "Check the ZIP in the Converter first. Sign in and publish after it is recognized as a browser-ready build.",
    ctaCheck: "Check my file",
    ctaUpload: "Go to upload",
  },
};

function GuideBlock({ guide }: { guide: Guide }) {
  return <section className="guide-block" id={guide.id}>
    <header><span>{guide.badge}</span><h2>{guide.title}</h2><p>{guide.lead}</p></header>
    <ol className="guide-steps">{guide.steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol>
    {guide.command && <div className="guide-command"><span>{guide.commandLabel}</span><pre><code>{guide.command}</code></pre></div>}
    {guide.note && <aside className="guide-note"><strong>OPEN GAMES / NOTE</strong><p>{guide.note}</p></aside>}
    <a className="official-guide" href={guide.sourceHref} target="_blank" rel="noreferrer">{guide.sourceLabel} <span>↗</span></a>
  </section>;
}

export default async function GuidesPage() {
  const locale: Locale = await getLocale();
  const page = content[locale];
  const [heroFirst, heroSecond] = page.heroTitle.split("\n");
  return <main>
    <SiteHeader />
    <section className="page-hero guides-hero"><p className="eyebrow"><span /> CREATOR EXPORT GUIDE</p><h1>{heroFirst}<br />{heroSecond}</h1><p>{page.heroBody}</p><div className="guide-status"><i />{page.status}</div></section>
    <div className="guides-shell">
      <section className="guide-chooser" id="choose"><header><span>00 / START HERE</span><h2>{page.chooseTitle}</h2><p>{page.chooseBody}</p></header><div>{page.chooseCards.map(([badge, title, body, href]) => <a key={badge} href={href}><span>{badge}</span><strong>{title}</strong><p>{body}</p><b>↓</b></a>)}</div></section>
      <nav className="guide-jump" aria-label={locale === "en" ? "Guide sections" : "教學章節"}>{page.guides.map((guide) => <a key={guide.id} href={`#${guide.id}`}>{guide.badge.split(" / ")[1]}</a>)}<a href="#package">ZIP</a><a href="#troubleshooting">FAQ</a><a href="/guides/platform-services">OpenGames SDK</a></nav>
      {page.guides.map((guide) => <GuideBlock guide={guide} key={guide.id} />)}
      <section className="package-guide" id="package"><header><span>05 / PACKAGE</span><h2>{page.packageTitle}</h2><p>{page.packageLead}</p></header><div className="zip-examples"><article className="zip-good"><span>✓ {page.good}</span><pre>{`game.zip\n├─ index.html\n├─ Build/ or _framework/\n├─ game.wasm\n└─ assets/`}</pre></article><article className="zip-bad"><span>× {page.bad}</span><pre>{`game.zip\n└─ MyGameBuild/\n   ├─ index.html\n   └─ Build/`}</pre></article></div><ul className="package-rules">{page.packageRules.map((rule) => <li key={rule}>{rule}</li>)}</ul></section>
      <section className="local-test-guide"><div><span>06 / LOCAL TEST</span><h2>{page.testTitle}</h2></div><ol>{page.testSteps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol><pre><code>py -m http.server 8080</code></pre></section>
      <section className="trouble-guide" id="troubleshooting"><header><span>07 / TROUBLESHOOTING</span><h2>{page.troubleTitle}</h2></header><div>{page.troubleRows.map(([problem, answer]) => <article key={problem}><h3>{problem}</h3><p>{answer}</p></article>)}</div></section>
      <section className="guide-cta"><div><p className="eyebrow light"><span /> READY TO SHIP</p><h2>{page.ctaTitle}</h2><p>{page.ctaBody}</p></div><div><a className="light-button" href="/convert">{page.ctaCheck} <span>↗</span></a><a href="/upload">{page.ctaUpload} →</a></div></section>
    </div>
    <SiteFooter />
  </main>;
}
