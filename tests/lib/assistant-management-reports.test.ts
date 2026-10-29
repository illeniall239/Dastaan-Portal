import { describe, it, expect, vi, afterEach } from "vitest";
import { runManagementReport, shrink, MANAGEMENT_REPORTS } from "@/lib/assistant/management-reports";

// Minimal stand-in for the Supabase admin client: every query resolves to `rows`.
function adminReturning(rows: any[]) {
  const q: any = {
    select: () => q, eq: () => q, ilike: () => q, limit: () => q,
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return { from: () => q } as any;
}

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const ctx = (admin: any, dateRange: any = null) => ({ admin, origin: "https://portal.test", cookie: "sb=abc", dateRange });

afterEach(() => vi.unstubAllGlobals());

describe("runManagementReport", () => {
  it("every report is either an app API path or a server-side loader", () => {
    for (const [key, r] of Object.entries(MANAGEMENT_REPORTS)) {
      expect(Boolean(r.path) !== Boolean(r.load), key).toBe(true);
      if (r.path) expect(r.path.startsWith("/api/"), key).toBe(true);
    }
  });

  it("never exposes link tokens or reviewers' IP addresses from external evaluations", async () => {
    const admin = {
      from: (table: string) => {
        const rows = table === "external_evaluation_links"
          ? [{ id: "l1", content_type: "episode", token: "SECRET" }]
          : [{ id: "e1", link_id: "l1", ip_address: "1.2.3.4", score: 8 }];
        const q: any = { select: () => q, order: () => q, then: (r: any) => r({ data: rows, error: null }) };
        return q;
      },
    } as any;
    const r: any = await runManagementReport({ report: "external_evaluations" }, ctx(admin));
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/SECRET|1\.2\.3\.4|token|ip_address/);
    expect(r.data.evaluations[0].score).toBe(8);
  });

  it("calls the report as the signed-in user, with the date range", async () => {
    const fetchFn = mockFetch(200, { ok: true });
    await runManagementReport({ report: "evaluator_stats" }, ctx(adminReturning([]), {
      start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-10-30T00:00:00Z"),
    }));
    const [url, init] = fetchFn.mock.calls[0] as any;
    expect(url).toBe("https://portal.test/api/management/evaluator-stats?from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-30T00%3A00%3A00.000Z");
    expect(init.headers.cookie).toBe("sb=abc");
  });

  it("resolves a team head's name to the team id", async () => {
    const fetchFn = mockFetch(200, { ok: true });
    const admin = adminReturning([{ id: "t1", name: "Content Team", team_head: { name: "Ali Raza" } }]);
    await runManagementReport({ report: "team_metric", team_name: "Ali's team", metric: "approved" }, ctx(admin));
    expect((fetchFn.mock.calls[0] as any)[0]).toBe("https://portal.test/api/management/team-drill-down?teamId=t1&metric=approved");
  });

  it("puts a project's id into the URL path for event_analysis", async () => {
    const fetchFn = mockFetch(200, { ok: true });
    await runManagementReport({ report: "event_analysis", project_title: "Wujood" }, ctx(adminReturning([{ id: "cr9", working_title: "Wujood" }])));
    expect((fetchFn.mock.calls[0] as any)[0]).toBe("https://portal.test/api/management/event-analysis/cr9");
  });

  it("refuses a project-specific report without a project, without calling it", async () => {
    const fetchFn = mockFetch(200, {});
    const r: any = await runManagementReport({ report: "project_review" }, ctx(adminReturning([])));
    expect(r.error).toMatch(/project_title/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("asks which one when a name matches several projects", async () => {
    mockFetch(200, {});
    const r: any = await runManagementReport({ report: "project_review", project_title: "Ishq" },
      ctx(adminReturning([{ id: "a", working_title: "Ishq Hai" }, { id: "b", working_title: "Zaad e Ishq" }])));
    expect(r.matches).toEqual(["Ishq Hai", "Zaad e Ishq"]);
  });

  it("says plainly when the account can't see a report", async () => {
    mockFetch(403, { error: "Forbidden" });
    const r: any = await runManagementReport({ report: "contracts" }, ctx(adminReturning([])));
    expect(r.error).toBe("This report is not available to your account.");
  });

  it("rejects unknown reports", async () => {
    const r: any = await runManagementReport({ report: "drop_tables" }, ctx(adminReturning([])));
    expect(r.error).toMatch(/Unknown report/);
  });
});

describe("shrink", () => {
  it("cuts long lists and says how many were left out", () => {
    expect(shrink({ items: [1, 2, 3, 4, 5] }, 2)).toEqual({ items: [1, 2, { __more_items_not_shown: 3 }] });
  });

  it("leaves short data unchanged", () => {
    expect(shrink({ a: [1], b: { c: "x" } }, 5)).toEqual({ a: [1], b: { c: "x" } });
  });
});
