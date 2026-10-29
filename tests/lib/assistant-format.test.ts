import { describe, it, expect } from "vitest";
import { cleanReply } from "@/lib/assistant/format";

describe("cleanReply", () => {
  it("turns raw empty values in table cells into a dash", () => {
    expect(cleanReply("| Wujood | null | **null** | undefined |")).toBe("| Wujood | — | — | — |");
  });

  it("leaves the word null in normal text and in longer cell text alone", () => {
    const text = "The null hypothesis\n| Project | Note |\n| Nullah | null and void |";
    expect(cleanReply(text)).toBe(text);
  });
});
