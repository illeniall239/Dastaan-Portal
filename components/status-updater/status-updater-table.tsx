"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getScriptStageColors } from "@/lib/management/color-palettes";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { toast } from "sonner";
import { ExportButton } from "@/components/management/export-button";

const STAGE_OPTIONS = [
  { key: "discussion", label: "Discussion", statuses: ["Story Under Discussion/Development", "Contract done - Story Under Discussion/Development", "Story Discussed & Approved"] },
  { key: "writing", label: "In Writing", statuses: ["In Writing", "Pre-Production - In Writing", "Production Planning - In Writing", "In Writing & Editing", "Production Planning - In Writing - Feedback need to discuss"] },
  { key: "editing", label: "In Editing", statuses: ["Pre Production - In Editing", "Script is in Editing Process", "Need to be Re-Edit", "Revised script is awaited", "Production Planning - In Editing"] },
  { key: "preproduction", label: "Pre-Production", statuses: ["Pre-Production", "In Pre-Production", "Pre Production", "In Pre-Production - Outsource", "Production Planning"] },
  { key: "completed", label: "Script Ready", statuses: ["Script completed", "Script Final", "Script Received/Not Final", "Script completed not on shoot"] },
  { key: "production", label: "In Production", statuses: ["On-air Drama", "Project on Shoot"] },
  { key: "needs_approval", label: "Needs Management's Approval", statuses: ["Needs Management's Approval"] },
];

/** Derive the stage key from a raw status string */
function getStageKey(status: string | null | undefined): string {
  if (!status) return "";
  const lower = status.toLowerCase();
  for (const stage of STAGE_OPTIONS) {
    if (stage.statuses.some(s => lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower))) {
      return stage.key;
    }
  }
  return "";
}

interface StatusUpdaterTableProps {
  ideas: ActiveIdeaDetail[];
  role?: string;
  readOnly?: boolean; // If true, status and remarks fields will be read-only
}

