export type ProjectKind =
  | "web-build"
  | "unity-project"
  | "dotnet-project"
  | "cpp-project"
  | "godot-project"
  | "android-web-wrapper"
  | "android-package"
  | "windows-executable"
  | "unknown-archive"
  | "unsupported-file";

export type ConversionVerdict = "ready" | "convertible" | "manual" | "binary-only" | "unsupported";

export type AnalysisSignal =
  | "root-index"
  | "nested-index"
  | "unity-source"
  | "unity-web-build"
  | "dotnet-source"
  | "dotnet-web-build"
  | "cpp-source"
  | "emscripten-config"
  | "godot-source"
  | "godot-csharp"
  | "android-dex"
  | "android-native"
  | "android-web-assets"
  | "windows-pe"
  | "webassembly"
  | "javascript"
  | "encrypted-entry"
  | "unsafe-path"
  | "executable-only";

export type RecommendedStep =
  | "upload-ready"
  | "move-index-root"
  | "export-unity-web"
  | "build-emscripten"
  | "adapt-browser-apis"
  | "publish-dotnet-wasm"
  | "export-godot-web"
  | "extract-web-wrapper-manually"
  | "use-original-project"
  | "cannot-auto-convert-binary"
  | "review-unknown-project"
  | "remove-encryption"
  | "remove-unsafe-paths";

export type ArchiveEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  encrypted: boolean;
};

export type ProjectAnalysis = {
  fileName: string;
  fileSize: number;
  kind: ProjectKind;
  verdict: ConversionVerdict;
  confidence: "high" | "medium" | "low";
  entryCount: number;
  declaredUncompressedSize: number;
  signals: AnalysisSignal[];
  steps: RecommendedStep[];
  examples: string[];
  readyToUpload: boolean;
};

const MAX_CENTRAL_DIRECTORY = 16 * 1024 * 1024;
const MAX_ENTRIES = 10_000;
const MAX_LOCAL_FILE_SIZE = 2 * 1024 * 1024 * 1024;

function extension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function addUnique<T>(items: T[], value: T) {
  if (!items.includes(value)) items.push(value);
}

