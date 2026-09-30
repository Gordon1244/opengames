import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalPath } from "../lib/navigation.ts";

test("keeps local navigation paths and their query or fragment", () => {
  assert.equal(safeInternalPath("/dashboard?tab=games#published", "/fallback"), "/dashboard?tab=games#published");
});

test("rejects absolute, protocol-relative, backslash, and control-character redirects", () => {
  for (const value of ["https://attacker.test", "//attacker.test", "/\\attacker.test", "\\attacker.test", "/\t/attacker.test", "/\n/attacker.test", null]) {
    assert.equal(safeInternalPath(value, "/dashboard"), "/dashboard");
  }
});
