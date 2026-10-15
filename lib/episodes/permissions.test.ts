import { describe, it, expect } from "vitest";
import { mustEvaluateOnUpload, getUnevaluatedEpisodes } from "./permissions";

describe("mustEvaluateOnUpload", () => {
  it("returns true for evaluator", () => {
    expect(mustEvaluateOnUpload("evaluator")).toBe(true);
  });

  it("returns true for programmer", () => {
    expect(mustEvaluateOnUpload("programmer")).toBe(true);
  });

  it("returns true for management", () => {
    expect(mustEvaluateOnUpload("management")).toBe(true);
  });

  it("returns true for executive", () => {
    expect(mustEvaluateOnUpload("executive")).toBe(true);
  });

  it("returns false for content_manager", () => {
    expect(mustEvaluateOnUpload("content_manager")).toBe(false);
  });

  it("returns false for content_creator", () => {
    expect(mustEvaluateOnUpload("content_creator")).toBe(false);
  });

  it("returns false for admin", () => {
    expect(mustEvaluateOnUpload("admin")).toBe(false);
  });

  it("returns false for unknown role", () => {
    expect(mustEvaluateOnUpload("viewer")).toBe(false);
  });
});

function mockAdminClient(episodes: any[] | null, evaluations: any[] | null) {
  return {
    from: (table: string) => {
      const chain: any = {};
      const self = () => chain;
      chain.select = self;
      chain.eq = self;
      chain.is = self;
      chain.in = self;
      chain.order = self;
      chain.limit = () =>
        table === "episodes"
          ? { data: episodes }
          : { data: evaluations };
      if (table === "episodic_evaluations") {
        chain.in = () => ({ data: evaluations });
      }
      return chain;
    },
  };
}

describe("getUnevaluatedEpisodes", () => {
  const userId = "user-1";

  it("returns empty when user has no episodes", async () => {
    const client = mockAdminClient([], null);
    const result = await getUnevaluatedEpisodes(client, userId);
    expect(result).toEqual([]);
  });

  it("returns empty when all episodes are evaluated", async () => {
    const episodes = [
      { id: "ep-1", episode_number: 1, call_report: { working_title: "Story A" } },
      { id: "ep-2", episode_number: 2, call_report: { working_title: "Story B" } },
    ];
    const evaluations = [{ episode_id: "ep-1" }, { episode_id: "ep-2" }];
    const client = mockAdminClient(episodes, evaluations);
    const result = await getUnevaluatedEpisodes(client, userId);
    expect(result).toEqual([]);
  });

  it("returns un-evaluated episodes", async () => {
    const episodes = [
      { id: "ep-1", episode_number: 1, call_report: { working_title: "Story A" } },
      { id: "ep-2", episode_number: 2, call_report: { working_title: "Story B" } },
      { id: "ep-3", episode_number: 3, call_report: { working_title: "Story C" } },
    ];
    const evaluations = [{ episode_id: "ep-2" }];
    const client = mockAdminClient(episodes, evaluations);
    const result = await getUnevaluatedEpisodes(client, userId);
    expect(result).toEqual([
      { episode_number: 1, working_title: "Story A" },
      { episode_number: 3, working_title: "Story C" },
    ]);
  });

  it("handles array-shaped call_report (Supabase join)", async () => {
    const episodes = [
      { id: "ep-1", episode_number: 5, call_report: [{ working_title: "Joined Title" }] },
    ];
    const client = mockAdminClient(episodes, []);
    const result = await getUnevaluatedEpisodes(client, userId);
    expect(result).toEqual([{ episode_number: 5, working_title: "Joined Title" }]);
  });

  it("falls back to 'Unknown' when call_report is null", async () => {
    const episodes = [
      { id: "ep-1", episode_number: 1, call_report: null },
    ];
    const client = mockAdminClient(episodes, []);
    const result = await getUnevaluatedEpisodes(client, userId);
    expect(result).toEqual([{ episode_number: 1, working_title: "Unknown" }]);
  });
});
