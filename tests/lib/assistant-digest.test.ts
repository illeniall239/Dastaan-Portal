import { describe, it, expect } from "vitest";
import { buildDigest, digestBlock, stripOldDigests, DIGEST_MAX_CHARS } from "@/lib/assistant/digest";

const project = (i: number) => ({ title: `Project ${i}`, writer: "Writer", theme: "x".repeat(400), episodes_received: i });

describe("buildDigest", () => {
  it("stays under the size limit even for big results", () => {
    const big = { total_matching: 200, projects: Array.from({ length: 200 }, (_, i) => project(i)) };
    const text = buildDigest([{ name: "query_projects", data: JSON.stringify(big) }]);
    expect(text.length).toBeLessThanOrEqual(DIGEST_MAX_CHARS);
    expect(text).toContain("total_matching");
    expect(text).toContain("__more_items_not_shown");
  });

  it("drops the per-answer instruction notes and cuts long text", () => {
    const text = buildDigest([{ name: "query_projects", data: JSON.stringify({ how_to_read: "read me", tags_in_scope: { genres: {} }, projects: [project(1)] }) }]);
    expect(text).not.toMatch(/how_to_read|tags_in_scope|read me/);
    expect(text).not.toContain("x".repeat(200));
  });

  it("can't end the HTML comment early", () => {
    expect(digestBlock([{ name: "t", data: JSON.stringify({ theme: "A --> B" }) }])).toMatch(/^\n\n<!-- data-digest\n[^]*?A --\\u003e B[^]*\n-->$/);
  });

  it("adds nothing when no tools ran", () => {
    expect(digestBlock([])).toBe("");
  });
});

describe("stripOldDigests", () => {
  it("keeps only the latest assistant digest", () => {
    const history = [
      { role: "user", content: "q1" },
      { role: "assistant", content: "a1\n\n<!-- data-digest\n[t] {\"n\":1}\n-->" },
      { role: "user", content: "q2" },
      { role: "assistant", content: "a2\n\n<!-- data-digest\n[t] {\"n\":2}\n-->" },
    ];
    const out = stripOldDigests(history);
    expect(out[1].content).toBe("a1");
    expect(out[3].content).toBe(history[3].content);
    expect(out[0]).toBe(history[0]);
  });
});