function normalizeEntryName(name: string) {
  return name.replaceAll("\\", "/").replace(/^\.\//, "");
}

function containsPath(names: string[], pattern: RegExp) {
  return names.some((name) => pattern.test(name));
}

function firstMatches(names: string[], patterns: RegExp[]) {
  return names.filter((name) => patterns.some((pattern) => pattern.test(name))).slice(0, 5);
}

export function classifyArchiveEntries(fileName: string, entries: ArchiveEntry[]): ProjectAnalysis {
  const names = entries.map((entry) => normalizeEntryName(entry.name));
  const lower = names.map((name) => name.toLowerCase());
  const signals: AnalysisSignal[] = [];
  const steps: RecommendedStep[] = [];
  const examples: string[] = [];
  const declaredUncompressedSize = entries.reduce((total, entry) => total + entry.uncompressedSize, 0);
  const isApk = extension(fileName) === "apk";

  const rootIndex = lower.includes("index.html");
  const nestedIndex = !rootIndex && containsPath(lower, /(^|\/)index\.html$/);
  const unitySource = containsPath(lower, /(^|\/)assets\//) && containsPath(lower, /(^|\/)projectsettings\/projectversion\.txt$/);
  const unityWeb = containsPath(lower, /(^|\/)build\/[^/]+\.loader\.js$/) || containsPath(lower, /\.unityweb$/);
  const dotnetWeb = containsPath(lower, /(^|\/)_framework\/dotnet[^/]*\.js$/) || containsPath(lower, /(^|\/)_framework\/[^/]+\.wasm$/);
  const dotnetSource = containsPath(lower, /\.(csproj|sln)$/);
  const cppSource = containsPath(lower, /\.(c|cc|cpp|cxx|h|hpp)$/);
  const emscriptenConfig = lower.includes("cmakelists.txt") || containsPath(lower, /(^|\/)(makefile|meson\.build)$/);
  const godotSource = containsPath(lower, /(^|\/)project\.godot$/);
  const hasWasm = containsPath(lower, /\.wasm(\.br|\.gz)?$/);
  const hasJavaScript = containsPath(lower, /\.(js|mjs)$/);
  const hasDex = lower.includes("classes.dex");
  const hasAndroidNative = containsPath(lower, /(^|\/)lib\/(arm64-v8a|armeabi-v7a|x86|x86_64)\/[^/]+\.so$/);
  const hasAndroidWebAssets = containsPath(lower, /(^|\/)assets\/(www|public)\/index\.html$/);
  const hasExecutable = containsPath(lower, /\.(exe|msi)$/);
  const hasEncryptedEntry = entries.some((entry) => entry.encrypted);
  const hasUnsafePath = names.some((name) => name.startsWith("/") || /(^|\/)\.\.($|\/)/.test(name));

  if (rootIndex) addUnique(signals, "root-index");
  if (nestedIndex) addUnique(signals, "nested-index");
  if (unitySource) addUnique(signals, "unity-source");
  if (unityWeb) addUnique(signals, "unity-web-build");
  if (dotnetSource) addUnique(signals, "dotnet-source");
  if (dotnetWeb) addUnique(signals, "dotnet-web-build");
  if (cppSource) addUnique(signals, "cpp-source");
  if (emscriptenConfig) addUnique(signals, "emscripten-config");
  if (godotSource) addUnique(signals, "godot-source");
  if (godotSource && dotnetSource) addUnique(signals, "godot-csharp");
  if (hasWasm) addUnique(signals, "webassembly");
  if (hasJavaScript) addUnique(signals, "javascript");
  if (hasDex) addUnique(signals, "android-dex");
  if (hasAndroidNative) addUnique(signals, "android-native");
  if (hasAndroidWebAssets) addUnique(signals, "android-web-assets");
  if (hasExecutable) addUnique(signals, "executable-only");
  if (hasEncryptedEntry) addUnique(signals, "encrypted-entry");
  if (hasUnsafePath) addUnique(signals, "unsafe-path");

  examples.push(...firstMatches(names, [
    /(^|\/)index\.html$/i,
    /\.loader\.js$/i,
    /(^|\/)_framework\/dotnet[^/]*\.js$/i,
    /\.(csproj|sln|uproject)$/i,
    /(^|\/)project\.godot$/i,
    /(^|\/)projectsettings\/projectversion\.txt$/i,
    /cmakelists\.txt$/i,
    /classes\.dex$/i,
  ]));

  let kind: ProjectKind = "unknown-archive";
  let verdict: ConversionVerdict = "manual";
  let confidence: ProjectAnalysis["confidence"] = "low";

  if (isApk) {
    if (hasAndroidWebAssets) {
      kind = "android-web-wrapper";
      verdict = "manual";
      confidence = "high";
      steps.push("extract-web-wrapper-manually", "use-original-project");
    } else {
      kind = "android-package";
      verdict = "binary-only";
      confidence = "high";
      steps.push("cannot-auto-convert-binary", "use-original-project");
    }
  } else if (rootIndex && (unityWeb || dotnetWeb || hasWasm || hasJavaScript)) {
    kind = "web-build";
    verdict = "ready";
    confidence = "high";
    steps.push("upload-ready");
  } else if (unitySource) {
    kind = "unity-project";
    verdict = "convertible";
    confidence = "high";
    steps.push("export-unity-web");
  } else if (godotSource) {
    kind = "godot-project";
    verdict = godotSource && dotnetSource ? "manual" : "convertible";
    confidence = "high";
    steps.push(godotSource && dotnetSource ? "use-original-project" : "export-godot-web");
  } else if (dotnetSource) {
    kind = "dotnet-project";
    verdict = "convertible";
    confidence = "high";
    steps.push("publish-dotnet-wasm", "adapt-browser-apis");
  } else if (cppSource) {
    kind = "cpp-project";
    verdict = "convertible";
    confidence = emscriptenConfig ? "high" : "medium";
    steps.push("build-emscripten", "adapt-browser-apis");
  } else if (nestedIndex && (unityWeb || dotnetWeb || hasWasm || hasJavaScript)) {
    kind = "web-build";
    verdict = "manual";
    confidence = "high";
    steps.push("move-index-root");
  } else if (hasExecutable) {
    kind = "windows-executable";
    verdict = "binary-only";
    confidence = "high";
    steps.push("cannot-auto-convert-binary", "use-original-project");
  } else {
    steps.push("review-unknown-project");
  }

  if (hasEncryptedEntry) steps.push("remove-encryption");
  if (hasUnsafePath) steps.push("remove-unsafe-paths");
  const readyToUpload = verdict === "ready" && !hasEncryptedEntry && !hasUnsafePath;

  return {
    fileName,
    fileSize: 0,
    kind,
    verdict: readyToUpload ? verdict : verdict === "ready" ? "manual" : verdict,
    confidence,
    entryCount: entries.length,
    declaredUncompressedSize,
    signals,
    steps,
    examples,
    readyToUpload,
  };
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x05 && bytes[offset + 3] === 0x06) return offset;
  }
  return -1;
}

