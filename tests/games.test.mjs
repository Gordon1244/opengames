import assert from "node:assert/strict";
import test from "node:test";
import { demoGames, isNewRelease, localizeGame, NEW_RELEASE_DAYS } from "../lib/games.ts";

test("demo games start without fabricated play counts", () => {
  assert.equal(demoGames.length, 4);
  assert.deepEqual(demoGames.map((game) => game.plays), [0, 0, 0, 0]);
});

test("new status ends exactly after 45 days", () => {
  const release = "2026-08-17T00:00:00Z";
  assert.equal(NEW_RELEASE_DAYS, 45);
  assert.equal(isNewRelease(release, new Date("2026-09-30T23:59:59Z")), true);
  assert.equal(isNewRelease(release, new Date("2026-10-01T00:00:00Z")), false);
});

test("timed demo badge falls back after the new-release window", () => {
  const game = demoGames.find((item) => item.id === "demo-moon-garden");
  assert.ok(game);
  assert.equal(localizeGame(game, "zh-Hant", new Date("2026-09-30T23:59:59Z")).badge, "新作");
  assert.equal(localizeGame(game, "zh-Hant", new Date("2026-10-01T00:00:00Z")).badge, "示範作品");
  assert.equal(localizeGame(game, "en", new Date("2026-10-01T00:00:00Z")).badge, "Demo");
});
