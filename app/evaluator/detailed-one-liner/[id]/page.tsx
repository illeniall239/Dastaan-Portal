import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDetailedOneLinerById } from "@/lib/detailed-one-liner/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = {
  title: "Detailed One-Liner | Dastaan Portal",
  description: "View detailed one-liner analysis",
};

export default async function DetailedOneLinerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["evaluator", "content_manager", "management", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch detailed one-liner
  const detailedOneLiner = await getDetailedOneLinerById(id);

  if (!detailedOneLiner) {
    return (
      <div className="mobile-container mobile-section">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground mb-4">
            Detailed One-Liner Not Found
          </h1>
          <BackButton fallbackHref="/evaluator/call-reports" />
        </div>
      </div>
    );
  }

  const callReport = detailedOneLiner.call_report as any;
  const narrativeItems = detailedOneLiner.narrative_breakdown_items || [];
  const eventPlanningItems = detailedOneLiner.event_planning_items || [];
  const weaknessRiskItems = detailedOneLiner.potential_weaknesses_risks_items || [];

  // Check if user can edit (owner or manager/admin)
  const canEdit =
    detailedOneLiner.created_by === user.id ||
    ["content_manager", "admin"].includes(userData.role);

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackHref="/evaluator/call-reports" variant="outline" />
          {canEdit && (
            <Button asChild variant="default" size="sm">
              <Link href={`/evaluator/detailed-one-liner/${id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Detailed One-Liner</h1>
          {callReport && (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>Call Report: {callReport.call_report_id}</span>
              <span>•</span>
              <span>{callReport.working_title}</span>
              <span>•</span>
              <span>Writer: {callReport.writer_name}</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Preamble */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preamble – Why This Drama May Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.preamble}</p>
            </CardContent>
          </Card>

          {/* PLOT */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">PLOT</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.plot}</p>
            </CardContent>
          </Card>

          {/* The Emotional Arena */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">The Emotional Arena</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.emotional_arena}</p>
            </CardContent>
          </Card>

          {/* Creed and Conflict */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Creed and Conflict</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.creed_conflict}</p>
            </CardContent>
          </Card>

          {/* New Element */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Element</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.new_element}</p>
            </CardContent>
          </Card>

          {/* Emotional Core and Resolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emotional Core and Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.emotional_core_resolution}</p>
            </CardContent>
          </Card>

          {/* Narrative Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Narrative Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {narrativeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No narrative breakdown items</p>
              ) : (
                <div className="space-y-4">
                  {narrativeItems.map((item: any, index: number) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Item {index + 1}</Badge>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Story Stream
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.story_stream}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Narrative Purpose
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.narrative_purpose}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Planning */}
          {eventPlanningItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventPlanningItems.map((item: any, index: number) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Item {index + 1}</Badge>
                        <Badge
                          variant={
                            item.budget_category === "High"
                              ? "destructive"
                              : item.budget_category === "Medium"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {item.budget_category} Budget
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Episode Range
                          </p>
                          <p className="text-sm">{item.episode_range}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Event Scale
                          </p>
                          <p className="text-sm">{item.event_scale}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Examples of On-Screen Activity
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.on_screen_activity}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Approximate Frequency
                          </p>
                          <p className="text-sm">{item.approx_frequency}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Optimization Notes */}
          {detailedOneLiner.production_optimization_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Production Optimization Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.production_optimization_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Net Outcome */}
          {detailedOneLiner.net_outcome && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Net Outcome</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.net_outcome}</p>
              </CardContent>
            </Card>
          )}

          {/* Potential Weaknesses/Risks */}
          {weaknessRiskItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Potential Weaknesses/ Risks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weaknessRiskItems.map((item: any, index: number) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center mb-2">
                        <Badge variant="outline">Item {index + 1}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Issue
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.issue}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Explanation / Risk Detail
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.explanation_risk_detail}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Impact
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.impact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conclusion/Recommendation */}
          {detailedOneLiner.conclusion_recommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conclusion/Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{detailedOneLiner.conclusion_recommendation}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {detailedOneLiner.created_by_user && (
                <div>
                  <span className="font-semibold">Created by:</span>{" "}
                  {(detailedOneLiner.created_by_user as any).name} ({(detailedOneLiner.created_by_user as any).email})
                </div>
              )}
              <div>
                <span className="font-semibold">Created at:</span>{" "}
                {new Date(detailedOneLiner.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">Last updated:</span>{" "}
                {new Date(detailedOneLiner.updated_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
