"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowUpDown } from "lucide-react";

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

interface ProcessedStory extends Story {
  spread: number;
  submittedEvals: { name: string; score: number; team: Team }[];
}

const TEAM_DOT: Record<Team, string> = {
  content: "bg-blue-400",
  programming: "bg-purple-400",
  management: "bg-amber-400",
};

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function spreadColor(spread: number): string {
  if (spread >= 3) return "bg-red-100 text-red-700 border-red-200";
  if (spread >= 2) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function spreadLabel(spread: number): string {
  if (spread >= 3) return "High";
  if (spread >= 2) return "Moderate";
  return "Low";
}

export function BiasPageClient() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spread" | "title">("spread");

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

  // Process: stories with 1+ submitted scores, compute spread
  const processed: ProcessedStory[] = stories
    .map((s) => {
      const submittedEvals = s.evaluations
        .filter((e) => e.submitted && e.averageScore != null)
        .map((e) => ({ name: e.evaluatorName, score: e.averageScore!, team: e.team }));
      if (submittedEvals.length === 0) return null;
      const scores = submittedEvals.map((e) => e.score);
      const spread = scores.length >= 2
        ? Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10
        : -1; // single evaluator, no spread
      return { ...s, spread, submittedEvals };
    })
    .filter(Boolean) as ProcessedStory[];

  // Filter + sort
  const filtered = processed
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.workingTitle.toLowerCase().includes(q) || s.writerName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "spread") {
        // Single-eval (spread=-1) goes to bottom
        if (a.spread < 0 && b.spread >= 0) return 1;
        if (b.spread < 0 && a.spread >= 0) return -1;
        return b.spread - a.spread;
      }
      return a.workingTitle.localeCompare(b.workingTitle);
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or writer..."
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded-full ${TEAM_DOT.content}`} /> Content</span>
              <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded-full ${TEAM_DOT.programming}`} /> Programming</span>
              <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded-full ${TEAM_DOT.management}`} /> Management</span>
            </div>
            <button
              onClick={() => setSortBy((p) => (p === "spread" ? "title" : "spread"))}
              className="flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted transition-colors"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === "spread" ? "Biggest Gap" : "A–Z"}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            {search ? "No stories match your search." : "No evaluated stories found."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 w-[30%]">Project</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Evaluator Scores</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500 w-20">Avg</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500 w-24">Spread</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((story) => (
                  <tr key={story.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-gray-800 leading-snug">{story.workingTitle}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {story.writerName}
                        {story.genre && ` · ${story.genre}`}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {story.submittedEvals
                          .sort((a, b) => b.score - a.score)
                          .map((ev, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${scoreColor(ev.score)}`}
                              title={`${ev.name} (${ev.team})`}
                            >
                              <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${TEAM_DOT[ev.team]}`} />
                              {ev.name.split(" ")[0]}: {ev.score.toFixed(1)}
                            </Badge>
                          ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {story.overallAvg != null && (
                        <span className="font-semibold text-gray-700">{story.overallAvg.toFixed(1)}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {story.spread >= 0 ? (
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${spreadColor(story.spread)}`}>
                          {story.spread.toFixed(1)} · {spreadLabel(story.spread)}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-gray-400">1 eval</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-muted-foreground mt-3">
              {filtered.length} evaluated projects · sorted by {sortBy === "spread" ? "biggest gap first" : "title A–Z"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
