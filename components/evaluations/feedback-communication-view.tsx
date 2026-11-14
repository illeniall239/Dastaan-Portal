"use client";

import { Mail, Paperclip } from "lucide-react";
import { RichTextView } from "@/components/ui/rich-text-editor";
import type { FeedbackAttachment } from "@/lib/evaluations/feedback";

/**
 * An evaluation's Feedback Communication — the pasted email or written feedback, with its
 * formatting, plus supporting attachments. Renders nothing when there is none.
 */
export function FeedbackCommunicationView({ text, attachments }: { text?: string | null; attachments?: FeedbackAttachment[] | null }) {
  const files = (attachments || []).filter((a) => a?.url);
  if (!text && files.length === 0) return null;

  return (
    <div className="bg-amber-50/60 border border-amber-200 rounded p-3 space-y-2">
      <p className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5" /> Feedback Communication
      </p>
      {text && <RichTextView value={text} className="text-xs text-slate-700" />}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((att, i) => (
            <a
              key={i}
              href={`/api/storage/download?url=${encodeURIComponent(att.url)}&bucket=attachments&name=${encodeURIComponent(att.name || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white hover:bg-amber-100 rounded border border-amber-200 text-blue-700"
            >
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[220px]">{att.name || "Attachment"}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
