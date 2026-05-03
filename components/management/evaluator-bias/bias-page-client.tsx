"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, BarChart3, Loader2, Search } from "lucide-react";

type Team = "content" | "programming" | "management";

interface EvalEntry {
  evaluatorId: string;
  evaluatorName: string;
  team: Team;
  averageScore: number | null;
  submitted: boolean;
}

interface Story {
  id: string;
  workingTitle: string;
  writerName: string;
  contentType: string | null;
  genre: string | null;
  targetSlot: string | null;
  evaluations: EvalEntry[];
  overallAvg: number | null;
  contentAvg: number | null;
  programmingAvg: number | null;
  managementAvg: number | null;
  totalAssigned: number;
  ratedCount: number;
}

const TEAM_BADGE: Record<Team, string> = {
  content:     "bg-blue-100 text-blue-700 border-blue-200",
  programming: "bg-purple-100 text-purple-700 border-purple-200",
  management:  "bg-amber-100 text-amber-700 border-amber-200",
};

const TEAM_LABEL: Record<Team, string> = {
  content:     "Content",
  programming: "Programming",
  management:  "Management",
};

function scoreColor(score: number | null): string {
  if (!score) return "text-slate-500";
  if (score >= 7) return "text-green-600 font-semibold";
  if (score >= 5) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

export function BiasPageClient() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "rated" | "unrated">("all");
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/management/story-evaluations?_t=${Date.now()}`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        setStories((await res.json()).stories || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = stories.filter(s => {
    if (filter === "rated"   && s.ratedCount === 0)  return false;
    if (filter === "unrated" && s.ratedCount > 0)    return false;
    if (search) {
      const q = search.toLowerCase();
      return s.workingTitle.toLowerCase().includes(q) || s.writerName.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleStory = (id: string) =>
    setExpandedStory(prev => (prev === id ? null : id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Evaluations by Story</CardTitle>
            <CardDescription>Per-story evaluator scores across content, programming, and management teams</CardDescription>
          </div>
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-3 items-center pt-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or writer..."
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-md border overflow-hidden text-xs">
            {(["all", "rated", "unrated"] as const).map(f => (
              <button
                key={f}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {search || filter !== "all" ? "No stories match your filters." : "No stories found."}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map(story => {
              const isExpanded = expandedStory === story.id;
              const byTeam = (t: Team) => story.evaluations.filter(e => e.team === t);

              return (
                <div key={story.id} className="border rounded-lg">
                  {/* Story row */}
                  <div
                    onClick={() => toggleStory(story.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded
                        ? <ChevronDown  className="h-5 w-5 text-slate-400 shrink-0" />
                        : <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 leading-snug">{story.workingTitle}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {story.writerName}
                          {story.contentType && ` · ${story.contentType}`}
                          {story.genre      && ` · ${story.genre}`}
                          {story.targetSlot && ` · ${story.targetSlot}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {story.overallAvg !== null && (
                        <span className={`text-sm ${scoreColor(story.overallAvg)}`}>
                          {story.overallAvg.toFixed(1)}/10
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          story.ratedCount > 0
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {story.ratedCount}/{story.totalAssigned} rated
                      </Badge>
                      {story.contentAvg !== null && (
                        <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${TEAM_BADGE.content}`}>
                          Content {story.contentAvg.toFixed(1)}
                        </Badge>
                      )}
                      {story.programmingAvg !== null && (
                        <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${TEAM_BADGE.programming}`}>
                          Prog {story.programmingAvg.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Expanded evaluator list */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t bg-slate-50/50">
                      {(["content", "programming", "management"] as Team[]).map(team => {
                        const evals = byTeam(team);
                        if (evals.length === 0) return null;
                        const ratedCount = evals.filter(e => e.submitted).length;

                        return (
                          <div key={team}>
                            {/* Team sub-header */}
                            <div className="flex items-center gap-2 pt-3 pb-1.5">
                              <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${TEAM_BADGE[team]}`}>
                                {TEAM_LABEL[team]} Team
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {ratedCount}/{evals.length} rated
                              </span>
                            </div>

                            {/* Evaluator rows */}
                            <div className="space-y-1.5">
                              {evals.map(e => (
                                <div
                                  key={e.evaluatorId}
                                  className="w-full p-3 bg-white border rounded-lg flex items-center justify-between"
                                >
                                  <span className={`text-sm ${e.submitted ? "text-slate-800" : "text-slate-400"}`}>
                                    {e.evaluatorName}
                                  </span>
                                  {e.submitted && e.averageScore !== null ? (
                                    <span className={`text-sm ${scoreColor(e.averageScore)}`}>
                                      {e.averageScore.toFixed(1)}/10
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">not rated</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            {filtered.length} of {stories.length} stories
          </p>
        )}
      </CardContent>
    </Card>
  );
}
