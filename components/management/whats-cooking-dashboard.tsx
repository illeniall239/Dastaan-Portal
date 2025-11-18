"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import {
  getRatingTier,
  getRatingColors,
  getStatusLabel,
  getScriptStageColors,
  isRecent,
  isOverdue,
} from "@/lib/management/color-palettes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WhatsCookingDashboardProps {
  ideas: ActiveIdeaDetail[];
}

type SortField = "title" | "rating" | "genre" | "theme" | "slot" | "director" | "status" | "days" | "writer" | "episodes";
type SortDirection = "asc" | "desc" | null;
type GroupByOption = 'none' | 'slot' | 'writer' | 'director' | 'genre' | 'type' | 'status';

interface NestedGroup {
  items: ActiveIdeaDetail[];
  subGroups?: Record<string, NestedGroup>;
}

export function WhatsCookingDashboard({ ideas }: WhatsCookingDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [groupByLevels, setGroupByLevels] = useState<GroupByOption[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Extract unique values for filters
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    ideas.forEach(idea => {
      idea.genre.forEach(g => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [ideas]);

  const allSlots = useMemo(() => {
    const slotSet = new Set<string>();
    ideas.forEach(idea => {
      if (idea.slot) slotSet.add(idea.slot);
    });
    return Array.from(slotSet).sort();
  }, [ideas]);

  const allThemes = useMemo(() => {
    const themeSet = new Set<string>();
    ideas.forEach(idea => {
      if (idea.theme) themeSet.add(idea.theme);
    });
    return Array.from(themeSet).sort();
  }, [ideas]);

  // Helper: Get group value from idea based on grouping option
  const getGroupValue = (idea: ActiveIdeaDetail, groupBy: GroupByOption): string => {
    switch (groupBy) {
      case 'slot':
        return idea.slot || 'Unassigned';
      case 'writer':
        return idea.writer_name || 'Unknown Writer';
      case 'director':
        return idea.director || 'TBD';
      case 'genre':
        return idea.genre && idea.genre.length > 0 ? idea.genre[0] : 'Uncategorized';
      case 'type':
        return idea.content_type || 'Unspecified';
      case 'status':
        return getStatusLabel(idea.status);
      default:
        return 'Other';
    }
  };

  // Helper: Build hierarchical key for collapsed state
  const buildGroupKey = (path: string[]): string => {
    return path.join('>');
  };

  // Helper: Get readable label for group option
  const getGroupLabel = (option: GroupByOption): string => {
    const labels: Record<GroupByOption, string> = {
      none: 'None',
      slot: 'Slot',
      writer: 'Writer',
      director: 'Director',
      genre: 'Genre',
      type: 'Type',
      status: 'Stage',
    };
    return labels[option];
  };

  // Helper: Add or remove grouping level
  const addGroupingLevel = (option: GroupByOption) => {
    if (option !== 'none' && !groupByLevels.includes(option)) {
      setGroupByLevels([...groupByLevels, option]);
    }
  };

  const removeGroupingLevel = (index: number) => {
    setGroupByLevels(groupByLevels.filter((_, i) => i !== index));
  };

  // Toggle group collapse with hierarchical path
  const toggleGroup = (groupPath: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupPath)) {
      newCollapsed.delete(groupPath);
    } else {
      newCollapsed.add(groupPath);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3 ml-1 inline text-blue-600" />;
    if (sortDirection === "desc") return <ArrowDown className="h-3 w-3 ml-1 inline text-blue-600" />;
    return null;
  };

  // Filter and sort ideas
  const filteredIdeas = useMemo(() => {
    let result = ideas.filter(idea => {
      // Search filter (title, writer, or director)
      const matchesSearch = searchTerm === "" ||
        idea.working_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.writer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (idea.director && idea.director.toLowerCase().includes(searchTerm.toLowerCase()));

      // Rating filter
      const matchesRating = ratingFilter === "all" ||
        (ratingFilter === "high" && idea.overall_rating !== null && idea.overall_rating >= 8) ||
        (ratingFilter === "medium" && idea.overall_rating !== null && idea.overall_rating >= 5 && idea.overall_rating < 8) ||
        (ratingFilter === "low" && idea.overall_rating !== null && idea.overall_rating < 5) ||
        (ratingFilter === "unrated" && idea.overall_rating === null);

      // Genre filter
      const matchesGenre = genreFilter === "all" || idea.genre.includes(genreFilter);

      // Theme filter
      const matchesTheme = themeFilter === "all" || idea.theme === themeFilter;

      // Slot filter
      const matchesSlot = slotFilter === "all" ||
        (slotFilter === "unassigned" && !idea.slot) ||
        idea.slot === slotFilter;

      // Status filter
      const matchesStatus = statusFilter === "all" || idea.status === statusFilter;

      return matchesSearch && matchesRating && matchesGenre && matchesTheme && matchesSlot && matchesStatus;
    });

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case "title":
            comparison = a.working_title.localeCompare(b.working_title);
            break;
          case "rating":
            const ratingA = a.overall_rating ?? -1;
            const ratingB = b.overall_rating ?? -1;
            comparison = ratingA - ratingB;
            break;
          case "genre":
            comparison = a.genre[0].localeCompare(b.genre[0]);
            break;
          case "theme":
            const themeA = a.theme ?? "ZZZ"; // Put nulls at end
            const themeB = b.theme ?? "ZZZ";
            comparison = themeA.localeCompare(themeB);
            break;
          case "slot":
            const slotA = a.slot ?? "ZZZ"; // Put nulls at end
            const slotB = b.slot ?? "ZZZ";
            comparison = slotA.localeCompare(slotB);
            break;
          case "director":
            const directorA = a.director ?? "ZZZ";
            const directorB = b.director ?? "ZZZ";
            comparison = directorA.localeCompare(directorB);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          case "days":
            comparison = a.days_active - b.days_active;
            break;
          case "writer":
            comparison = a.writer_name.localeCompare(b.writer_name);
            break;
          case "episodes":
            const epsA = a.completion_percentage ?? -1;
            const epsB = b.completion_percentage ?? -1;
            comparison = epsA - epsB;
            break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [ideas, searchTerm, ratingFilter, genreFilter, themeFilter, slotFilter, statusFilter, sortField, sortDirection]);

  // Recursive function to create nested groups
  const createNestedGroups = (
    ideas: ActiveIdeaDetail[],
    levels: GroupByOption[],
    currentLevel: number = 0
  ): Record<string, NestedGroup> => {
    // Base case: no more levels or no ideas
    if (currentLevel >= levels.length || ideas.length === 0) {
      return { 'All': { items: ideas } };
    }

    const currentGroupBy = levels[currentLevel];
    const groups: Record<string, ActiveIdeaDetail[]> = {};

    // Group by current level
    ideas.forEach(idea => {
      const groupKey = getGroupValue(idea, currentGroupBy);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(idea);
    });

    // Sort groups
    const fallbacks = ['Unassigned', 'TBD', 'Unknown Writer', 'Unspecified', 'Uncategorized', 'Other'];
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (fallbacks.includes(a)) return 1;
      if (fallbacks.includes(b)) return -1;
      return a.localeCompare(b);
    });

    // Create nested structure
    const nestedGroups: Record<string, NestedGroup> = {};
    sortedKeys.forEach(key => {
      const groupIdeas = groups[key];

      if (currentLevel < levels.length - 1) {
        // Not the last level, recurse
        nestedGroups[key] = {
          items: groupIdeas,
          subGroups: createNestedGroups(groupIdeas, levels, currentLevel + 1)
        };
      } else {
        // Last level, just store items
        nestedGroups[key] = {
          items: groupIdeas
        };
      }
    });

    return nestedGroups;
  };

  // Group ideas based on selected grouping levels
  const groupedIdeas = useMemo(() => {
    if (groupByLevels.length === 0) {
      return { 'All Ideas': { items: filteredIdeas } };
    }

    return createNestedGroups(filteredIdeas, groupByLevels, 0);
  }, [filteredIdeas, groupByLevels]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredIdeas.length;
    const highPriority = filteredIdeas.filter(i => i.overall_rating !== null && i.overall_rating >= 8).length;
    const recentCount = filteredIdeas.filter(i => isRecent(i.created_at)).length;

    const avgRating = filteredIdeas.length > 0
      ? filteredIdeas.reduce((sum, i) => sum + (i.overall_rating ?? 0), 0) / filteredIdeas.filter(i => i.overall_rating !== null).length
      : 0;

    return { total, highPriority, recentCount, avgRating };
  }, [filteredIdeas]);

  // Format evaluator scores inline
  const formatEvaluatorScores = (idea: ActiveIdeaDetail) => {
    if (!idea.evaluator_scores || Object.keys(idea.evaluator_scores).length === 0) {
      return idea.overall_rating !== null ? idea.overall_rating.toString() : 'N/A';
    }

    const scores = idea.evaluator_scores;
    const parts: string[] = [];

    if (scores.nadeem !== null && scores.nadeem !== undefined) parts.push(`N:${scores.nadeem}`);
    if (scores.salman !== null && scores.salman !== undefined) parts.push(`S:${scores.salman}`);
    if (scores.imran !== null && scores.imran !== undefined) parts.push(`I:${scores.imran}`);

    const avgScore = idea.overall_rating !== null ? idea.overall_rating.toFixed(1) : 'N/A';

    if (parts.length > 0) {
      return `${avgScore} (${parts.join(', ')})`;
    }

    return avgScore;
  };

  // Render table row
  const renderIdeaRow = (idea: ActiveIdeaDetail) => {
    const ratingColors = getRatingColors(idea.overall_rating);
    const stageColors = getScriptStageColors(idea.status);
    const isHighRated = idea.overall_rating !== null && idea.overall_rating >= 8;
    const isNew = isRecent(idea.created_at);

    return (
      <TableRow
        key={idea.id}
        className="hover:bg-slate-50/50"
        style={{
          backgroundColor: stageColors.bg,
          borderLeft: `4px solid ${stageColors.border}`
        }}
      >
        <TableCell className="font-medium">
          <Link
            href={`/management/active-projects/${idea.id}`}
            className="text-blue-600 hover:underline"
          >
            {idea.working_title}
          </Link>
        </TableCell>
        <TableCell className="text-center">
          {idea.overall_rating !== null || (idea.evaluator_scores && Object.keys(idea.evaluator_scores).length > 0) ? (
            <div className="text-xs">
              <div
                className="inline-flex items-center justify-center px-2 py-1 rounded font-semibold mb-1"
                style={{
                  backgroundColor: ratingColors.bg,
                  color: ratingColors.text,
                  border: `1px solid ${ratingColors.border}`
                }}
              >
                {formatEvaluatorScores(idea)}
              </div>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">N/A</span>
          )}
        </TableCell>
        <TableCell>
          <div className="text-sm">{idea.writer_name}</div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-gray-600">{idea.director || <span className="text-gray-400">TBD</span>}</div>
        </TableCell>
        <TableCell>
          {idea.total_episodes !== null && idea.total_episodes > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-medium">
                {idea.received_episodes || 0}/{idea.total_episodes} ({idea.completion_percentage?.toFixed(0) || 0}%)
              </div>
              <Progress value={idea.completion_percentage || 0} className="h-1.5" />
            </div>
          ) : (
            <span className="text-gray-400 text-xs">N/A</span>
          )}
        </TableCell>
        <TableCell>
          <span className="text-sm text-slate-700">
            {idea.genre && idea.genre.length > 0 ? idea.genre.join(', ') : <span className="text-slate-400">N/A</span>}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm text-slate-700">
            {idea.theme || <span className="text-slate-400">N/A</span>}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm text-slate-700">
            {idea.slot || <span className="text-slate-400">TBD</span>}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-xs">
            {idea.content_type || <span className="text-gray-400">Unspecified</span>}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm text-slate-700">
            {getStatusLabel(idea.status)}
          </span>
        </TableCell>
        <TableCell className="text-center text-xs text-gray-600">
          {idea.days_active}
        </TableCell>
      </TableRow>
    );
  };

  // Recursive rendering function for nested groups
  const renderNestedGroups = (
    groups: Record<string, NestedGroup>,
    path: string[] = [],
    level: number = 0
  ): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];

    Object.entries(groups).forEach(([groupName, group]) => {
      const currentPath = [...path, groupName];
      const groupKey = buildGroupKey(currentPath);
      const isCollapsed = collapsedGroups.has(groupKey);
      const indent = level * 24; // 24px per level

      // Render group header
      if (groupByLevels.length > 0 && groupName !== 'All' && groupName !== 'All Ideas') {
        rows.push(
          <TableRow
            key={groupKey}
            className={`border-t-2 border-slate-300`}
            style={{
              backgroundColor: level === 0 ? '#f1f5f9' : level === 1 ? '#f8fafc' : '#ffffff'
            }}
          >
            <TableCell colSpan={10} className="font-bold py-3">
              <button
                onClick={() => toggleGroup(groupKey)}
                className="flex items-center gap-2 hover:text-blue-600 w-full"
                style={{ paddingLeft: `${indent}px` }}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="uppercase tracking-wide text-sm">
                  {groupName} ({group.items.length} projects)
                </span>
              </button>
            </TableCell>
          </TableRow>
        );
      }

      // If not collapsed, render sub-groups or items
      if (!isCollapsed) {
        if (group.subGroups && Object.keys(group.subGroups).length > 0) {
          // Has sub-groups, render them recursively
          rows.push(...renderNestedGroups(group.subGroups, currentPath, level + 1));
        } else {
          // Leaf level, render items
          group.items.forEach(idea => {
            rows.push(renderIdeaRow(idea));
          });
        }
      }
    });

    return rows;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              What's Cooking
            </CardTitle>
            <CardDescription className="mt-1">
              {stats.total} active ideas • {stats.highPriority} high priority
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <span className="text-green-700 font-medium text-sm">Avg Rating: {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}</span>
            </div>
            {stats.recentCount > 0 && (
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-blue-700 font-medium text-sm">{stats.recentCount} New</span>
              </div>
            )}
            <div className="flex gap-2 items-center flex-wrap">
              {groupByLevels.map((level, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <span className="text-xs font-medium">{getGroupLabel(level)}</span>
                  <button
                    onClick={() => removeGroupingLevel(index)}
                    className="hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {groupByLevels.length > 0 && (
                <span className="text-slate-400 text-sm">→</span>
              )}
              <Select
                value="none"
                onValueChange={(value) => addGroupingLevel(value as GroupByOption)}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="+ Add Grouping" />
                </SelectTrigger>
                <SelectContent>
                  {!groupByLevels.includes('slot') && <SelectItem value="slot">Slot</SelectItem>}
                  {!groupByLevels.includes('writer') && <SelectItem value="writer">Writer</SelectItem>}
                  {!groupByLevels.includes('director') && <SelectItem value="director">Director</SelectItem>}
                  {!groupByLevels.includes('genre') && <SelectItem value="genre">Genre</SelectItem>}
                  {!groupByLevels.includes('type') && <SelectItem value="type">Type</SelectItem>}
                  {!groupByLevels.includes('status') && <SelectItem value="status">Stage</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, writer, or director..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Rating Filter */}
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="high">High (8-10)</SelectItem>
              <SelectItem value="medium">Medium (5-7)</SelectItem>
              <SelectItem value="low">Low (1-4)</SelectItem>
              <SelectItem value="unrated">Unrated</SelectItem>
            </SelectContent>
          </Select>

          {/* Genre Filter */}
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

          {/* Theme Filter */}
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

          {/* Slot Filter */}
          <Select value={slotFilter} onValueChange={setSlotFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Slots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Slots</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {allSlots.map(slot => (
                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[20%] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("title")}>
                  Title {getSortIcon("title")}
                </TableHead>
                <TableHead className="w-[140px] text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort("rating")}>
                  Rating {getSortIcon("rating")}
                </TableHead>
                <TableHead className="w-[120px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("writer")}>
                  Writer {getSortIcon("writer")}
                </TableHead>
                <TableHead className="w-[120px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("director")}>
                  Director {getSortIcon("director")}
                </TableHead>
                <TableHead className="w-[140px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("episodes")}>
                  Episodes {getSortIcon("episodes")}
                </TableHead>
                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("genre")}>
                  Genre {getSortIcon("genre")}
                </TableHead>
                <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("theme")}>
                  Theme {getSortIcon("theme")}
                </TableHead>
                <TableHead className="w-[80px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("slot")}>
                  Slot {getSortIcon("slot")}
                </TableHead>
                <TableHead className="w-[100px]">
                  Type
                </TableHead>
                <TableHead className="w-[120px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("status")}>
                  Stage {getSortIcon("status")}
                </TableHead>
                <TableHead className="w-[60px] text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort("days")}>
                  Days {getSortIcon("days")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdeas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No ideas found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                <>{renderNestedGroups(groupedIdeas)}</>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-medium">{filteredIdeas.length}</span> of <span className="font-medium">{ideas.length}</span> ideas
        </div>
      </CardContent>
    </Card>
  );
}
