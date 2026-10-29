import { describe, it, expect } from "vitest";
import { summarizeProjects, queryProjects, NOT_CLASSIFIED, type RawProject } from "@/lib/assistant/projects";

const raw = (o: Partial<RawProject> & { id: string }): RawProject => ({
  call_report_id: `CR-${o.id}`, working_title: `Title ${o.id}`, writer_name: "Writer", genre: null, theme: null,
  content_type: "Serial", target_slot: null, total_episodes: null, created_at: "2026-10-01T00:00:00Z",
  team_name: "Team A", logged_by: "Ali", category: null, on_air_title: null, director: null,
  logline: null, short_synopsis: null, episodic_synopsis: null, meeting_notes: null, next_steps: null,
  remarks: null, feedback_text: null, tracking_notes: null, ...o,
});

const rows = [
  raw({ id: "a", working_title: "Wujood", genre: ["Romance", "Family"], total_episodes: 30, content_type: "Long Serial" }),
  raw({ id: "b", working_title: "Baazi", genre: [], total_episodes: 50 }),
  raw({ id: "c", working_title: "Naam", genre: null, total_episodes: 30, team_name: "Team B" }),
  raw({ id: "d", working_title: "Daurh", genre: ["Thriller"], total_episodes: 50, created_at: "2026-01-01T00:00:00Z" }),
];
const lookups = {
  episodesByCr: new Map([["a", 16], ["b", 9], ["c", 2], ["d", 0]]),
  estimatedEpsByCr: new Map<string, number>(),
  avgScoreByCr: new Map([["a", 7.5]]),
  decisionByCr: new Map([["a", "approved"], ["b", "rejected"]]),
};
const all = summarizeProjects(rows, lookups);

describe("summarizeProjects", () => {
  it("tags one-liners with no genre as Not classified", () => {
    expect(all.find((p) => p.title === "Baazi")!.genres).toEqual([NOT_CLASSIFIED]);
    expect(all.find((p) => p.title === "Naam")!.genres).toEqual([NOT_CLASSIFIED]);
    expect(all.find((p) => p.title === "Wujood")!.genres).toEqual(["Romance", "Family"]);
  });

  it("works out episodes and the dashboard phase", () => {
    const w = all.find((p) => p.title === "Wujood")!;
    expect(w.episodes_received).toBe(16);
    expect(w.total_episodes).toBe(30);
    expect(w.phase).toBe("Production Start");
    expect(all.find((p) => p.title === "Baazi")!.phase).toBe("Pre Cast");
  });

  it("falls back to the negotiated episode estimate when total episodes is empty", () => {
    const [p] = summarizeProjects([raw({ id: "e", total_episodes: null })], {
      ...lookups, episodesByCr: new Map([["e", 10]]), estimatedEpsByCr: new Map([["e", 30]]),
    });
    expect(p.total_episodes).toBe(30);
    expect(p.phase).toBe("Pre Production");
  });

  it("marks approval as approved, rejected or pending", () => {
    expect(all.find((p) => p.title === "Wujood")!.approval).toBe("approved");
    expect(all.find((p) => p.title === "Baazi")!.approval).toBe("rejected");
    expect(all.find((p) => p.title === "Naam")!.approval).toBe("pending");
  });

  it("leaves approval out entirely when the user may not see approvals", () => {
    const hidden = summarizeProjects(rows, { ...lookups, decisionByCr: null });
    expect(hidden.every((p) => !("approval" in p))).toBe(true);
  });
});

