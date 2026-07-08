"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadFile, deleteFile } from "@/lib/attachments/client";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

interface CallReport {
  id: string;
  working_title: string | null;
  writer_name: string | null;
  content_type: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

interface FeedbackEntry {
  id: string;
  programmer_id: string;
  call_report_id: string;
  feedback_date: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  programmer: { id: string; name: string } | null;
  call_report: { id: string; working_title: string | null; writer_name: string | null; content_type: string | null } | null;
  attachments: Attachment[];
}

interface Props {
  callReports: CallReport[];
  initialFeedback: FeedbackEntry[];
  currentUserId: string;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-3.5 w-3.5" />;
  if (fileType.includes("pdf")) return <FileText className="h-3.5 w-3.5" />;
  return <File className="h-3.5 w-3.5" />;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getDownloadUrl(filePath: string) {
  return `/api/storage/download?url=${encodeURIComponent(filePath)}&bucket=attachments`;
}

interface FeedbackFormProps {
  callReports: CallReport[];
  initial?: FeedbackEntry;
  onSave: (entry: FeedbackEntry) => void;
  onCancel: () => void;
}

function FeedbackForm({ callReports, initial, onSave, onCancel }: FeedbackFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(initial?.feedback_date || today);
  const [callReportId, setCallReportId] = useState(initial?.call_report_id || "");
  const [content, setContent] = useState(initial?.content || "");
  const [storySearch, setStorySearch] = useState(
    initial?.call_report ? (initial.call_report.working_title || "") : ""
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    initial?.attachments || []
  );
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredReports = storySearch.trim()
    ? callReports.filter((cr) =>
        (cr.working_title || "Untitled").toLowerCase().includes(storySearch.toLowerCase()) ||
        (cr.writer_name || "").toLowerCase().includes(storySearch.toLowerCase())
      )
    : callReports;

  const selectedReport = callReports.find((cr) => cr.id === callReportId);

  function handleSelectReport(cr: CallReport) {
    setCallReportId(cr.id);
    setStorySearch(cr.working_title || "Untitled");
    setShowDropdown(false);
  }

  function handleFiles(files: FileList) {
    const newFiles = Array.from(files).filter((f) => f.size <= 20 * 1024 * 1024);
    const oversized = Array.from(files).filter((f) => f.size > 20 * 1024 * 1024);
    if (oversized.length) toast.error(`${oversized.length} file(s) exceed 20MB limit`);
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }

  function removeExistingAttachment(id: string) {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
    setRemovedAttachmentIds((prev) => [...prev, id]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!callReportId) { toast.error("Please select a story"); return; }
    setSaving(true);
    try {
      let savedEntry: FeedbackEntry;

      if (initial) {
        // PATCH
        const res = await fetch(`/api/programmer/story-feedback/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call_report_id: callReportId, feedback_date: date, content }),
        });
        if (!res.ok) throw new Error("Failed to save");
        const json = await res.json();
        savedEntry = json.feedback;

        // Delete removed attachments
        for (const id of removedAttachmentIds) {
          const att = initial.attachments.find((a) => a.id === id);
          if (att) {
            try { await deleteFile(id, att.file_path); } catch { /* best effort */ }
          }
        }
      } else {
        // POST
        const res = await fetch("/api/programmer/story-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call_report_id: callReportId, feedback_date: date, content }),
        });
        if (!res.ok) throw new Error("Failed to save");
        const json = await res.json();
        savedEntry = json.feedback;
      }

      // Upload pending files
      const uploadedAttachments: Attachment[] = [];
      for (const file of pendingFiles) {
        try {
          const result = await uploadFile(file, "programmer_feedback", savedEntry.id) as Attachment;
          uploadedAttachments.push(result);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      // Merge attachments
      savedEntry = {
        ...savedEntry,
        attachments: [...existingAttachments, ...uploadedAttachments],
      };

      onSave(savedEntry);
    } catch {
      toast.error("Failed to save feedback");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-blue-900">
          {initial ? "Edit Feedback" : "Add Feedback"}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date picker */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Story picker */}
        <div className="space-y-1 relative">
          <label className="text-xs font-medium text-slate-600">Story</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={storySearch}
              onChange={(e) => { setStorySearch(e.target.value); setShowDropdown(true); setCallReportId(""); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search stories..."
              className="w-full text-sm border border-input rounded-md pl-8 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {showDropdown && filteredReports.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto mt-1">
              {filteredReports.slice(0, 30).map((cr) => (
                <button
                  key={cr.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex flex-col gap-0.5"
                  onMouseDown={() => handleSelectReport(cr)}
                >
                  <span className="font-medium truncate">{cr.working_title || "Untitled"}</span>
                  {cr.writer_name && (
                    <span className="text-xs text-muted-foreground">{cr.writer_name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedReport && (
            <p className="text-xs text-green-700">
              Selected: <span className="font-medium">{selectedReport.working_title || "Untitled"}</span>
            </p>
          )}
        </div>
      </div>

      {/* Feedback textarea */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Feedback</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your feedback here — notes, suggestions, MoM summary..."
          rows={4}
          className="bg-white resize-none"
        />
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">Attachments</label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragActive ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip"
            onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
          />
          <Paperclip className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            Drop files here or <span className="text-blue-600 font-medium">click to upload</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">PDF, Word, Excel, Images — max 20MB each</p>
        </div>

        {/* Existing attachments (edit mode) */}
        {existingAttachments.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">Existing files:</p>
            {existingAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 text-xs bg-white border rounded-md px-2 py-1.5">
                <span className="text-muted-foreground">{getFileIcon(att.file_type)}</span>
                <span className="flex-1 truncate">{att.file_name}</span>
                <button
                  type="button"
                  onClick={() => removeExistingAttachment(att.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending new files */}
        {pendingFiles.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">New files to upload:</p>
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-md px-2 py-1.5">
                <span className="text-blue-500">{getFileIcon(f.type)}</span>
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                <button type="button" onClick={() => removePendingFile(i)} className="text-red-400 hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {initial ? "Save Changes" : "Save Feedback"}
        </Button>
      </div>
    </div>
  );
}

export function StoryFeedbackClient({ callReports, initialFeedback, currentUserId }: Props) {
  const [entries, setEntries] = useState<FeedbackEntry[]>(initialFeedback);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? entries.filter((e) =>
        (e.call_report?.working_title || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.content || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.call_report?.writer_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  function handleAdded(entry: FeedbackEntry) {
    setEntries((prev) => [entry, ...prev]);
    setShowAddForm(false);
    toast.success("Feedback saved");
  }

  function handleEdited(entry: FeedbackEntry) {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
    setEditingId(null);
    toast.success("Feedback updated");
  }

  async function handleDelete(entry: FeedbackEntry) {
    setDeletingId(entry.id);
    try {
      const res = await fetch(`/api/programmer/story-feedback/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success("Feedback deleted");
    } catch {
      toast.error("Failed to delete feedback");
    } finally {
      setDeletingId(null);
    }
  }

  // Group entries by date for display
  const groupedByDate: Record<string, FeedbackEntry[]> = {};
  for (const entry of filtered) {
    const key = entry.feedback_date;
    if (!groupedByDate[key]) groupedByDate[key] = [];
    groupedByDate[key].push(entry);
  }
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback..."
            className="w-full text-sm border border-input rounded-md pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          size="sm"
          onClick={() => { setShowAddForm(true); setEditingId(null); }}
          className="flex items-center gap-1.5"
          disabled={showAddForm}
        >
          <Plus className="h-4 w-4" />
          Add Feedback
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <FeedbackForm
          callReports={callReports}
          onSave={handleAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Empty state */}
      {entries.length === 0 && !showAddForm && (
        <div className="text-center py-16 text-muted-foreground">
          <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No feedback yet</p>
          <p className="text-sm mt-1">Click "Add Feedback" to log your first entry.</p>
        </div>
      )}

      {/* Grouped entries */}
      {sortedDates.map((dateKey) => (
        <div key={dateKey} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {formatDate(dateKey)}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {groupedByDate[dateKey].map((entry) => {
            const isOwn = entry.programmer_id === currentUserId;

            if (editingId === entry.id) {
              return (
                <FeedbackForm
                  key={entry.id}
                  callReports={callReports}
                  initial={entry}
                  onSave={handleEdited}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            return (
              <div
                key={entry.id}
                className="bg-white border border-border rounded-xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {entry.call_report?.working_title || "Untitled Story"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {entry.call_report?.writer_name && (
                        <span className="text-xs text-muted-foreground">{entry.call_report.writer_name}</span>
                      )}
                      {entry.call_report?.content_type && (
                        <Badge variant="secondary" className="text-[11px] px-1.5 py-0 capitalize">
                          {entry.call_report.content_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isOwn && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditingId(entry.id); setShowAddForm(false); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(entry)}
                        disabled={deletingId === entry.id}
                      >
                        {deletingId === entry.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  )}
                </div>

                {entry.content && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                )}

                {entry.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {entry.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={getDownloadUrl(att.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
                      >
                        {getFileIcon(att.file_type)}
                        <span className="truncate max-w-[140px]">{att.file_name}</span>
                      </a>
                    ))}
                  </div>
                )}

                {entry.programmer?.name && (
                  <p className="text-[11px] text-muted-foreground">by {entry.programmer.name}</p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