async function readArchiveEntries(file: File): Promise<ArchiveEntry[]> {
  if (file.size > MAX_LOCAL_FILE_SIZE) throw new Error("file-too-large");
  const tailLength = Math.min(file.size, 65_557);
  const tail = new Uint8Array(await file.slice(file.size - tailLength).arrayBuffer());
  const endOffset = findEndOfCentralDirectory(tail);
  if (endOffset < 0) throw new Error("invalid-zip");
  const end = new DataView(tail.buffer, tail.byteOffset + endOffset);
  const entryCount = end.getUint16(10, true);
  const centralSize = end.getUint32(12, true);
  const centralOffset = end.getUint32(16, true);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error("zip64-unsupported");
  if (entryCount > MAX_ENTRIES || centralSize > MAX_CENTRAL_DIRECTORY) throw new Error("archive-too-complex");
  if (centralOffset + centralSize > file.size) throw new Error("invalid-zip");

  const centralBytes = new Uint8Array(await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const view = new DataView(centralBytes.buffer, centralBytes.byteOffset, centralBytes.byteLength);
  const decoder = new TextDecoder("utf-8");
  const entries: ArchiveEntry[] = [];
  let offset = 0;
  while (offset + 46 <= centralBytes.length && entries.length < entryCount) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("invalid-zip");
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nameStart = offset + 46;
    const nextOffset = nameStart + nameLength + extraLength + commentLength;
    if (nextOffset > centralBytes.length) throw new Error("invalid-zip");
    entries.push({
      name: decoder.decode(centralBytes.subarray(nameStart, nameStart + nameLength)),
      compressedSize,
      uncompressedSize,
      encrypted: Boolean(flags & 0x1),
    });
    offset = nextOffset;
  }
  if (entries.length !== entryCount) throw new Error("invalid-zip");
  return entries;
}

export function inspectExecutableHeader(bytes: Uint8Array) {
  if (bytes.length < 64 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const peOffset = view.getUint32(0x3c, true);
  if (peOffset + 6 > bytes.length || view.getUint32(peOffset, true) !== 0x00004550) return { architecture: "unknown" };
  const machine = view.getUint16(peOffset + 4, true);
  const architecture = machine === 0x014c ? "x86" : machine === 0x8664 ? "x64" : machine === 0xaa64 ? "arm64" : "unknown";
  return { architecture };
}

export async function analyzeProjectFile(file: File): Promise<ProjectAnalysis> {
  const ext = extension(file.name);
  if (ext === "exe") {
    const header = new Uint8Array(await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer());
    const executable = inspectExecutableHeader(header);
    return {
      fileName: file.name,
      fileSize: file.size,
      kind: executable ? "windows-executable" : "unsupported-file",
      verdict: executable ? "binary-only" : "unsupported",
      confidence: executable ? "high" : "medium",
      entryCount: 0,
      declaredUncompressedSize: 0,
      signals: executable ? ["windows-pe"] : [],
      steps: executable ? ["cannot-auto-convert-binary", "use-original-project"] : ["review-unknown-project"],
      examples: executable ? [`PE ${executable.architecture}`] : [],
      readyToUpload: false,
    };
  }
  if (ext !== "zip" && ext !== "apk") {
    return {
      fileName: file.name,
      fileSize: file.size,
      kind: "unsupported-file",
      verdict: "unsupported",
      confidence: "high",
      entryCount: 0,
      declaredUncompressedSize: 0,
      signals: [],
      steps: ["review-unknown-project"],
      examples: [],
      readyToUpload: false,
    };
  }

  const result = classifyArchiveEntries(file.name, await readArchiveEntries(file));
  return { ...result, fileSize: file.size };
}