export function StatusUpdaterTable({ ideas, role, readOnly = false }: StatusUpdaterTableProps) {
  const showManagementColumns = role !== "evaluator";
  const showStageStatusRemarks = true;
  const [searchTerm, setSearchTerm] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [completionMin, setCompletionMin] = useState<string>("");
  const [completionMax, setCompletionMax] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localUpdates, setLocalUpdates] = useState<Map<string, { status?: string; remarks?: string }>>(new Map());

  // Merge server data with local updates so UI reflects changes immediately
  const mergedIdeas = useMemo(() => {
    if (localUpdates.size === 0) return ideas;
    return ideas.map(idea => {
      const updates = localUpdates.get(idea.id);
      return updates ? { ...idea, ...updates } : idea;
    });
  }, [ideas, localUpdates]);

  // Extract unique filter values
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    mergedIdeas.forEach(idea => {
      idea.genre.forEach(g => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [mergedIdeas]);

  const allPersons = useMemo(() => {
    const personSet = new Set<string>();
    mergedIdeas.forEach(idea => {
      if (idea.person_in_charge) personSet.add(idea.person_in_charge);
    });
    return Array.from(personSet).sort();
  }, [mergedIdeas]);

  const allSlots = useMemo(() => {
    const slotSet = new Set<string>();
    mergedIdeas.forEach(idea => {
      if (idea.slot) slotSet.add(idea.slot);
    });
    return Array.from(slotSet).sort();
  }, [mergedIdeas]);



  // Clear selections when filters change (not on sort change, since sorting doesn't hide rows)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, genreFilter, slotFilter, statusFilter, personFilter, completionMin, completionMax]);

  // Handle field update (status or remarks)
  const handleFieldUpdate = async (callReportUuid: string, field: 'status' | 'remarks', value: string) => {
    setUpdatingIds(prev => new Set(prev).add(callReportUuid));

    try {
      const response = await fetch(`/api/call-reports/${callReportUuid}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${field}`);
      }

      // Update local state so UI reflects the change immediately
      setLocalUpdates(prev => {
        const next = new Map(prev);
        const existing = next.get(callReportUuid) || {};
        next.set(callReportUuid, { ...existing, [field]: value });
        return next;
      });

      toast.success(`${field === 'status' ? 'Status' : 'Remarks'} updated`);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(callReportUuid);
        return newSet;
      });
    }
  };

  // Filter and sort
  const filteredAndSortedIdeas = useMemo(() => {
    let filtered = mergedIdeas.filter(idea => {
      // Search through all writer names
      const writerNamesMatch = idea.writer_names?.some(name =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      ) || idea.writer_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSearch = searchTerm === "" ||
        idea.working_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        writerNamesMatch ||
        (idea.director && idea.director.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesGenre = genreFilter === "all" || idea.genre.includes(genreFilter);
      const matchesSlot = slotFilter === "all" || idea.slot === slotFilter;
      const matchesStatus = statusFilter === "all" ||
        STAGE_OPTIONS.find(s => s.key === statusFilter)?.statuses.some(
          s => idea.status?.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(idea.status?.toLowerCase() || '')
        );
      const matchesPerson = personFilter === "all" || idea.person_in_charge === personFilter;

      const p = idea.completion_percentage || 0;
      const minVal = completionMin !== "" ? Number(completionMin) : null;
      const maxVal = completionMax !== "" ? Number(completionMax) : null;
      const matchesCompletion =
        (minVal === null || p >= minVal) &&
        (maxVal === null || p <= maxVal);

      return matchesSearch && matchesGenre && matchesSlot && matchesStatus && matchesPerson && matchesCompletion;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case "title":
          aVal = a.working_title.toLowerCase();
          bVal = b.working_title.toLowerCase();
          break;
        case "rating":
          aVal = a.overall_rating || 0;
          bVal = b.overall_rating || 0;
          break;
        case "writer":
          aVal = (a.writer_names?.join(', ') || a.writer_name || '').toLowerCase();
          bVal = (b.writer_names?.join(', ') || b.writer_name || '').toLowerCase();
          break;
        case "director":
          aVal = (a.director || "").toLowerCase();
          bVal = (b.director || "").toLowerCase();
          break;
        case "episodes":
          aVal = a.received_episodes || 0;
          bVal = b.received_episodes || 0;
          break;
        case "completion":
          aVal = a.completion_percentage || 0;
          bVal = b.completion_percentage || 0;
          break;
        case "date":
          aVal = new Date(a.meeting_date).getTime();
          bVal = new Date(b.meeting_date).getTime();
          break;
        case "status":
          aVal = (a.status || "").toLowerCase();
          bVal = (b.status || "").toLowerCase();
          break;
        case "daysSinceLastEp":
          aVal = a.days_since_last_episode ?? -1;
          bVal = b.days_since_last_episode ?? -1;
          break;
        default:
          aVal = new Date(a.meeting_date).getTime();
          bVal = new Date(b.meeting_date).getTime();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [mergedIdeas, searchTerm, genreFilter, slotFilter, statusFilter, personFilter, completionMin, completionMax, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Transform data for export to match table columns
  // For programming portal, include all possible columns regardless of role
  const transformDataForExport = () => {
    // Use selected rows if any are selected, otherwise use all filtered rows
    const rowsToExport = selectedIds.size > 0 
      ? filteredAndSortedIdeas.filter(idea => selectedIds.has(idea.id))
      : filteredAndSortedIdeas;
    
    return rowsToExport.map((idea, index) => {
      const transformed: any = {
        "Sr #": index + 1,
        "Person in Charge": idea.person_in_charge || '',
        "Title": idea.working_title,
        "Writer": idea.writer_names && idea.writer_names.length > 0
          ? idea.writer_names.join(', ')
          : idea.writer_name || '',
        "Director": idea.director || '',
        "Slot": idea.slot || '',
        "Short Synopsis": idea.logline || '',
        "Evaluation Decision": idea.one_liner_approved ?
          (idea.one_liner_approved === "approved" ? "Approved" :
           idea.one_liner_approved === "needs_improvement" ? "Needs Revision" :
           idea.one_liner_approved === "pending" ? "Pending" : "Rejected") : '',
        "Expected Episodes": idea.total_episodes ?? '',
        "Episodes Received": idea.received_episodes ?? '',
        "Script Completion %": idea.completion_percentage != null ? `${idea.completion_percentage.toFixed(0)}%` : '',
        "Script Aging (Days)": idea.days_active,
        "First Ep. Received": idea.first_episode_received_at
          ? new Date(idea.first_episode_received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '',
        "Last Ep. Received": idea.last_episode_received_at
          ? new Date(idea.last_episode_received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '',
        "Days Since Last Ep.": idea.days_since_last_episode != null ? idea.days_since_last_episode : '',
        "Revised Episodes": idea.revised_episode_count != null ? idea.revised_episode_count : 0,
        "Monthly Breakdown": idea.monthly_episode_receipts && Object.keys(idea.monthly_episode_receipts).length > 0 ?
          Object.values(idea.monthly_episode_receipts).reduce((a: number, b: number) => a + b, 0) + ' eps' : '',
        "Theme": idea.theme || '',
        // Always include management columns for programming portal export
        "Stage": STAGE_OPTIONS.find(s => s.key === getStageKey(idea.status))?.label || '',
        "Status": idea.status || '',
        "Content Team Overall": idea.content_overall ? `${idea.content_overall.toFixed(1)}${idea.content_eval_count ? ` (${idea.content_eval_count})` : ''}` : '',
        "Programming Overall": idea.programming_overall ? `${idea.programming_overall.toFixed(1)}${idea.programming_eval_count ? ` (${idea.programming_eval_count})` : ''}` : '',
        "Management Overall": idea.management_overall ? `${idea.management_overall.toFixed(1)}${idea.management_eval_count ? ` (${idea.management_eval_count})` : ''}` : '',
        "Remarks": idea.remarks || '',
      };

      return transformed;
    });
  };

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900">
              {!readOnly ? "Status Report" : "Project Status Overview"}
            </CardTitle>
            {!readOnly && (
              <CardDescription className="text-slate-600 mt-1">
                Update project status for all logged stories
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1.5">
                  {selectedIds.size} selected
                </Badge>
                <ExportButton
                  data={transformDataForExport()}
                  filename={`CMS_Selected_Export_${new Date().toISOString().split('T')[0]}`}
                  formats={["excel", "csv"]}
                />
              </div>
            ) : (
              <ExportButton
                data={transformDataForExport()}
                filename={`CMS_Consolidated_Export_${new Date().toISOString().split('T')[0]}`}
                formats={["excel", "csv"]}
              />
            )}
            <Badge variant="outline" className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 bg-white w-fit">
              {filteredAndSortedIdeas.length} {filteredAndSortedIdeas.length === 1 ? 'Project' : 'Projects'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, writer, or director..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Select value={personFilter} onValueChange={setPersonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Persons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Persons</SelectItem>
                {allPersons.map(person => (
                  <SelectItem key={person} value={person}>{person}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Min %"
                value={completionMin}
                onChange={(e) => setCompletionMin(e.target.value)}
                className="w-20 h-9 text-xs"
              />
              <span className="text-slate-400 text-xs">—</span>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Max %"
                value={completionMax}
                onChange={(e) => setCompletionMax(e.target.value)}
                className="w-20 h-9 text-xs"
              />
            </div>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {allGenres.map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={slotFilter} onValueChange={setSlotFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Slots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {allSlots.map(slot => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGE_OPTIONS.map(stage => (
                  <SelectItem key={stage.key} value={stage.key}>{stage.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Logged</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="writer">Writer</SelectItem>
                <SelectItem value="director">Director</SelectItem>
                <SelectItem value="episodes">Episodes</SelectItem>
                <SelectItem value="completion">Completion</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="block sm:hidden text-xs text-slate-500 mb-2 px-1">
          ← Scroll horizontally to view all columns →
        </div>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="font-bold text-slate-700 text-center border-r border-b whitespace-nowrap w-12">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          selectedIds.size === filteredAndSortedIdeas.length && filteredAndSortedIdeas.length > 0
                            ? true
                            : selectedIds.size > 0
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(new Set(filteredAndSortedIdeas.map(idea => idea.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        aria-label="Select all"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-center border-r border-b whitespace-nowrap">Sr #</TableHead>
                  <TableHead className="font-bold text-slate-700 border-r border-b whitespace-nowrap">Person in Charge</TableHead>
                  <TableHead className="font-bold text-slate-700 cursor-pointer border-r border-b whitespace-nowrap" onClick={() => handleSort("title")}>Title</TableHead>
                  <TableHead className="font-bold text-slate-700 border-b whitespace-nowrap">Writer</TableHead>
                  <TableHead className="font-bold text-slate-700 border-b whitespace-nowrap">Director</TableHead>
                  <TableHead className="font-bold text-slate-700 border-b whitespace-nowrap">Slot</TableHead>
                  <TableHead className="font-bold text-slate-700 border-b whitespace-nowrap">Short Synopsis</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center border-b whitespace-nowrap">Evaluation Decision</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center cursor-pointer border-b whitespace-nowrap" onClick={() => handleSort("episodes")}>Expected Episodes</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center cursor-pointer border-b whitespace-nowrap" onClick={() => handleSort("episodes")}>Episodes Received</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center cursor-pointer border-b whitespace-nowrap" onClick={() => handleSort("completion")}>Script Completion %</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center cursor-pointer border-b whitespace-nowrap" onClick={() => handleSort("date")}>Script Aging (Days)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center border-b whitespace-nowrap">First Ep. Received</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center border-b whitespace-nowrap">Last Ep. Received</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center cursor-pointer border-b whitespace-nowrap" onClick={() => handleSort("daysSinceLastEp")}>Days Since Last Ep.</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center border-b whitespace-nowrap">Revised Episodes</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center border-b whitespace-nowrap">Monthly Breakdown</TableHead>
                  <TableHead className="font-bold text-slate-700 border-b whitespace-nowrap">Theme</TableHead>
                  {showStageStatusRemarks && (
                    <>
                      <TableHead className="font-bold text-slate-700 border-b whitespace-nowrap">Stage</TableHead>
                      <TableHead className="font-bold text-slate-700 cursor-pointer border-b whitespace-nowrap" onClick={() => handleSort("status")}>Status</TableHead>
                    </>
                  )}
                  {showManagementColumns && (
                    <>
                      <TableHead className="bg-blue-50/50 font-bold text-blue-800 text-center border-x border-b px-2 whitespace-nowrap">Content Team Overall</TableHead>
                      <TableHead className="bg-purple-50/50 font-bold text-purple-800 text-center border-r border-b px-2 whitespace-nowrap">Programming Overall</TableHead>
                      <TableHead className="bg-amber-50/50 font-bold text-amber-800 text-center border-r border-b px-2 whitespace-nowrap">Management Overall</TableHead>
                    </>
                  )}
                  {showStageStatusRemarks && (
                    <TableHead className="font-bold text-slate-700 border-b whitespace-nowrap">Remarks</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedIdeas.map((idea, index) => {
                  const stageColors = getScriptStageColors(idea.status);
                  const isUpdating = updatingIds.has(idea.id);

                  return (
                    <TableRow
                      key={idea.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                      style={{
                        backgroundColor: `${stageColors.bg}15`,
                      }}
                    >
                      {/* Selection checkbox */}
                      <TableCell className="text-center text-xs font-semibold text-slate-500 border-r border-b w-12">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedIds.has(idea.id)}
                            onCheckedChange={(checked) => {
                              const newSelectedIds = new Set(selectedIds);
                              if (checked) {
                                newSelectedIds.add(idea.id);
                              } else {
                                newSelectedIds.delete(idea.id);
                              }
                              setSelectedIds(newSelectedIds);
                            }}
                            aria-label={`Select row ${index + 1}`}
                          />
                        </div>
                      </TableCell>
                      {/* Sr # */}
                      <TableCell className="text-center text-xs font-semibold text-slate-500 border-r border-b">
                        {index + 1}
                      </TableCell>

                      {/* Person in Charge */}
                      <TableCell className="text-xs text-slate-700 border-r border-b">
                        {idea.person_in_charge || <span className="text-slate-300">N/A</span>}
                      </TableCell>

                      {/* Title */}
                      <TableCell className="font-medium text-slate-900 text-xs border-r border-b">
                        {idea.working_title}
                      </TableCell>

                      {/* Writer */}
                      <TableCell className="text-[11px] text-slate-600 border-b">
                        {idea.writer_names && idea.writer_names.length > 0
                          ? idea.writer_names.join(', ')
                          : idea.writer_name || <span className="text-slate-300">N/A</span>}
                      </TableCell>

                      {/* Director */}
                      <TableCell className="text-[11px] text-slate-600 border-b">
                        {idea.director || <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Slot */}
                      <TableCell className="text-[11px] text-slate-600 border-b">
                        {idea.slot || <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Short Synopsis */}
                      <TableCell className="text-[11px] text-slate-600 border-b">
                        {idea.logline || <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Evaluation Decision */}
                      <TableCell className="text-center border-b">
                        {idea.one_liner_approved ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0 h-5 border-none",
                                idea.one_liner_approved === "approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : idea.one_liner_approved === "needs_improvement"
                                    ? "bg-amber-100 text-amber-700"
                                    : idea.one_liner_approved === "pending"
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-rose-100 text-rose-700"
                              )}
                            >
                              {idea.one_liner_approved === "approved" ? "Approved" : idea.one_liner_approved === "needs_improvement" ? "Needs Revision" : idea.one_liner_approved === "pending" ? "Pending" : "Rejected"}
                            </Badge>
                            {idea.total_evaluators ? (
                              <span className="text-[9px] text-slate-400">
                                {idea.approval_count || 0}/{idea.total_evaluators}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Expected Episodes */}
                      <TableCell className="text-center text-[11px] text-slate-600 border-b">
                        {idea.total_episodes ?? <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Episodes Received */}
                      <TableCell className="text-center text-[11px] text-slate-600 border-b">
                        {idea.received_episodes ?? <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Script Completion % */}
                      <TableCell className="text-center text-[11px] text-slate-600 border-b">
                        {idea.completion_percentage != null ? `${idea.completion_percentage.toFixed(0)}%` : <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Script Aging (Days) */}
                      <TableCell className="text-center text-[11px] border-b">
                        <span className={cn(
                          "font-semibold",
                          idea.days_active >= 90 ? "text-rose-600" :
                          idea.days_active >= 60 ? "text-amber-600" :
                          idea.days_active >= 30 ? "text-blue-600" :
                          "text-slate-600"
                        )}>
                          {idea.days_active}
                        </span>
                      </TableCell>

                      {/* First Ep. Received */}
                      <TableCell className="text-center text-[11px] text-slate-600 border-b whitespace-nowrap">
                        {idea.first_episode_received_at
                          ? new Date(idea.first_episode_received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Last Ep. Received */}
                      <TableCell className="text-center text-[11px] text-slate-600 border-b whitespace-nowrap">
                        {idea.last_episode_received_at
                          ? new Date(idea.last_episode_received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-slate-300">-</span>}
                      </TableCell>

                      {/* Days Since Last Ep. */}
                      <TableCell className="text-center text-[11px] border-b">
                        {idea.days_since_last_episode != null ? (
                          <span className={cn(
                            "font-semibold",
                            idea.days_since_last_episode >= 60 ? "text-rose-600" :
                            idea.days_since_last_episode >= 30 ? "text-amber-600" :
                            idea.days_since_last_episode >= 14 ? "text-blue-600" :
                            "text-emerald-600"
                          )}>
                            {idea.days_since_last_episode}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Revised Episodes */}
                      <TableCell className="text-center text-[11px] border-b">
                        {idea.revised_episode_count != null && idea.revised_episode_count > 0 ? (
                          <span className="font-semibold text-amber-600">{idea.revised_episode_count}</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </TableCell>

                      {/* Monthly Breakdown */}
                      <TableCell className="text-center text-[11px] border-b">
                        {idea.monthly_episode_receipts && Object.keys(idea.monthly_episode_receipts).length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-blue-600 underline underline-offset-2 hover:text-blue-800 text-[11px] cursor-pointer">
                                {Object.values(idea.monthly_episode_receipts).reduce((a: number, b: number) => a + b, 0)} eps
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3">
                              <p className="text-xs font-bold text-slate-700 mb-2">Monthly Breakdown</p>
                              <div className="space-y-1">
                                {Object.entries(idea.monthly_episode_receipts)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([month, count]) => (
                                    <div key={month} className="flex justify-between text-xs">
                                      <span className="text-slate-600">
                                        {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="font-semibold text-slate-800">{count as number}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>

                      {/* Theme */}
                      <TableCell className="text-[11px] text-slate-600 border-b">
                        {idea.theme || <span className="text-slate-300">-</span>}
                      </TableCell>

                      {showStageStatusRemarks && (
                        <>
                          {/* Stage - Dropdown */}
                          <TableCell className="border-b px-2">
                            {readOnly ? (
                              <div className="w-[180px] text-[11px] px-2 py-1">
                                {idea.status || <span className="text-slate-400">—</span>}
                              </div>
                            ) : (
                              <Select
                                value={idea.status || "unset"}
                                onValueChange={(val) => {
                                  if (val === "unset") return;
                                  handleFieldUpdate(idea.id, 'status', val);
                                }}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className={cn("w-[180px] h-8 text-[11px]", isUpdating && "opacity-50")}>
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STAGE_OPTIONS.map(stage => (
                                    <SelectGroup key={stage.key}>
                                      <SelectLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{stage.label}</SelectLabel>
                                      {stage.statuses.map(status => (
                                        <SelectItem key={status} value={status} className="text-xs">
                                          {status}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>

                          {/* Status - Free Text */}
                          <TableCell className="border-b px-2">
                            {readOnly ? (
                              <div className="w-[160px] min-h-[32px] text-[11px] px-3 py-2 overflow-hidden">
                                {idea.status || <span className="text-slate-400">No status</span>}
                              </div>
                            ) : (
                              <textarea
                                defaultValue={idea.status || ""}
                                className={cn(
                                  "w-[160px] min-h-[32px] text-[11px] rounded-md border border-input bg-background px-3 py-2 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                  isUpdating && "opacity-50"
                                )}
                                disabled={isUpdating}
                                rows={1}
                                onInput={(e) => {
                                  const el = e.target as HTMLTextAreaElement;
                                  el.style.height = 'auto';
                                  el.style.height = el.scrollHeight + 'px';
                                }}
                                ref={(el) => {
                                  if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val !== (idea.status || "")) {
                                    handleFieldUpdate(idea.id, 'status', val);
                                  }
                                }}
                                placeholder="Status..."
                              />
                            )}
                          </TableCell>
                        </>
                      )}

                      {showManagementColumns && (
                        <>
                          {/* Content Team Overall */}
                          <TableCell className="bg-blue-50/20 border-x border-b text-center border-b">
                            {idea.content_overall ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-blue-700 text-[11px]">{idea.content_overall.toFixed(1)}</span>
                                {(idea.content_eval_count ?? 0) > 0 && (
                                  <span className="text-[9px] text-blue-500">({idea.content_eval_count})</span>
                                )}
                              </div>
                            ) : "-"}
                          </TableCell>

                          {/* Programming Overall */}
                          <TableCell className="bg-purple-50/20 border-r border-b text-center border-b">
                            {idea.programming_overall ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-purple-700 text-[11px]">{idea.programming_overall.toFixed(1)}</span>
                                {(idea.programming_eval_count ?? 0) > 0 && (
                                  <span className="text-[9px] text-purple-500">({idea.programming_eval_count})</span>
                                )}
                              </div>
                            ) : "-"}
                          </TableCell>

                          {/* Management Overall */}
                          <TableCell className="bg-amber-50/20 border-r border-b text-center border-b">
                            {idea.management_overall ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-amber-700 text-[11px]">{idea.management_overall.toFixed(1)}</span>
                                {(idea.management_eval_count ?? 0) > 0 && (
                                  <span className="text-[9px] text-amber-500">({idea.management_eval_count})</span>
                                )}
                              </div>
                            ) : "-"}
                          </TableCell>
                        </>
                      )}

                      {showStageStatusRemarks && (
                        <>
                          {/* Remarks - Free Text */}
                          <TableCell className="border-b px-2">
                            {readOnly ? (
                              <div className="w-[180px] min-h-[32px] text-[11px] px-3 py-2 overflow-hidden">
                                {idea.remarks || <span className="text-slate-400">No remarks</span>}
                              </div>
                            ) : (
                              <textarea
                                defaultValue={idea.remarks || ""}
                                className={cn(
                                  "w-[180px] min-h-[32px] text-[11px] rounded-md border border-input bg-background px-3 py-2 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                  isUpdating && "opacity-50"
                                )}
                                disabled={isUpdating}
                                rows={1}
                                onInput={(e) => {
                                  const el = e.target as HTMLTextAreaElement;
                                  el.style.height = 'auto';
                                  el.style.height = el.scrollHeight + 'px';
                                }}
                                ref={(el) => {
                                  if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val !== (idea.remarks || "")) {
                                    handleFieldUpdate(idea.id, 'remarks', val);
                                  }
                                }}
                                placeholder="Remarks..."
                              />
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {filteredAndSortedIdeas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No projects found matching your filters.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
