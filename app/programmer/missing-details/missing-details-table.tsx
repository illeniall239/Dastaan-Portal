"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

const CHECKED_FIELDS = [
  { key: "writer_name", label: "Writer", check: (idea: ActiveIdeaDetail) => !idea.writer_name },
  { key: "genre", label: "Genre", check: (idea: ActiveIdeaDetail) => !idea.genre || idea.genre.length === 0 || (idea.genre.length === 1 && idea.genre[0] === "Other") },
  { key: "theme", label: "Theme", check: (idea: ActiveIdeaDetail) => !idea.theme },
  { key: "slot", label: "Slot", check: (idea: ActiveIdeaDetail) => !idea.slot },
  { key: "content_type", label: "Content Type", check: (idea: ActiveIdeaDetail) => !idea.content_type },
  { key: "category", label: "Category", check: (idea: ActiveIdeaDetail) => !idea.category },
  { key: "director", label: "Director", check: (idea: ActiveIdeaDetail) => !idea.director },
  { key: "total_episodes", label: "Total Episodes", check: (idea: ActiveIdeaDetail) => !idea.total_episodes },
  { key: "logline", label: "Logline", check: (idea: ActiveIdeaDetail) => !idea.logline },
  { key: "idea_by", label: "Idea By", check: (idea: ActiveIdeaDetail) => !idea.idea_by },
  { key: "has_audience_focus", label: "Character Centric", check: (idea: ActiveIdeaDetail) => !idea.has_audience_focus },
  { key: "has_no_of_tracks", label: "No. of Tracks", check: (idea: ActiveIdeaDetail) => !idea.has_no_of_tracks },
  { key: "has_closing_remarks", label: "Closing Remarks", check: (idea: ActiveIdeaDetail) => !idea.has_closing_remarks },
] as const;

function getMissingFields(idea: ActiveIdeaDetail): string[] {
  return CHECKED_FIELDS.filter(f => f.check(idea)).map(f => f.label);
}

interface MissingDetailsTableProps {
  ideas: ActiveIdeaDetail[];
  teamMap: Record<string, string>;
}

export function MissingDetailsTable({ ideas, teamMap }: MissingDetailsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [minMissing, setMinMissing] = useState<string>("1");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Annotate each idea with missing fields
  const annotated = useMemo(() =>
    ideas.map(idea => ({
      ...idea,
      missingFields: getMissingFields(idea),
      teamName: (idea as any).team_id ? (teamMap[(idea as any).team_id] || "Unknown Team") : "Unassigned",
    })),
    [ideas, teamMap]
  );

  // Filter
  const filtered = useMemo(() => {
    const min = parseInt(minMissing) || 0;
    return annotated.filter(idea => {
      if (idea.missingFields.length < min) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (idea.working_title ?? "").toLowerCase().includes(q)
          || (idea.writer_name ?? "").toLowerCase().includes(q)
          || idea.teamName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [annotated, searchTerm, minMissing]);

  // Group by team
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const idea of filtered) {
      const list = map.get(idea.teamName) || [];
      list.push(idea);
      map.set(idea.teamName, list);
    }
    // Sort teams by count of missing (descending)
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const totalWithMissing = annotated.filter(i => i.missingFields.length > 0).length;

  const toggleTeam = (team: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  };

  const expandAll = () => setExpandedTeams(new Set(grouped.map(([t]) => t)));
  const collapseAll = () => setExpandedTeams(new Set());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          Missing Project Details
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalWithMissing} of {annotated.length} projects have missing details
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, writer, or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={minMissing} onValueChange={setMinMissing}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Min missing fields" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1+ missing fields</SelectItem>
                <SelectItem value="2">2+ missing fields</SelectItem>
                <SelectItem value="3">3+ missing fields</SelectItem>
                <SelectItem value="5">5+ missing fields</SelectItem>
                <SelectItem value="0">Show all projects</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Expand All</button>
              <button onClick={collapseAll} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Collapse All</button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} projects across {grouped.length} teams
      </div>

      {/* Team groups */}
      {grouped.map(([teamName, teamIdeas]) => {
        const isExpanded = expandedTeams.has(teamName);
        const teamMissingTotal = teamIdeas.reduce((sum, i) => sum + i.missingFields.length, 0);

        return (
          <Card key={teamName}>
            <CardHeader
              className="cursor-pointer hover:bg-slate-50 transition-colors py-3 px-4"
              onClick={() => toggleTeam(teamName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base font-semibold">{teamName}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {teamIdeas.length} project{teamIdeas.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <Badge variant="destructive" className="text-xs">
                  {teamMissingTotal} missing field{teamMissingTotal !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="px-4 pb-4 pt-0">
                <div className="divide-y">
                  {teamIdeas.map(idea => (
                    <div key={idea.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{idea.working_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {idea.writer_name || "No writer"} &middot; {idea.call_report_id}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {idea.missingFields.length > 0 ? (
                            idea.missingFields.map(field => (
                              <Badge key={field} variant="outline" className="text-[10px] border-red-300 text-red-600 bg-red-50">
                                {field}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-green-300 text-green-600 bg-green-50">
                              Complete
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {grouped.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No projects match the current filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
