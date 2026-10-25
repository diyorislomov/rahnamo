import { describe, expect, it } from "vitest";
import {
  networkImage,
  networkProfileInput,
  networkCursor,
} from "../src/lib/networkValidation";
import { networkCopy } from "../src/lib/networkCopy";

const profile = {
  name: "Ali Valiyev",
  headline: "Designer",
  bio: "",
  location: "Toshkent",
  skills: ["Design", "Design"],
  experience: "",
  education: "",
  website: "",
  image: "",
  published: true,
};
describe("public network profiles", () => {
  it("requires an explicit visibility choice and bounds the public fields", () => {
    expect(networkProfileInput(profile)?.skills).toEqual(["Design"]);
    expect(
      networkProfileInput({ ...profile, published: undefined }),
    ).toBeNull();
    expect(
      networkProfileInput({ ...profile, bio: "x".repeat(2001) }),
    ).toBeNull();
    expect(
      networkProfileInput({ ...profile, skills: Array(13).fill("Skill") }),
    ).toBeNull();
  });
  it("rejects executable links and credential-bearing URLs", () => {
    for (const website of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "https://user:password@example.com",
      "//example.com",
    ]) {
      expect(networkProfileInput({ ...profile, website })).toBeNull();
    }
    expect(
      networkProfileInput({
        ...profile,
        website: "https://example.com/portfolio",
      }),
    ).not.toBeNull();
  });
  it("keeps image URLs on supported public sources", () => {
    expect(
      networkImage("/api/uploads/95bdf384-5b25-4922-8d65-4dfb39841271.png"),
    ).not.toBeNull();
    for (const image of [
      "javascript:alert(1)",
      "//evil.example",
      "/api/uploads/../../.env",
      "https://images.unsplash.com.evil.example/a",
      "https://user@images.unsplash.com/a",
      "http://images.unsplash.com/a",
    ]) {
      expect(networkImage(image)).toBeNull();
    }
  });
  it("rejects malformed pagination input", () => {
    expect(networkCursor("broken")).toBeNull();
    const encoded = Buffer.from(
      JSON.stringify({
        time: "invalid",
        id: "95bdf384-5b25-4922-8d65-4dfb39841271",
      }),
    ).toString("base64url");
    expect(networkCursor(encoded)).toBeNull();
  });
  it("provides each network label in all supported languages", () => {
    const keys = Object.keys(networkCopy.uz).sort();
    expect(Object.keys(networkCopy.en).sort()).toEqual(keys);
    expect(Object.keys(networkCopy.ru).sort()).toEqual(keys);
  });
});
