import { describe, it, expect } from "vitest";
import { nextToEvaluate, versionLabel, type EpisodeVersion } from "@/components/episodes/episode-nav";

// EP1 with 3 revisions, EP2 with none, EP3 with 1 — in evaluation order
const project = (evaluated: string[]): EpisodeVersion[] =>
  [
    [1, null], [1, 1], [1, 2], [1, 3],
    [2, null],
    [3, null], [3, 1],
  ].map(([ep, rev]) => ({
    episode_id: `ep${ep}`,
    episode_number: ep as number,
    revision_id: rev ? `ep${ep}r${rev}` : null,
    revision_number: rev as number | null,
    evaluated: evaluated.includes(versionLabel({ episode_number: ep as number, revision_number: rev as number | null })),
  }));

const next = (evaluated: string[], episodeId: string, revisionId: string | null = null) => {
  const v = nextToEvaluate(project(evaluated), episodeId, revisionId);
  return v ? versionLabel(v) : null;
};

describe("nextToEvaluate", () => {
  it("goes from an original to its first revision", () => {
    expect(next(["EP1"], "ep1")).toBe("EP1 Rev 1");
  });

  it("walks the revisions in order", () => {
    expect(next(["EP1", "EP1 Rev 1"], "ep1", "ep1r1")).toBe("EP1 Rev 2");
  });

  it("goes to the next episode after the last revision", () => {
    expect(next(["EP1", "EP1 Rev 1", "EP1 Rev 2", "EP1 Rev 3"], "ep1", "ep1r3")).toBe("EP2");
  });

  it("goes straight to the next episode when there are no revisions", () => {
    expect(next(["EP2"], "ep2")).toBe("EP3");
  });

  it("skips versions the team already evaluated", () => {
    expect(next(["EP1", "EP1 Rev 1", "EP1 Rev 2"], "ep1")).toBe("EP1 Rev 3");
  });

  it("wraps to earlier versions that were left behind", () => {
    expect(next(["EP1", "EP1 Rev 2", "EP1 Rev 3", "EP2", "EP3", "EP3 Rev 1"], "ep3", "ep3r1")).toBe("EP1 Rev 1");
  });

  it("never offers the version just evaluated, even if its status hasn't caught up", () => {
    expect(next(["EP1", "EP1 Rev 1", "EP1 Rev 2", "EP1 Rev 3", "EP3", "EP3 Rev 1"], "ep2")).toBeNull();
  });

  it("returns null when everything is evaluated", () => {
    expect(next(["EP1", "EP1 Rev 1", "EP1 Rev 2", "EP1 Rev 3", "EP2", "EP3", "EP3 Rev 1"], "ep2")).toBeNull();
  });
});
