import assert from "node:assert/strict";
import test from "node:test";
import { classifyArchiveEntries, inspectExecutableHeader } from "../lib/project-analyzer.ts";

function entries(names) {
  return names.map((name) => ({ name, compressedSize: 10, uncompressedSize: 20, encrypted: false }));
}

test("recognizes browser-ready web builds", () => {
  const report = classifyArchiveEntries("game.zip", entries(["index.html", "Build/game.loader.js", "Build/game.wasm"]));
  assert.equal(report.kind, "web-build");
  assert.equal(report.verdict, "ready");
  assert.equal(report.readyToUpload, true);
});

test("recognizes source projects that can be exported", () => {
  const unity = classifyArchiveEntries("unity.zip", entries(["Assets/Main.cs", "ProjectSettings/ProjectVersion.txt"]));
  const cpp = classifyArchiveEntries("native.zip", entries(["src/main.cpp", "CMakeLists.txt"]));
  const dotnet = classifyArchiveEntries("dotnet.zip", entries(["Arcade.sln", "Arcade/Arcade.csproj"]));
  assert.deepEqual([unity.kind, unity.verdict], ["unity-project", "convertible"]);
  assert.deepEqual([cpp.kind, cpp.verdict], ["cpp-project", "convertible"]);
  assert.deepEqual([dotnet.kind, dotnet.verdict], ["dotnet-project", "convertible"]);
});

test("never presents finished Android binaries as automatic conversions", () => {
  const nativeApk = classifyArchiveEntries("game.apk", entries(["AndroidManifest.xml", "classes.dex", "lib/arm64-v8a/libgame.so"]));
  const wrapperApk = classifyArchiveEntries("wrapper.apk", entries(["AndroidManifest.xml", "classes.dex", "assets/www/index.html"]));
  assert.deepEqual([nativeApk.kind, nativeApk.verdict, nativeApk.readyToUpload], ["android-package", "binary-only", false]);
  assert.deepEqual([wrapperApk.kind, wrapperApk.verdict, wrapperApk.readyToUpload], ["android-web-wrapper", "manual", false]);
});

test("blocks unsafe or encrypted archives from the ready state", () => {
  const unsafeEntries = entries(["index.html", "game.js"]);
  unsafeEntries.push({ name: "../outside.txt", compressedSize: 1, uncompressedSize: 1, encrypted: true });
  const report = classifyArchiveEntries("game.zip", unsafeEntries);
  assert.equal(report.verdict, "manual");
  assert.equal(report.readyToUpload, false);
  assert.ok(report.steps.includes("remove-encryption"));
  assert.ok(report.steps.includes("remove-unsafe-paths"));
});

test("reads a Windows PE architecture without executing it", () => {
  const bytes = new Uint8Array(256);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x4d;
  bytes[1] = 0x5a;
  view.setUint32(0x3c, 0x80, true);
  view.setUint32(0x80, 0x00004550, true);
  view.setUint16(0x84, 0x8664, true);
  assert.deepEqual(inspectExecutableHeader(bytes), { architecture: "x64" });
});
