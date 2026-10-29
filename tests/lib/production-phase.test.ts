import { describe, it, expect } from "vitest";
import { getProductionPhase } from "@/lib/production-phase";

describe("getProductionPhase (same rule as the management dashboard)", () => {
  it("30-episode projects: Pre Cast at 3, Pre Production at 10, Production Start at 15", () => {
    expect(getProductionPhase(30, 2)).toBeNull();
    expect(getProductionPhase(30, 3)).toBe("Pre Cast");
    expect(getProductionPhase(30, 10)).toBe("Pre Production");
    expect(getProductionPhase(30, 15)).toBe("Production Start");
  });

  it("50-episode projects: Pre Cast at 8, Pre Production at 18, Production Start at 25", () => {
    expect(getProductionPhase(50, 7)).toBeNull();
    expect(getProductionPhase(50, 8)).toBe("Pre Cast");
    expect(getProductionPhase(50, 18)).toBe("Pre Production");
    expect(getProductionPhase(50, 25)).toBe("Production Start");
  });

  it("has no phase for other episode totals, unknown totals or no episodes", () => {
    expect(getProductionPhase(40, 30)).toBeNull();
    expect(getProductionPhase(null, 10)).toBeNull();
    expect(getProductionPhase(30, 0)).toBeNull();
  });
});
