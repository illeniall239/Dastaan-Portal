"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Check, X, ChevronUp } from "lucide-react";
import type { WriterCommitment } from "@/types";
import {
  COMMITMENT_SCHEDULES,
  COMMITMENT_SCHEDULE_LABELS,
  type CommitmentSchedule,
} from "@/lib/validations/writer-commitments";

interface SimpleWriter {
  id: string;
  name: string;
}

interface SimpleCallReport {
  id: string;
  working_title: string;
  call_report_id: string;
  call_report_writers?: { writer_id: string; writer: { id: string; name: string }[] | { id: string; name: string } | null }[];
}

interface WriterCommitmentTrackerProps {
  userId: string;
  initialCallReports: SimpleCallReport[];
}

type StatusFilter = "all" | "on_track" | "delayed" | "delivered";

function getCommitmentStatus(c: WriterCommitment): "delivered" | "delayed" | "on_track" {
  if (c.is_delivered) return "delivered";
  const effectiveDate = c.revised_commitment_date || c.commitment_date;
  const today = new Date().toISOString().slice(0, 10);
  return effectiveDate < today ? "delayed" : "on_track";
}

function StatusBadge({ status }: { status: "delivered" | "delayed" | "on_track" }) {
  if (status === "delivered") {
    return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">Delivered</Badge>;
  }
  if (status === "delayed") {
    return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">Delayed</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100">On Track</Badge>;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface FormState {
  call_report_id: string;
  writer_id: string;
  commitment_type: "verbal" | "contractual" | "";
  commitment_schedule: CommitmentSchedule | "";
  commitment_schedule_custom: string;
  project_initiation_date: string;
  commitment_date: string;
  revised_commitment_date: string;
  revision_reason: string;
  delay_notes: string;
}

const emptyForm: FormState = {
  call_report_id: "",
  writer_id: "",
  commitment_type: "",
  commitment_schedule: "",
  commitment_schedule_custom: "",
  project_initiation_date: "",
  commitment_date: "",
  revised_commitment_date: "",
  revision_reason: "",
  delay_notes: "",
};

/** Return the writers associated with a given call report */
function getWritersForCallReport(
  callReports: SimpleCallReport[],
  callReportId: string
): SimpleWriter[] {
  const cr = callReports.find((c) => c.id === callReportId);
  if (!cr?.call_report_writers) return [];
  const writers: SimpleWriter[] = [];
  for (const w of cr.call_report_writers) {
    if (!w.writer) continue;
    // Supabase may return the joined record as an array or a single object
    if (Array.isArray(w.writer)) {
      writers.push(...w.writer.map((ww) => ({ id: ww.id, name: ww.name })));
    } else {
      writers.push({ id: w.writer.id, name: w.writer.name });
    }
  }
  return writers;
}

/** Inline form fields shared between Add and Edit modes */
function CommitmentFormFields({
  form,
  set,
  callReports,
  projectWriters,
}: {
  form: FormState;
  set: (key: keyof FormState, val: string) => void;
  callReports: SimpleCallReport[];
  projectWriters: SimpleWriter[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Project */}
      <div className="space-y-1">
        <Label className="text-xs">Project <span className="text-red-500">*</span></Label>
        <Select value={form.call_report_id} onValueChange={(v) => { set("call_report_id", v); set("writer_id", ""); }}>
          <SelectTrigger className="h-9 bg-white text-sm">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {callReports.map((cr) => (
              <SelectItem key={cr.id} value={cr.id}>
                {cr.working_title}{" "}
                <span className="text-gray-400 text-xs">({cr.call_report_id})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Writer — derived from selected project */}
      <div className="space-y-1">
        <Label className="text-xs">Writer <span className="text-red-500">*</span></Label>
        {!form.call_report_id ? (
          <div className="h-9 flex items-center px-3 text-sm text-gray-400 border rounded-md bg-gray-50">
            Select a project first
          </div>
        ) : projectWriters.length === 0 ? (
          <div className="h-9 flex items-center px-3 text-sm text-amber-600 border border-amber-200 rounded-md bg-amber-50">
            No writers linked to this project
          </div>
        ) : projectWriters.length === 1 ? (
          <div className="h-9 flex items-center px-3 text-sm text-gray-800 border rounded-md bg-gray-50 font-medium">
            {projectWriters[0].name}
            <input type="hidden" value={projectWriters[0].id} />
          </div>
        ) : (
          <Select value={form.writer_id} onValueChange={(v) => set("writer_id", v)}>
            <SelectTrigger className="h-9 bg-white text-sm">
              <SelectValue placeholder="Select writer" />
            </SelectTrigger>
            <SelectContent>
              {projectWriters.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Commitment Type */}
      <div className="space-y-1">
        <Label className="text-xs">Commitment Type <span className="text-red-500">*</span></Label>
        <Select
          value={form.commitment_type}
          onValueChange={(v) => set("commitment_type", v as "verbal" | "contractual")}
        >
          <SelectTrigger className="h-9 bg-white text-sm">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="verbal">Verbal</SelectItem>
            <SelectItem value="contractual">Contractual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Commitment Schedule */}
      <div className="space-y-1">
        <Label className="text-xs">Commitment Schedule <span className="text-red-500">*</span></Label>
        <Select
          value={form.commitment_schedule}
          onValueChange={(v) => set("commitment_schedule", v as CommitmentSchedule)}
        >
          <SelectTrigger className="h-9 bg-white text-sm">
            <SelectValue placeholder="Select schedule" />
          </SelectTrigger>
          <SelectContent>
            {COMMITMENT_SCHEDULES.map((s) => (
              <SelectItem key={s} value={s}>{COMMITMENT_SCHEDULE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.commitment_schedule === "custom" && (
          <Input
            className="mt-1 h-9 bg-white text-sm"
            placeholder="Describe custom schedule..."
            value={form.commitment_schedule_custom}
            onChange={(e) => set("commitment_schedule_custom", e.target.value)}
          />
        )}
      </div>

      {/* Project Initiation Date */}
      <div className="space-y-1">
        <Label className="text-xs">Project Initiation Date <span className="text-red-500">*</span></Label>
        <Input
          type="date"
          className="h-9 bg-white text-sm"
          value={form.project_initiation_date}
          onChange={(e) => set("project_initiation_date", e.target.value)}
        />
      </div>

      {/* Commitment Date */}
      <div className="space-y-1">
        <Label className="text-xs">Commitment Date <span className="text-red-500">*</span></Label>
        <Input
          type="date"
          className="h-9 bg-white text-sm"
          value={form.commitment_date}
          onChange={(e) => set("commitment_date", e.target.value)}
        />
      </div>

      {/* Revised Commitment Date */}
      <div className="space-y-1">
        <Label className="text-xs">Revised Commitment Date</Label>
        <Input
          type="date"
          className="h-9 bg-white text-sm"
          value={form.revised_commitment_date}
          onChange={(e) => set("revised_commitment_date", e.target.value)}
        />
      </div>

      {/* Revision Reason */}
      <div className="space-y-1 sm:col-span-2">
        <Label className="text-xs">Revision Reason</Label>
        <Input
          className="h-9 bg-white text-sm"
          placeholder="Why was the commitment date revised?"
          value={form.revision_reason}
          onChange={(e) => set("revision_reason", e.target.value)}
        />
      </div>

      {/* Delay Notes */}
      <div className="space-y-1 sm:col-span-2 lg:col-span-3">
        <Label className="text-xs">Delay Notes</Label>
        <Textarea
          className="bg-white text-sm resize-none"
          rows={2}
          placeholder="Notes about delays or late delivery..."
          value={form.delay_notes}
          onChange={(e) => set("delay_notes", e.target.value)}
        />
      </div>
    </div>
  );
}

export function WriterCommitmentTracker({
  userId,
  initialCallReports,
}: WriterCommitmentTrackerProps) {
  const [commitments, setCommitments] = useState<WriterCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState<FormState>(emptyForm);
  const [editForms, setEditForms] = useState<Record<string, FormState>>({});

  // Filters
  const [filterWriter, setFilterWriter] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  // Derive unique writers across all call reports for the filter bar
  const allWriters = useMemo<SimpleWriter[]>(() => {
    const seen = new Set<string>();
    const writers: SimpleWriter[] = [];
    for (const cr of initialCallReports) {
      for (const w of cr.call_report_writers || []) {
        if (!w.writer) continue;
        const list = Array.isArray(w.writer) ? w.writer : [w.writer];
        for (const ww of list) {
          if (!seen.has(ww.id)) {
            seen.add(ww.id);
            writers.push({ id: ww.id, name: ww.name });
          }
        }
      }
    }
    return writers.sort((a, b) => a.name.localeCompare(b.name));
  }, [initialCallReports]);

  const fetchCommitments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/writer-commitments");
      if (!res.ok) throw new Error("Failed to fetch");
      const { commitments: data } = await res.json();
      setCommitments(data || []);
    } catch {
      toast.error("Failed to load commitments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommitments(); }, [fetchCommitments]);

  // When a project is selected in the add form, auto-set writer_id if only one writer
  useEffect(() => {
    if (!newForm.call_report_id) return;
    const writers = getWritersForCallReport(initialCallReports, newForm.call_report_id);
    if (writers.length === 1) {
      setNewForm((prev) => ({ ...prev, writer_id: writers[0].id }));
    }
  }, [newForm.call_report_id, initialCallReports]);

  const setNew = (key: keyof FormState, val: string) =>
    setNewForm((prev) => ({ ...prev, [key]: val }));

  const getEditForm = (c: WriterCommitment): FormState =>
    editForms[c.id] ?? {
      call_report_id: c.call_report_id,
      writer_id: c.writer_id,
      commitment_type: c.commitment_type,
      commitment_schedule: c.commitment_schedule as CommitmentSchedule,
      commitment_schedule_custom: c.commitment_schedule_custom || "",
      project_initiation_date: c.project_initiation_date,
      commitment_date: c.commitment_date,
      revised_commitment_date: c.revised_commitment_date || "",
      revision_reason: c.revision_reason || "",
      delay_notes: c.delay_notes || "",
    };

  const setEdit = (id: string, key: keyof FormState, val: string) =>
    setEditForms((prev) => ({
      ...prev,
      [id]: { ...getEditForm(commitments.find((c) => c.id === id)!), ...prev[id], [key]: val },
    }));

  const resolveWriterId = (form: FormState): string => {
    if (form.writer_id) return form.writer_id;
    const writers = getWritersForCallReport(initialCallReports, form.call_report_id);
    return writers.length === 1 ? writers[0].id : "";
  };

  const handleAdd = async () => {
    const writerId = resolveWriterId(newForm);
    if (!writerId || !newForm.call_report_id || !newForm.commitment_type ||
        !newForm.commitment_schedule || !newForm.project_initiation_date || !newForm.commitment_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/writer-commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writer_id: writerId,
          call_report_id: newForm.call_report_id,
          commitment_type: newForm.commitment_type,
          commitment_schedule: newForm.commitment_schedule,
          commitment_schedule_custom: newForm.commitment_schedule_custom || null,
          project_initiation_date: newForm.project_initiation_date,
          commitment_date: newForm.commitment_date,
          revised_commitment_date: newForm.revised_commitment_date || null,
          revision_reason: newForm.revision_reason || null,
          delay_notes: newForm.delay_notes || null,
          is_delivered: false,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Failed to save");
        return;
      }
      setCommitments((prev) => [body.commitment, ...prev]);
      setNewForm(emptyForm);
      setShowAddForm(false);
      toast.success("Commitment added");
    } catch {
      toast.error("Failed to save commitment");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (id: string) => {
    const commitment = commitments.find((c) => c.id === id);
    if (!commitment) return;
    const form = editForms[id] ?? getEditForm(commitment);
    const writerId = resolveWriterId(form);
    if (!writerId) { toast.error("Could not determine writer"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/writer-commitments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writer_id: writerId,
          call_report_id: form.call_report_id,
          commitment_type: form.commitment_type,
          commitment_schedule: form.commitment_schedule,
          commitment_schedule_custom: form.commitment_schedule_custom || null,
          project_initiation_date: form.project_initiation_date,
          commitment_date: form.commitment_date,
          revised_commitment_date: form.revised_commitment_date || null,
          revision_reason: form.revision_reason || null,
          delay_notes: form.delay_notes || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error || "Failed to update"); return; }
      setCommitments((prev) => prev.map((c) => c.id === id ? body.commitment : c));
      setEditForms((prev) => { const next = { ...prev }; delete next[id]; return next; });
      setExpandedId(null);
      toast.success("Commitment updated");
    } catch {
      toast.error("Failed to update commitment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this commitment record?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/writer-commitments/${id}`, { method: "DELETE" });
      if (!res.ok) { const b = await res.json(); toast.error(b.error || "Failed to delete"); return; }
      setCommitments((prev) => prev.filter((c) => c.id !== id));
      setExpandedId(null);
      toast.success("Commitment deleted");
    } catch {
      toast.error("Failed to delete commitment");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDelivered = async (id: string) => {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/writer-commitments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_delivered: true, delivered_at: today }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error || "Failed to update"); return; }
      setCommitments((prev) => prev.map((c) => c.id === id ? body.commitment : c));
      setExpandedId(null);
      toast.success("Marked as delivered");
    } catch {
      toast.error("Failed to mark as delivered");
    } finally {
      setSaving(false);
    }
  };

  // Filters
  const filtered = commitments.filter((c) => {
    if (filterWriter !== "all" && c.writer_id !== filterWriter) return false;
    if (filterProject !== "all" && c.call_report_id !== filterProject) return false;
    if (filterStatus !== "all" && getCommitmentStatus(c) !== filterStatus) return false;
    return true;
  });

  const totalDelayed = commitments.filter((c) => getCommitmentStatus(c) === "delayed").length;
  const totalOnTrack = commitments.filter((c) => getCommitmentStatus(c) === "on_track").length;
  const totalDelivered = commitments.filter((c) => c.is_delivered).length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Writer Commitments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track per-project delivery commitments, schedules, and delays
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-[#224794] hover:bg-[#1a3670] text-white self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Commitment
        </Button>
      </div>

      {/* Summary */}
      {commitments.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="text-gray-700">{totalDelayed} delayed</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span className="text-gray-700">{totalOnTrack} on track</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            <span className="text-gray-700">{totalDelivered} delivered</span>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">New Commitment</h3>
          <CommitmentFormFields
            form={newForm}
            set={setNew}
            callReports={initialCallReports}
            projectWriters={getWritersForCallReport(initialCallReports, newForm.call_report_id)}
          />
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleAdd} disabled={saving} className="bg-[#224794] hover:bg-[#1a3670] text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Save Commitment
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setNewForm(emptyForm); }}>
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Writer</Label>
          <Select value={filterWriter} onValueChange={setFilterWriter}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Writers</SelectItem>
              {allWriters.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Project</Label>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-8 text-xs w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">All Projects</SelectItem>
              {initialCallReports.map((cr) => (
                <SelectItem key={cr.id} value={cr.id}>{cr.working_title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Status</Label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusFilter)}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(filterWriter !== "all" || filterProject !== "all" || filterStatus !== "all") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-gray-500"
            onClick={() => { setFilterWriter("all"); setFilterProject("all"); setFilterStatus("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border border-dashed rounded-lg">
          {commitments.length === 0
            ? "No commitment records yet. Click 'Add Commitment' to get started."
            : "No commitments match the current filters."}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Desktop header */}
          <div className="hidden lg:grid grid-cols-[2fr_2fr_1fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
            <span>Writer</span>
            <span>Project</span>
            <span>Type</span>
            <span>Schedule</span>
            <span>Initiation</span>
            <span>Commitment</span>
            <span>Revised</span>
            <span>Status</span>
            <span />
          </div>

          {filtered.map((c) => {
            const status = getCommitmentStatus(c);
            const isExpanded = expandedId === c.id;
            const scheduleLabel =
              c.commitment_schedule === "custom"
                ? c.commitment_schedule_custom || "Custom"
                : COMMITMENT_SCHEDULE_LABELS[c.commitment_schedule as CommitmentSchedule] || c.commitment_schedule;
            const editForm = getEditForm(c);
            const editProjectWriters = getWritersForCallReport(initialCallReports, editForm.call_report_id);

            return (
              <div key={c.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Main row */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_1fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 px-3 py-3 items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="lg:hidden text-xs text-gray-400 mr-1">Writer:</span>
                    <span className="font-medium text-sm text-gray-900">{c.writer?.name || "—"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="lg:hidden text-xs text-gray-400 mr-1">Project:</span>
                    <span className="text-sm text-gray-800 truncate block" title={c.call_report?.working_title}>
                      {c.call_report?.working_title || "—"}
                    </span>
                    <span className="text-xs text-gray-400">{c.call_report?.call_report_id}</span>
                  </div>
                  <div>
                    <span className="lg:hidden text-xs text-gray-400 mr-1">Type:</span>
                    <Badge
                      variant="outline"
                      className={
                        c.commitment_type === "contractual"
                          ? "border-purple-300 text-purple-700 bg-purple-50"
                          : "border-gray-300 text-gray-600"
                      }
                    >
                      {c.commitment_type === "contractual" ? "Contractual" : "Verbal"}
                    </Badge>
                  </div>
                  <div>
                    <span className="lg:hidden text-xs text-gray-400 mr-1">Schedule:</span>
                    <span className="text-sm text-gray-700">{scheduleLabel}</span>
                  </div>
                  <div>
                    <span className="lg:hidden text-xs text-gray-400 mr-1">Initiation:</span>
                    <span className="text-sm text-gray-700">{formatDate(c.project_initiation_date)}</span>
                  </div>
                  <div>
                    <span className="lg:hidden text-xs text-gray-400 mr-1">Commitment:</span>
                    <span className="text-sm text-gray-700">{formatDate(c.commitment_date)}</span>
                  </div>
                  <div>
                    <span className="lg:hidden text-xs text-gray-400 mr-1">Revised:</span>
                    <span className={`text-sm ${c.revised_commitment_date ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                      {c.revised_commitment_date ? formatDate(c.revised_commitment_date) : "—"}
                    </span>
                  </div>
                  <div>
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Delay notes inline */}
                {c.delay_notes && !isExpanded && (
                  <div className="px-3 pb-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
                    <span className="font-medium">Delay notes:</span> {c.delay_notes}
                  </div>
                )}

                {/* Expanded edit */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-3 bg-blue-50">
                    <CommitmentFormFields
                      form={editForm}
                      set={(key, val) => setEdit(c.id, key, val)}
                      callReports={initialCallReports}
                      projectWriters={editProjectWriters}
                    />
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => handleSave(c.id)}
                        disabled={saving}
                        className="bg-[#224794] hover:bg-[#1a3670] text-white"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        Save
                      </Button>
                      {!c.is_delivered && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkDelivered(c.id)}
                          disabled={saving}
                          className="border-green-400 text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Mark Delivered
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(c.id)}
                        disabled={saving}
                        className="border-red-300 text-red-600 hover:bg-red-50 ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
