"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  analyzeProjectFile,
  type AnalysisSignal,
  type ProjectAnalysis,
  type ProjectKind,
  type RecommendedStep,
} from "../../lib/project-analyzer";

function sizeLabel(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

const kindNames: Record<ProjectKind, [string, string]> = {
  "web-build": ["可發布的網頁建置", "Browser-ready web build"],
  "unity-project": ["Unity 原始專案", "Unity source project"],
  "dotnet-project": [".NET／C# 原始專案", ".NET / C# source project"],
  "cpp-project": ["C／C++ 原始專案", "C / C++ source project"],
  "godot-project": ["Godot 原始專案", "Godot source project"],
  "android-web-wrapper": ["含網頁資源的 Android APK", "Android APK with web assets"],
  "android-package": ["Android APK 成品", "Android APK binary"],
  "windows-executable": ["Windows EXE 成品", "Windows EXE binary"],
  "unknown-archive": ["尚未辨識的專案壓縮檔", "Unrecognized project archive"],
  "unsupported-file": ["不支援的檔案", "Unsupported file"],
};

const signalText: Record<AnalysisSignal, [string, string]> = {
  "root-index": ["根目錄含有 index.html", "index.html exists at the archive root"],
  "nested-index": ["找到 index.html，但不在 ZIP 根目錄", "index.html exists below the archive root"],
  "unity-source": ["找到 Unity Assets 與 ProjectSettings", "Unity Assets and ProjectSettings detected"],
  "unity-web-build": ["找到 Unity Web loader／unityweb 檔案", "Unity Web loader or unityweb files detected"],
  "dotnet-source": ["找到 .csproj／.sln 專案檔", ".csproj or .sln project files detected"],
  "dotnet-web-build": ["找到 .NET WebAssembly _framework", ".NET WebAssembly _framework detected"],
  "cpp-source": ["找到 C／C++ 原始碼", "C / C++ source files detected"],
  "emscripten-config": ["找到 CMake／Make 建置設定", "CMake or Make build configuration detected"],
  "godot-source": ["找到 project.godot", "project.godot detected"],
  "godot-csharp": ["此 Godot 專案同時包含 C# 專案檔", "This Godot project also contains C# project files"],
  "android-dex": ["APK 包含 Android DEX 程式碼", "Android DEX bytecode detected in the APK"],
  "android-native": ["APK 包含 Android 原生 .so 函式庫", "Android native .so libraries detected"],
  "android-web-assets": ["APK 的 assets 內找到網頁入口", "A web entry point exists inside APK assets"],
  "windows-pe": ["確認為 Windows PE 執行檔", "Confirmed Windows PE executable"],
  "webassembly": ["找到 WebAssembly 模組", "WebAssembly modules detected"],
  "javascript": ["找到 JavaScript 執行檔", "JavaScript runtime files detected"],
  "encrypted-entry": ["壓縮檔含有加密項目", "The archive contains encrypted entries"],
  "unsafe-path": ["壓縮檔含有不安全的相對路徑", "The archive contains unsafe relative paths"],
  "executable-only": ["壓縮檔內只有可執行成品，未辨識到原始專案", "Executable binaries were found without a recognized source project"],
};

const stepText: Record<RecommendedStep, [string, string]> = {
  "upload-ready": ["此 ZIP 已符合 OpenGames 網頁建置結構，可前往上傳。", "This ZIP matches the OpenGames web-build structure and is ready to upload."],
  "move-index-root": ["將網頁建置內容移到 ZIP 根目錄，讓 index.html 位於最外層。", "Move the web build to the ZIP root so index.html is at the top level."],
  "export-unity-web": ["使用相同 Unity 原始專案安裝 Web Build Support，輸出 Web 版本。", "Open the same Unity source project, install Web Build Support, and export a Web build."],
  "build-emscripten": ["使用 Emscripten／LLVM 將原始碼重新編譯成 WebAssembly。", "Recompile the source to WebAssembly with Emscripten / LLVM."],
  "adapt-browser-apis": ["檢查檔案系統、視窗、執行緒與 Socket API，改用瀏覽器相容實作。", "Replace filesystem, window, threading, and socket APIs with browser-compatible implementations."],
  "publish-dotnet-wasm": ["從原始 C# 專案建立 .NET WebAssembly 瀏覽器版本；桌面 UI 可能需要重寫。", "Publish a .NET WebAssembly browser build from the C# source; desktop UI may need to be rewritten."],
  "export-godot-web": ["從 Godot 原始專案選擇 Web 匯出；先檢查外掛與原生模組相容性。", "Export Web from the Godot source project after checking plugins and native modules."],
  "extract-web-wrapper-manually": ["這個 APK 可能是網頁封裝；請由擁有原始碼的人確認並重新輸出網頁資源。", "This APK may wrap web content; have the source owner verify and re-export the web assets."],
  "use-original-project": ["回到原始 Unity／Android Studio／Visual Studio 專案，而不是從成品反編譯。", "Use the original Unity, Android Studio, or Visual Studio project instead of decompiling the binary."],
  "cannot-auto-convert-binary": ["只有 EXE／APK 成品時不能可靠自動轉成網頁，也不會在本站執行。", "An EXE or APK binary cannot be reliably auto-converted and will not be executed here."],
  "review-unknown-project": ["請改上傳原始專案 ZIP，或已輸出的 Web 建置 ZIP。", "Upload a source-project ZIP or an exported Web-build ZIP instead."],
  "remove-encryption": ["移除 ZIP 密碼與加密項目後再檢查。", "Remove ZIP passwords and encrypted entries, then check again."],
  "remove-unsafe-paths": ["重新封裝並移除 ../ 或絕對路徑。", "Repackage the archive without ../ or absolute paths."],
};

function pick(locale: Locale, values: [string, string]) {
  return locale === "en" ? values[1] : values[0];
}

function verdictCopy(report: ProjectAnalysis) {
  const entries: Record<ProjectAnalysis["verdict"], { label: [string, string]; title: [string, string]; body: [string, string] }> = {
    ready: { label: ["可直接上傳", "READY"], title: ["這已經是網頁版本", "This is already a web build"], body: ["不需要再次轉檔；仍會在正式上傳時進行完整安全檢查。", "No conversion is needed. The full safety scan still runs during publishing."] },
    convertible: { label: ["可從原始專案轉換", "SOURCE CONVERTIBLE"], title: ["有原始專案，可以建立網頁版", "A web build can be created from this source"], body: ["這是初步結構辨識；實際編譯仍可能需要修改平台專用功能。", "This is a structural pre-check; platform-specific features may still require code changes."] },
    manual: { label: ["需要人工調整", "MANUAL CHANGES"], title: ["接近可用，但不能直接發布", "Close, but not ready to publish"], body: ["依照下方步驟調整後，再重新檢查。", "Follow the steps below and run the check again."] },
    "binary-only": { label: ["只有成品", "BINARY ONLY"], title: ["不能從這個成品可靠轉檔", "This binary cannot be reliably converted"], body: ["OpenGames 不會執行或反編譯 EXE／APK；請取得原始專案。", "OpenGames does not execute or decompile EXE / APK files. Obtain the source project instead."] },
    unsupported: { label: ["不支援", "UNSUPPORTED"], title: ["無法辨識此檔案", "This file is not supported"], body: ["目前可檢查 ZIP、APK 與 EXE。", "The checker currently accepts ZIP, APK, and EXE files."] },
  };
  return entries[report.verdict];
}

export default function Converter({ locale }: { locale: Locale }) {
  const english = locale === "en";
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ProjectAnalysis | null>(null);

  async function inspect(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    setReport(null);
    try {
      setReport(await analyzeProjectFile(file));
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "unknown";
      const messages: Record<string, [string, string]> = {
        "file-too-large": ["檔案超過本機分析上限 2 GiB。", "The file exceeds the 2 GiB local-analysis limit."],
        "invalid-zip": ["這不是有效或完整的 ZIP／APK。", "This is not a valid or complete ZIP / APK."],
        "zip64-unsupported": ["目前尚不支援 ZIP64；請拆分或重新建立一般 ZIP。", "ZIP64 is not supported yet. Split or recreate it as a standard ZIP."],
        "archive-too-complex": ["壓縮檔項目過多，或檔案目錄異常龐大。", "The archive has too many entries or an unusually large directory."],
      };
      setError(pick(locale, messages[code] ?? ["無法分析這個檔案，請確認檔案完整。", "The file could not be analyzed. Check that it is complete."]));
    } finally {
      setBusy(false);
    }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    void inspect(event.target.files?.[0]);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void inspect(event.dataTransfer.files?.[0]);
  }

  function reset() {
    setReport(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const verdict = report ? verdictCopy(report) : null;
  return <section className="converter-shell">
    <div className="converter-intro">
      <div><span className="local-only-dot" />{english ? "LOCAL-ONLY ANALYSIS" : "只在本機分析"}</div>
      <p>{english ? "Your file stays in this browser. OpenGames reads only archive filenames and executable headers—never runs the program." : "檔案留在你的瀏覽器。OpenGames 只讀取壓縮檔目錄與執行檔檔頭，絕不執行程式。"}</p>
    </div>

    <div className={`converter-drop ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <span>ZIP / APK / EXE</span>
      <h2>{busy ? (english ? "Inspecting locally…" : "正在本機檢查…") : (english ? "Drop a project or finished binary here" : "將原始專案或成品拖到這裡")}</h2>
      <p>{english ? "Project ZIPs receive a web-conversion assessment. APK and EXE files are identified only and never uploaded." : "原始專案 ZIP 會取得網頁轉換評估；APK／EXE 只辨識、不會上傳。"}</p>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{english ? "Choose a file" : "選擇檔案"} <b>↗</b></button>
      <input ref={inputRef} className="visually-hidden" type="file" accept=".zip,.apk,.exe,application/zip,application/vnd.android.package-archive,application/x-msdownload" onChange={choose} />
      <small>{english ? "Maximum 2 GiB · metadata only · no server upload" : "最多 2 GiB・只讀取中繼資料・不上傳伺服器"}</small>
    </div>

    {error && <div className="converter-error" role="alert"><strong>{english ? "Analysis stopped" : "分析已停止"}</strong><span>{error}</span></div>}

    {report && verdict && <section className={`conversion-report verdict-${report.verdict}`} aria-live="polite">
      <header>
        <div><span>{pick(locale, verdict.label)}</span><h2>{pick(locale, verdict.title)}</h2><p>{pick(locale, verdict.body)}</p></div>
        <div className="verdict-mark" aria-hidden="true">{report.verdict === "ready" ? "✓" : report.verdict === "binary-only" ? "×" : "→"}</div>
      </header>
      <div className="report-facts">
        <div><span>{english ? "Detected type" : "辨識類型"}</span><strong>{pick(locale, kindNames[report.kind])}</strong></div>
        <div><span>{english ? "File" : "檔案"}</span><strong title={report.fileName}>{report.fileName}</strong></div>
        <div><span>{english ? "Local size" : "本機大小"}</span><strong>{sizeLabel(report.fileSize)}</strong></div>
        <div><span>{english ? "Archive entries" : "壓縮項目"}</span><strong>{report.entryCount ? report.entryCount.toLocaleString(english ? "en-US" : "zh-TW") : "—"}</strong></div>
      </div>
      <div className="report-columns">
        <article><span>01 / {english ? "EVIDENCE" : "辨識依據"}</span><h3>{english ? "What was detected" : "偵測到的內容"}</h3>{report.signals.length ? <ul>{report.signals.map((signal) => <li key={signal}>{pick(locale, signalText[signal])}</li>)}</ul> : <p>{english ? "No known project markers were found." : "沒有找到已知的專案標記。"}</p>}{report.examples.length > 0 && <div className="file-examples">{report.examples.map((item) => <code key={item}>{item}</code>)}</div>}</article>
        <article><span>02 / {english ? "NEXT" : "下一步"}</span><h3>{english ? "Recommended actions" : "建議處理方式"}</h3><ol>{report.steps.map((step) => <li key={step}>{pick(locale, stepText[step])}</li>)}</ol></article>
      </div>
      <div className="report-footer"><button type="button" className="secondary-button" onClick={reset}>{english ? "Check another file" : "檢查另一個檔案"}</button>{report.readyToUpload ? <a className="primary-button" href="/upload">{english ? "Continue to upload" : "前往上傳作品"} <span>↗</span></a> : <a className="text-action" href="/guidelines">{english ? "Read publishing requirements" : "查看發布規範"} →</a>}</div>
    </section>}
  </section>;
}
