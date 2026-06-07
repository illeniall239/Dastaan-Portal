"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  Clock,
  User,
  Search,
  Eye,
  ArrowUpDown,
  X,
  Pin,
} from "lucide-react";
import type { PipelineStory } from "@/types";
import { cn } from "@/lib/utils";

interface StagePipelineTableProps {
  stories: PipelineStory[];
  onStoryClick: (story: PipelineStory) => void;
}

type SortField = "title" | "writer_name" | "current_stage" | "days_in_current_stage" | "genre";
type SortDirection = "asc" | "desc";

export function StagePipelineTable({ stories, onStoryClick }: StagePipelineTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterGenre, setFilterGenre] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("days_in_current_stage");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [freezePanes, setFreezePanes] = useState(false);

  // Get unique genres for filter
  const uniqueGenres = useMemo(() => {
    return Array.from(new Set(stories.map(s => s.genre))).sort();
  }, [stories]);

  // Filter and sort stories
  const filteredStories = useMemo(() => {
    let filtered = [...stories];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.writer_name.toLowerCase().includes(query) ||
          s.story_id.toLowerCase().includes(query)
      );
    }

    // Stage filter
    if (filterStage !== "all") {
      const stage = parseInt(filterStage);
      filtered = filtered.filter((s) => s.current_stage === stage);
    }

    // Genre filter
    if (filterGenre !== "all") {
      filtered = filtered.filter((s) => s.genre === filterGenre);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [stories, searchQuery, filterStage, filterGenre, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStage("all");
    setFilterGenre("all");
  };

  // Get progress percentage
  const getProgress = (stage: number) => {
    if (stage === 1) return 33;
    if (stage === 2) return 66;
    return 100;
  };

  // Get urgency styling
  const getUrgencyStyle = (days: number) => {
    if (days < 7) return "text-green-600 bg-green-50";
    if (days <= 14) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getStageBadge = (stage: number) => {
    const badges = [
      { label: "Stage 1", color: "bg-blue-500" },
      { label: "Stage 2", color: "bg-purple-500" },
      { label: "Stage 3", color: "bg-green-500" },
    ];
    return badges[stage - 1];
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Filters & Search</h3>
          <div className="flex items-center gap-2">
            <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-7 text-xs px-2">
              <Pin className="h-3 w-3" />
              {freezePanes ? "Unfreeze" : "Freeze Panes"}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="search"
                placeholder="Story, writer, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Stage Filter */}
          <div className="space-y-2">
            <Label htmlFor="stage" className="text-xs">Current Stage</Label>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger id="stage">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="1">Stage 1: Idea Approved</SelectItem>
                <SelectItem value="2">Stage 2: Writer Engagement</SelectItem>
                <SelectItem value="3">Stage 3: Contract & Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Genre Filter */}
          <div className="space-y-2">
            <Label htmlFor="genre" className="text-xs">Genre</Label>
            <Select value={filterGenre} onValueChange={setFilterGenre}>
              <SelectTrigger id="genre">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {uniqueGenres.map((genre, index) => (
                  <SelectItem
                    key={genre ?? `genre-null-${index}`}
                    value={genre ?? "unknown"}
                  >
                    {genre ?? "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-slate-600">
              <span className="font-semibold">{filteredStories.length}</span> of{" "}
              <span className="font-semibold">{stories.length}</span> stories
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
          <Table wrapperClassName="max-h-[70vh]">
            <TableHeader>
              <TableRow className={`bg-slate-50 ${freezePanes ? "sticky top-0 z-10" : ""}`}>
                <TableHead className={`w-[250px] bg-slate-50 ${freezePanes ? "sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent font-semibold"
                    onClick={() => handleSort("title")}
                  >
                    Story Details
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent font-semibold"
                    onClick={() => handleSort("current_stage")}
                  >
                    Current Stage
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[200px]">Progress</TableHead>
                <TableHead className="w-[150px]">Stage 1 Assignment</TableHead>
                <TableHead className="w-[150px]">Stage 2 Assignment</TableHead>
                <TableHead className="w-[150px]">Stage 3 Assignment</TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent font-semibold"
                    onClick={() => handleSort("days_in_current_stage")}
                  >
                    Days in Stage
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search className="h-8 w-8" />
                      <p className="text-sm font-medium">No stories found</p>
                      <p className="text-xs">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStories.map((story) => {
                  const stageBadge = getStageBadge(story.current_stage);
                  const progress = getProgress(story.current_stage);

                  return (
                    <TableRow
                      key={story.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => onStoryClick(story)}
                    >
                      {/* Story Details */}
                      <TableCell className={`bg-white ${freezePanes ? "sticky left-0 z-[9] shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>
                        <div>
                          <div className="text-base font-bold leading-relaxed text-slate-900 mb-1">
                            {story.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <User className="h-3 w-3" />
                            <span>{story.writer_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {story.genre}
                            </Badge>
                            <span className="text-xs text-slate-500 font-mono">
                              {story.story_id}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Current Stage */}
                      <TableCell>
                        <Badge className={cn("text-white", stageBadge.color)}>
                          {stageBadge.label}
                        </Badge>
                      </TableCell>

                      {/* Progress */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">
                              {progress}% Complete
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                progress === 100
                                  ? "bg-green-500"
                                  : "bg-gradient-to-r from-blue-500 to-purple-500"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map((stage) => {
                              const status =
                                stage === 1
                                  ? story.stage1_status
                                  : stage === 2
                                  ? story.stage2_status
                                  : story.stage3_status;
                              return (
                                <div key={stage} className="flex items-center gap-0.5">
                                  {status === "completed" ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : status === "in_progress" ? (
                                    <Clock className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <div className="h-3 w-3 rounded-full border-2 border-slate-300" />
                                  )}
                                  <span className="text-xs text-slate-400">{stage}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TableCell>

                      {/* Stage 1 Assignment */}
                      <TableCell>
                        {story.stage1_assigned ? (
                          <div className="text-xs">
                            <div className="font-medium text-slate-700">
                              {story.stage1_assigned}
                            </div>
                            <div className="text-slate-400 text-[10px]">
                              {story.stage1_assigned_department}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Stage 2 Assignment */}
                      <TableCell>
                        {story.stage2_assigned ? (
                          <div className="text-xs">
                            <div className="font-medium text-slate-700">
                              {story.stage2_assigned}
                            </div>
                            <div className="text-slate-400 text-[10px]">
                              {story.stage2_assigned_department}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Stage 3 Assignment */}
                      <TableCell>
                        {story.stage3_assigned ? (
                          <div className="text-xs">
                            <div className="font-medium text-slate-700">
                              {story.stage3_assigned}
                            </div>
                            <div className="text-slate-400 text-[10px]">
                              {story.stage3_assigned_department}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Days in Stage */}
                      <TableCell>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold",
                            getUrgencyStyle(story.days_in_current_stage)
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {story.days_in_current_stage} days
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStoryClick(story);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      </Card>
    </div>
  );
}
