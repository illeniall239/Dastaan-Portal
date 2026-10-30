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

  it("cuts separator cells padded with long runs of dashes", () => {
    expect(cleanReply("| Title | Writer |\n| :" + "-".repeat(500) + " | ------------: |"))
      .toBe("| Title | Writer |\n| :--- | ---: |");
  });

  it("puts a separator row glued onto the header row on its own line", () => {
    expect(cleanReply("| Title | Writer | | :--- | :--- |\n| Dil | Ali |"))
      .toBe("| Title | Writer |\n| :--- | :--- |\n| Dil | Ali |");
  });

  it("leaves a normal table and plain dashes outside tables alone", () => {
    const text = "Notes -------- here\n| A | B |\n|---|---|\n| 1 | 2 |";
    expect(cleanReply(text)).toBe(text);
  });
});
