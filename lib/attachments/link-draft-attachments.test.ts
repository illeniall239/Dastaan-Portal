import { describe, it, expect, vi } from "vitest";
import { linkDraftAttachments, DraftAttachment } from "./link-draft-attachments";

function makeMockSupabase(insertResult: { error: { message: string } | null }) {
  const insertFn = vi.fn().mockResolvedValue(insertResult);
  return {
    client: {
      from: vi.fn(() => ({ insert: insertFn })),
    } as any,
    insertFn,
  };
}

const draft: DraftAttachment = {
  file_name: "pukaar.pdf",
  file_path: "drafts/user123/abc-def.pdf",
  file_size: 204800,
  file_type: "application/pdf",
};

describe("linkDraftAttachments", () => {
  it("inserts attachment record using original draft path (no move)", async () => {
    const { client, insertFn } = makeMockSupabase({ error: null });

    const result = await linkDraftAttachments(client, "call_report", "cr-1", "user123", [draft]);

    expect(result.linked).toBe(1);
    expect(result.failed).toHaveLength(0);
    expect(insertFn).toHaveBeenCalledWith({
      entity_type: "call_report",
      entity_id: "cr-1",
      file_name: "pukaar.pdf",
      file_path: "drafts/user123/abc-def.pdf",
      file_size: 204800,
      file_type: "application/pdf",
      uploaded_by: "user123",
    });
  });

  it("counts only successful inserts", async () => {
    const insertFn = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "RLS violation" } })
      .mockResolvedValueOnce({ error: null });

    const client = { from: vi.fn(() => ({ insert: insertFn })) } as any;

    const drafts: DraftAttachment[] = [
      { ...draft, file_name: "a.pdf", file_path: "drafts/u/a.pdf" },
      { ...draft, file_name: "b.pdf", file_path: "drafts/u/b.pdf" },
      { ...draft, file_name: "c.pdf", file_path: "drafts/u/c.pdf" },
    ];

    const result = await linkDraftAttachments(client, "call_report", "cr-1", "u", drafts);

    expect(result.linked).toBe(2);
    expect(result.failed).toEqual([{ fileName: "b.pdf", error: "RLS violation" }]);
  });

  it("returns zero linked for empty array", async () => {
    const { client } = makeMockSupabase({ error: null });

    const result = await linkDraftAttachments(client, "call_report", "cr-1", "u", []);

    expect(result.linked).toBe(0);
    expect(result.failed).toHaveLength(0);
  });

  it("defaults file_type to application/octet-stream when null", async () => {
    const { client, insertFn } = makeMockSupabase({ error: null });
    const noType = { ...draft, file_type: null };

    await linkDraftAttachments(client, "call_report", "cr-1", "u", [noType]);

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ file_type: "application/octet-stream" })
    );
  });

  it("never calls storage.move — files stay at draft path", async () => {
    const moveFn = vi.fn();
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({ insert: insertFn })),
      storage: { from: vi.fn(() => ({ move: moveFn })) },
    } as any;

    await linkDraftAttachments(client, "call_report", "cr-1", "u", [draft]);

    expect(moveFn).not.toHaveBeenCalled();
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("file_path in DB record matches the original draft path exactly", async () => {
    const { client, insertFn } = makeMockSupabase({ error: null });
    const draftPath = "drafts/user99/1234-abcd.docx";
    const att = { ...draft, file_path: draftPath };

    await linkDraftAttachments(client, "one_liner", "ol-5", "user99", [att]);

    const insertedRecord = insertFn.mock.calls[0][0];
    expect(insertedRecord.file_path).toBe(draftPath);
    expect(insertedRecord.file_path).toMatch(/^drafts\//);
  });
});
