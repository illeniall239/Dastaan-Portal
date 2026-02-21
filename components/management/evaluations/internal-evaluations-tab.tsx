"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Film } from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";
import { SegregatedEvaluationsDisplay } from "@/components/evaluations/segregated-evaluations-display";
import { SegregatedEpisodicEvaluationsDisplay } from "@/components/evaluations/segregated-episodic-evaluations-display";
import type { SegregatedEvaluations, SegregatedEpisodicEvaluations } from "@/types";

interface CallReportWithEvaluations {
  id: string;
  callReportId: string;
  workingTitle: string;
  writerName: string;
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
  evaluationCount: number;
  segregatedEvaluations: SegregatedEvaluations;
}

interface EpisodeWithEvaluations {
  id: string;
  episodeNumber: number;
  title: string;
  callReportId: string;
  dramaTitle: string;
  createdAt: string;
  updatedAt: string;
  evaluationCount: number;
  segregatedEvaluations: SegregatedEpisodicEvaluations;
}

interface InternalEvaluationsTabProps {
  currentUser: any;
}

export function InternalEvaluationsTab({ currentUser }: InternalEvaluationsTabProps) {
  const [callReports, setCallReports] = useState<CallReportWithEvaluations[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeWithEvaluations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch call reports and episodes in parallel
        const [callReportsRes, episodesRes] = await Promise.all([
          fetch("/api/management/call-reports-with-evaluations"),
          fetch("/api/management/episodes-with-evaluations"),
        ]);

        if (!callReportsRes.ok) {
          throw new Error("Failed to fetch call reports");
        }

        if (!episodesRes.ok) {
          throw new Error("Failed to fetch episodes");
        }

        const callReportsData = await callReportsRes.json();
        const episodesData = await episodesRes.json();

        setCallReports(callReportsData.callReports || []);
        setEpisodes(episodesData.episodes || []);
      } catch (err: any) {
        console.error("Error fetching evaluations:", err);
        setError(err.message || "Failed to load evaluations");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Error loading evaluations</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="call-reports" className="w-full">
        <TabsList>
          <TabsTrigger value="call-reports">
            <FileText className="h-4 w-4 mr-2" />
            One Liner Evaluations ({callReports.length})
          </TabsTrigger>
          <TabsTrigger value="episodic">
            <Film className="h-4 w-4 mr-2" />
            Episodic Evaluations ({episodes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="call-reports" className="mt-6">
          {callReports.length > 0 ? (
            <div className="space-y-6">
              {callReports.map((callReport) => (
                <Card key={callReport.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {callReport.workingTitle}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-x-3 gap-y-1">
                          <span className="flex items-center">
                            <strong className="mr-1">Writer:</strong> {callReport.writerName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <strong className="mr-1">Date:</strong>{" "}
                            {formatDate(callReport.meetingDate)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <strong className="mr-1">ID:</strong> {callReport.callReportId}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {callReport.evaluationCount}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Evaluation{callReport.evaluationCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {callReport.segregatedEvaluations.total > 0 ? (
                      <SegregatedEvaluationsDisplay
                        evaluations={callReport.segregatedEvaluations}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                        <p>No evaluations available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No One-Liner Evaluations Found</p>
                  <p className="text-sm">
                    Evaluations will appear here once one-liners have been evaluated
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="episodic" className="mt-6">
          {episodes.length > 0 ? (
            <div className="space-y-6">
              {episodes.map((episode) => (
                <Card key={episode.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          Episode {episode.episodeNumber}: {episode.title}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-x-3 gap-y-1">
                          <span className="flex items-center">
                            <strong className="mr-1">Drama:</strong> {episode.dramaTitle}
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <strong className="mr-1">Created:</strong>{" "}
                            {formatDate(episode.createdAt)}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-purple-600">
                          {episode.evaluationCount}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Evaluation{episode.evaluationCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {episode.segregatedEvaluations.total > 0 ? (
                      <SegregatedEpisodicEvaluationsDisplay
                        evaluations={episode.segregatedEvaluations}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Film className="mx-auto h-12 w-12 mb-3 opacity-50" />
                        <p>No evaluations available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Film className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Episode Evaluations Found</p>
                  <p className="text-sm">
                    Evaluations will appear here once episodes have been evaluated
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
