"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Flame, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRatingColors, getGenreColor, getThemeColor, getSlotColor, getScriptStageColors, getStatusLabel } from "@/lib/management/color-palettes";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { toast } from "sonner";

// All status values from Excel
const ALL_STATUS_VALUES = [
  "Script completed",
  "Script Final",
  "Pre-Production",
  "In Pre-Production",
  "Production Planning",
  "In Writing",
  "Pre-Production - In Writing",
  "Story Under Discussion/Development",
  "Contract done - Story Under Discussion/Development",
  "Production Planning - In Writing",
  "Pre Production - In Editing",
  "In Pre-Production - Outsource",
  "In Writing & Editing",
  "Story Discussed & Approved",
  "Need to be Re-Edit",
  "Revised script is awaited",
  "Script is in Editing Process",
  "Script Received/Not Final",
  "Production Planning - In Editing",
  "Production Planning - In Writing - Feedback need to discuss",
  "Pre Production",
  "On-air Drama",
  "Project on Shoot",
  "Script completed not on shoot",
].sort();

interface StatusUpdaterTableProps {
  ideas: ActiveIdeaDetail[];
}

export function StatusUpdaterTable({ ideas }: StatusUpdaterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Extract unique filter values
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    ideas.forEach(idea => {
      idea.genre.forEach(g => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [ideas]);

  const allThemes = useMemo(() => {
    const themeSet = new Set<string>();
    ideas.forEach(idea => {
      if (idea.theme) themeSet.add(idea.theme);
    });
    return Array.from(themeSet).sort();
  }, [ideas]);

  const allSlots = useMemo(() => {
    const slotSet = new Set<string>();
    ideas.forEach(idea => {
      if (idea.slot) slotSet.add(idea.slot);
    });
    return Array.from(slotSet).sort();
  }, [ideas]);

  const allStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    ideas.forEach(idea => {
      if (idea.status) statusSet.add(idea.status);
    });
    return Array.from(statusSet).sort();
  }, [ideas]);

  // Handle status update
  const handleStatusUpdate = async (callReportUuid: string, newStatus: string) => {
    setUpdatingIds(prev => new Set(prev).add(callReportUuid));

    try {
      const response = await fetch(`/api/call-reports/${callReportUuid}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Status updated successfully');

      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(callReportUuid);
        return newSet;
      });
    }
  };

  // Format evaluator scores
  const formatEvaluatorScores = (idea: ActiveIdeaDetail) => {
    if (!idea.evaluator_scores || Object.keys(idea.evaluator_scores).length === 0) {
      return null;
    }

    const scores = idea.evaluator_scores;
    const parts: string[] = [];

    if (scores.nadeem !== null && scores.nadeem !== undefined) parts.push(`N:${scores.nadeem}`);
    if (scores.salman !== null && scores.salman !== undefined) parts.push(`S:${scores.salman}`);
    if (scores.imran !== null && scores.imran !== undefined) parts.push(`I:${scores.imran}`);

    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Filter and sort
  const filteredAndSortedIdeas = useMemo(() => {
    let filtered = ideas.filter(idea => {
      // Search through all writer names
      const writerNamesMatch = idea.writer_names?.some(name =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      ) || idea.writer_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSearch = searchTerm === "" ||
        idea.working_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        writerNamesMatch ||
        (idea.director && idea.director.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesGenre = genreFilter === "all" || idea.genre.includes(genreFilter);
      const matchesTheme = themeFilter === "all" || idea.theme === themeFilter;
      const matchesSlot = slotFilter === "all" || idea.slot === slotFilter;
      const matchesStatus = statusFilter === "all" || idea.status === statusFilter;

      return matchesSearch && matchesGenre && matchesTheme && matchesSlot && matchesStatus;
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
        default:
          aVal = new Date(a.meeting_date).getTime();
          bVal = new Date(b.meeting_date).getTime();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [ideas, searchTerm, genreFilter, themeFilter, slotFilter, statusFilter, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">Status Report</CardTitle>
            <CardDescription className="text-slate-600 mt-1">
              Update project status for all logged stories
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-base px-4 py-2 bg-white">
            {filteredAndSortedIdeas.length} {filteredAndSortedIdeas.length === 1 ? 'Project' : 'Projects'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
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

            <Select value={themeFilter} onValueChange={setThemeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Themes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {allThemes.map(theme => (
                  <SelectItem key={theme} value={theme}>{theme}</SelectItem>
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
                {allStatuses.map(status => (
                  <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
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
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-bold text-slate-700 w-[60px] text-center">#</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[180px] cursor-pointer" onClick={() => handleSort("title")}>Title</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[100px] text-center cursor-pointer" onClick={() => handleSort("rating")}>Rating</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[130px] cursor-pointer" onClick={() => handleSort("writer")}>Writer</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[120px] cursor-pointer" onClick={() => handleSort("director")}>Director</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[120px] cursor-pointer" onClick={() => handleSort("episodes")}>Episodes</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[120px]">Genre</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[100px]">Theme</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[90px]">Slot</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[220px] cursor-pointer" onClick={() => handleSort("status")}>Status</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[110px] text-center cursor-pointer" onClick={() => handleSort("date")}>Date Logged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedIdeas.map((idea, index) => {
                  const stageColors = getScriptStageColors(idea.status);
                  const isUpdating = updatingIds.has(idea.id);

                  return (
                    <TableRow
                      key={idea.id}
                      className="hover:bg-slate-50/50 transition-colors"
                      style={{
                        backgroundColor: `${stageColors.bg}40`,
                        borderLeft: `4px solid ${stageColors.border}`
                      }}
                    >
                      {/* Serial Number */}
                      <TableCell className="text-center text-sm font-semibold text-slate-600">
                        {index + 1}
                      </TableCell>

                      {/* Title */}
                      <TableCell className="font-medium text-slate-900">
                        <span className="truncate">{idea.working_title}</span>
                      </TableCell>

                      {/* Rating */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            className="text-sm font-bold px-3 py-1"
                            style={{
                              backgroundColor: getRatingColors(idea.overall_rating).bg,
                              color: idea.overall_rating && idea.overall_rating >= 7 ? 'white' : '#1f2937',
                              border: 'none'
                            }}
                          >
                            {idea.overall_rating ? idea.overall_rating.toFixed(1) : 'N/A'}
                          </Badge>
                          {formatEvaluatorScores(idea) && (
                            <div className="flex gap-1 text-[10px] text-slate-500">
                              {formatEvaluatorScores(idea)}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Writer */}
                      <TableCell className="text-sm text-slate-700">
                        {idea.writer_names && idea.writer_names.length > 0
                          ? idea.writer_names.join(', ')
                          : idea.writer_name || <span className="text-slate-400">N/A</span>}
                      </TableCell>

                      {/* Director */}
                      <TableCell className="text-sm text-slate-700">
                        {idea.director || <span className="text-slate-400">TBD</span>}
                      </TableCell>

                      {/* Episodes */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>{idea.received_episodes || 0} / {idea.total_episodes || 0}</span>
                            <span className="font-semibold">{idea.completion_percentage?.toFixed(0) || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${idea.completion_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Genre */}
                      <TableCell className="text-sm text-slate-700">
                        {idea.genre.join(', ') || <span className="text-slate-400">N/A</span>}
                      </TableCell>

                      {/* Theme */}
                      <TableCell className="text-sm text-slate-700">
                        {idea.theme || <span className="text-slate-400">N/A</span>}
                      </TableCell>

                      {/* Slot */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                          style={{
                            backgroundColor: `${getSlotColor(idea.slot)}20`,
                            borderColor: getSlotColor(idea.slot),
                            color: idea.slot ? '#1e3a8a' : '#6b7280'
                          }}
                        >
                          {idea.slot || <span className="text-gray-400">TBD</span>}
                        </Badge>
                      </TableCell>

                      {/* Status - EDITABLE */}
                      <TableCell>
                        <Select
                          value={idea.status || ""}
                          onValueChange={(value) => handleStatusUpdate(idea.id, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className={cn("w-full", isUpdating && "opacity-50 cursor-wait")}>
                            <SelectValue placeholder="Select status">
                              {idea.status ? getStatusLabel(idea.status) : "Select status"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {ALL_STATUS_VALUES.map(status => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Date Logged */}
                      <TableCell className="text-center text-sm text-slate-700">
                        {new Date(idea.meeting_date).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'UTC'
                        })}
                      </TableCell>
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
