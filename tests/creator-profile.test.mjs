import assert from "node:assert/strict";
import test from "node:test";
import { parseCreatorProfileInput, profileFromRow } from "../lib/creator-profile.ts";

test("normalizes a valid creator profile", () => {
  const profile = parseCreatorProfileInput({
    displayName: "  Open  Maker  ", handle: "Open_Maker", headline: " Indie developer ",
    bio: "Builds small games.\r\nOpen source.", location: " Tainan ", websiteUrl: "https://example.com/",
    skills: ["Unity", "C#", "Unity", "pixel art"], isPublic: true,
  });
  assert.equal(profile.displayName, "Open Maker");
  assert.equal(profile.handle, "open_maker");
  assert.equal(profile.websiteUrl, "https://example.com");
  assert.deepEqual(profile.skills, ["Unity", "C#", "pixel art"]);
  assert.equal(profile.bio, "Builds small games.\nOpen source.");
});

test("rejects reserved handles and URL credentials", () => {
  assert.throws(() => parseCreatorProfileInput({ displayName: "Open Maker", handle: "admin" }), /HANDLE_INVALID/);
  assert.throws(() => parseCreatorProfileInput({ displayName: "Open Maker", handle: "open-maker", websiteUrl: "https://user:pass@example.com" }), /WEBSITE_INVALID/);
});

test("corrupt stored skills cannot break a public profile", () => {
  const profile = profileFromRow({ id: "1", handle: "maker", display_name: "Maker", skills: "not-json", is_public: 1 });
  assert.deepEqual(profile.skills, []);
});