describe("queryProjects", () => {
  it("finds untagged one-liners", () => {
    const r = queryProjects(all, { genre: "not classified" });
    expect(r.projects.map((p) => p.title).sort()).toEqual(["Baazi", "Naam"]);
    expect(r.total_matching).toBe(2);
  });

  it("filters by genre case-insensitively", () => {
    expect(queryProjects(all, { genre: "romance" }).projects.map((p) => p.title)).toEqual(["Wujood"]);
  });

  it("groups by genre, counting a multi-genre project under each genre", () => {
    expect(queryProjects(all, { group_by: "genre" }).groups).toEqual({
      "Not classified": 2, Romance: 1, Family: 1, Thriller: 1,
    });
  });

  it("filters by phase, including projects with no phase", () => {
    expect(queryProjects(all, { phase: "production start" }).projects.map((p) => p.title)).toEqual(["Wujood"]);
    expect(queryProjects(all, { phase: "none" }).projects.map((p) => p.title).sort()).toEqual(["Daurh", "Naam"]);
  });

  it("filters by team, content type, search and logged date", () => {
    expect(queryProjects(all, { team: "team b" }).projects.map((p) => p.title)).toEqual(["Naam"]);
    expect(queryProjects(all, { content_type: "long serial" }).projects.map((p) => p.title)).toEqual(["Wujood"]);
    expect(queryProjects(all, { search: "baaz" }).projects.map((p) => p.title)).toEqual(["Baazi"]);
    const since = queryProjects(all, {}, { start: new Date("2026-06-01"), end: new Date("2026-12-31") });
    expect(since.projects.map((p) => p.title)).not.toContain("Daurh");
  });

  it("sorts by episodes received and caps the list, reporting truncation", () => {
    const r = queryProjects(all, { sort_by: "episodes_received", limit: 2 });
    expect(r.projects.map((p) => p.title)).toEqual(["Wujood", "Baazi"]);
    expect(r.total_matching).toBe(4);
    expect(r.truncated).toBe(true);
  });

  it("matches any of several genre tags", () => {
    expect(queryProjects(all, { genres: ["Thriller", "Romance"] }).projects.map((p) => p.title).sort()).toEqual(["Daurh", "Wujood"]);
  });

  it("lists the genre and theme tags that exist, so a concept can be mapped to real tags", () => {
    const r = queryProjects(all, { genre: "love story" });
    expect(r.total_matching).toBe(0);
    expect(r.tags_in_scope!.genres).toEqual({ "Not classified": 2, Romance: 1, Family: 1, Thriller: 1 });
  });

  it("does not list tags when no genre, theme or keyword filter is used", () => {
    expect(queryProjects(all, {}).tags_in_scope).toBeUndefined();
  });

  it("ignores an approval filter when approvals are hidden", () => {
    const hidden = summarizeProjects(rows, { ...lookups, decisionByCr: null });
    expect(queryProjects(hidden, { approval: "approved" }).total_matching).toBe(4);
  });
});

describe("keyword search across fields", () => {
  const texts = [
    raw({ id: "k1", working_title: "Dil", genre: ["Romance"] }),
    raw({ id: "k2", working_title: "Rishta", genre: ["Family Drama"], theme: "A love triangle between cousins" }),
    raw({ id: "k3", working_title: "Kasak", genre: ["Drama"], short_synopsis: "Two lovers separated by war" }),
    raw({ id: "k4", working_title: "Notes", genre: ["Thriller"], meeting_notes: "Writer said she would love to start soon" }),
    raw({ id: "k5", working_title: "Other", genre: ["Comedy"], contact_address: "Love Lane, Karachi" } as any),
  ];
  const list = summarizeProjects(texts, { ...lookups, episodesByCr: new Map() });
  const r = queryProjects(list, { keywords: ["love", "romance", "romantic"] });

  it("finds a concept in tags and in story text", () => {
    expect(r.projects.map((p) => p.title).sort()).toEqual(["Dil", "Kasak", "Notes", "Rishta"]);
  });

  it("says where each project matched", () => {
    const by = Object.fromEntries(r.projects.map((p) => [p.title, p.matched_in]));
    expect(by.Dil).toEqual(["genre"]);
    expect(by.Rishta).toEqual(["theme"]);
    expect(by.Kasak).toEqual(["short_synopsis"]);
    expect(by.Notes).toEqual(["meeting_notes"]);
  });

  it("separates tagged matches from mentions only in the text", () => {
    expect(r.matched_by_tags).toBe(2);       // Dil (genre), Rishta (theme)
    expect(r.matched_in_text_only).toBe(2);  // Kasak (synopsis), Notes (meeting notes)
  });

  it("never searches or returns contact details", () => {
    expect(r.projects.map((p) => p.title)).not.toContain("Other");
    expect(JSON.stringify(r)).not.toMatch(/Love Lane|contact_/);
  });

  it("does not put the long story text in the output", () => {
    expect(JSON.stringify(r)).not.toMatch(/separated by war|start soon/);
  });
});
