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
  getStatusLabel,
  isRecent,
} from "@/lib/management/color-palettes";
import { Badge } from "@/components/ui/badge";

interface WhatsCookingDashboardProps {
  ideas: ActiveIdeaDetail[];
}

type SortField = "title" | "rating" | "genre" | "slot" | "director" | "status" | "writer" | "episodes" | "index";
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

      // Rating filter - prefer average_initial_assessment, fallback to overall_rating
      const effectiveRating = idea.average_initial_assessment ?? idea.overall_rating;
      const matchesRating = ratingFilter === "all" ||
        (ratingFilter === "high" && effectiveRating !== null && effectiveRating >= 8) ||
        (ratingFilter === "medium" && effectiveRating !== null && effectiveRating >= 5 && effectiveRating < 8) ||
        (ratingFilter === "low" && effectiveRating !== null && effectiveRating < 5) ||
        (ratingFilter === "unrated" && effectiveRating === null);

      // Genre filter
      const matchesGenre = genreFilter === "all" || idea.genre.includes(genreFilter);

      // Slot filter
      const matchesSlot = slotFilter === "all" ||
        (slotFilter === "unassigned" && !idea.slot) ||
        idea.slot === slotFilter;

      // Status filter
      const matchesStatus = statusFilter === "all" || idea.status === statusFilter;

      return matchesSearch && matchesRating && matchesGenre && matchesSlot && matchesStatus;
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
            const ratingA = (a.average_initial_assessment ?? a.overall_rating) ?? -1;
            const ratingB = (b.average_initial_assessment ?? b.overall_rating) ?? -1;
            comparison = ratingA - ratingB;
            break;
          case "genre":
            comparison = a.genre[0].localeCompare(b.genre[0]);
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
          case "writer":
            comparison = a.writer_name.localeCompare(b.writer_name);
            break;
          case "episodes":
            const epsA = a.completion_percentage ?? -1;
            const epsB = b.completion_percentage ?? -1;
            comparison = epsA - epsB;
            break;
          case "index":
            // Sort by created_at to maintain insertion order
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            comparison = dateA - dateB;
            break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [ideas, searchTerm, ratingFilter, genreFilter, slotFilter, statusFilter, sortField, sortDirection]);

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
    const highPriority = filteredIdeas.filter(i => {
      const r = i.average_initial_assessment ?? i.overall_rating;
      return r !== null && r >= 8;
    }).length;
    const recentCount = filteredIdeas.filter(i => isRecent(i.created_at)).length;

    const ratedIdeas = filteredIdeas.filter(i => (i.average_initial_assessment ?? i.overall_rating) !== null);
    const avgRating = ratedIdeas.length > 0
      ? ratedIdeas.reduce((sum, i) => sum + ((i.average_initial_assessment ?? i.overall_rating) ?? 0), 0) / ratedIdeas.length
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

    const effectiveRating = idea.average_initial_assessment ?? idea.overall_rating;
    const avgScore = effectiveRating !== null ? effectiveRating.toFixed(1) : 'N/A';

    if (parts.length > 0) {
      return `${avgScore} (${parts.join(', ')})`;
    }

    return avgScore;
  };

  // Get rating badge styling
  const getRatingBadge = (rating: number | null) => {
    if (rating === null) return { bg: "bg-gray-100", text: "text-gray-500", label: "N/A" };
    if (rating >= 8) return { bg: "bg-green-50", text: "text-green-700", label: rating.toFixed(1) };
    if (rating >= 5) return { bg: "bg-amber-50", text: "text-amber-700", label: rating.toFixed(1) };
    return { bg: "bg-red-50", text: "text-red-700", label: rating.toFixed(1) };
  };

  // Render table row
  const renderIdeaRow = (idea: ActiveIdeaDetail, index: number, totalCount: number) => {
    const effectiveRating = idea.average_initial_assessment ?? idea.overall_rating;
    const ratingStyle = getRatingBadge(effectiveRating);
    const isNew = isRecent(idea.created_at);

    return (
      <TableRow
        key={idea.id}
        className="hover:bg-gray-50 border-b border-gray-100"
      >
        <TableCell className="text-center text-sm text-gray-500 font-medium">
          {sortField === "index" && sortDirection === "desc"
            ? totalCount - index
            : index + 1}
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Link
              href={`/management/active-projects/${idea.id}`}
              className="text-gray-900 hover:text-[#224794] hover:underline"
            >
              {idea.working_title}
            </Link>
            {isNew && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                NEW
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${ratingStyle.bg} ${ratingStyle.text}`}>
            {ratingStyle.label}
          </span>
        </TableCell>
        <TableCell>
          <div className="text-sm text-gray-700">{idea.writer_names?.join(', ') || idea.writer_name || <span className="text-gray-400">—</span>}</div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-gray-600">{idea.director || <span className="text-gray-400">TBD</span>}</div>
        </TableCell>
        <TableCell>
          {idea.total_episodes !== null && idea.total_episodes > 0 ? (
            <div className="space-y-1">
              <div className="text-xs text-gray-600">
                {idea.received_episodes || 0}/{idea.total_episodes}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-[#224794] h-1.5 rounded-full transition-all"
                  style={{ width: `${idea.completion_percentage || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </TableCell>
        <TableCell>
          <span className="text-sm text-gray-700">
            {idea.genre && idea.genre.length > 0 ? idea.genre.join(', ') : <span className="text-gray-400">—</span>}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm text-gray-700">
            {idea.slot || <span className="text-gray-400">—</span>}
          </span>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs font-normal border-gray-200 text-gray-600">
            {getStatusLabel(idea.status)}
          </Badge>
        </TableCell>
      </TableRow>
    );
  };

  // Calculate total count for serial number display
  const totalIdeasCount = useMemo(() => {
    const countItems = (groups: Record<string, NestedGroup>): number => {
      let count = 0;
      Object.values(groups).forEach(group => {
        if (group.items && group.items.length > 0) {
          count += group.items.length;
        }
        if (group.subGroups) {
          count += countItems(group.subGroups);
        }
      });
      return count;
    };
    return countItems(groupedIdeas);
  }, [groupedIdeas]);

  // Track row index for serial numbers
  let rowIndex = 0;

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
      const indent = level * 20; // 20px per level

      // Render group header
      if (groupByLevels.length > 0 && groupName !== 'All' && groupName !== 'All Ideas') {
        rows.push(
          <TableRow
            key={groupKey}
            className="border-t border-gray-200 bg-gray-50"
          >
            <TableCell colSpan={9} className="py-2">
              <button
                onClick={() => toggleGroup(groupKey)}
                className="flex items-center gap-2 text-gray-700 hover:text-[#224794] w-full"
                style={{ paddingLeft: `${indent}px` }}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="font-medium text-sm">
                  {groupName}
                </span>
                <span className="text-xs text-gray-500">
                  ({group.items.length})
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
            rows.push(renderIdeaRow(idea, rowIndex, totalIdeasCount));
            rowIndex++;
          });
        }
      }
    });

    return rows;
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Grouping Controls */}
          <div className="flex gap-2 items-center flex-wrap">
            {groupByLevels.map((level, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 border-0"
              >
                <span className="text-xs font-medium">{getGroupLabel(level)}</span>
                <button
                  onClick={() => removeGroupingLevel(index)}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Select
              value="none"
              onValueChange={(value) => addGroupingLevel(value as GroupByOption)}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs border-gray-200">
                <SelectValue placeholder="Group by..." />
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

        {/* Filters - Clean minimal design */}
        <div className="mt-4 flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 border-gray-200 focus:border-[#224794] focus:ring-[#224794]"
            />
          </div>

          {/* Rating Filter */}
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-[120px] border-gray-200">
              <SelectValue placeholder="Rating" />
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
            <SelectTrigger className="w-[120px] border-gray-200">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {allGenres.map(genre => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Slot Filter */}
          <Select value={slotFilter} onValueChange={setSlotFilter}>
            <SelectTrigger className="w-[120px] border-gray-200">
              <SelectValue placeholder="Slot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Slots</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {allSlots.map(slot => (
                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] border-gray-200">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="w-[60px] text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("index")}>
                  # {getSortIcon("index")}
                </TableHead>
                <TableHead className="w-[25%] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("title")}>
                  Title {getSortIcon("title")}
                </TableHead>
                <TableHead className="w-[80px] text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("rating")}>
                  Rating {getSortIcon("rating")}
                </TableHead>
                <TableHead className="w-[18%] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("writer")}>
                  Writer {getSortIcon("writer")}
                </TableHead>
                <TableHead className="w-[15%] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("director")}>
                  Director {getSortIcon("director")}
                </TableHead>
                <TableHead className="w-[120px] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("episodes")}>
                  Progress {getSortIcon("episodes")}
                </TableHead>
                <TableHead className="w-[12%] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("genre")}>
                  Genre {getSortIcon("genre")}
                </TableHead>
                <TableHead className="w-[100px] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("slot")}>
                  Slot {getSortIcon("slot")}
                </TableHead>
                <TableHead className="w-[120px] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort("status")}>
                  Stage {getSortIcon("status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdeas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                    No projects found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                <>{renderNestedGroups(groupedIdeas)}</>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {filteredIdeas.length} of {ideas.length} projects
          </span>
          {stats.recentCount > 0 && (
            <span className="text-blue-600">{stats.recentCount} added recently</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
