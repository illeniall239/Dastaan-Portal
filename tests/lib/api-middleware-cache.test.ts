import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { withApiPerf } from "@/lib/api-middleware";

const get = new Request("http://localhost/api/episodes?call_report_id=x", { method: "GET" });

describe("withApiPerf cache headers", () => {
  it("keeps a handler's own no-store on GET (the episode list must never be served stale)", async () => {
    const res = await withApiPerf(async () => {
      const r = NextResponse.json({ ok: true });
      r.headers.set("Cache-Control", "no-store");
      return r;
    }, get);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("never lets a shared cache store a GET response by default (responses are per-user)", async () => {
    const res = await withApiPerf(async () => NextResponse.json({ ok: true }), get);
    const header = res.headers.get("Cache-Control") ?? "";
    expect(header).not.toMatch(/public|s-maxage|stale-while-revalidate/);
    expect(header).toMatch(/private/);
    expect(header).toMatch(/no-store/);
  });
});
