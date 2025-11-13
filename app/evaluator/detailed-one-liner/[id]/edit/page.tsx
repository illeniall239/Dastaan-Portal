"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { getDetailedOneLinerClient, updateDetailedOneLinerClient } from "@/lib/detailed-one-liner/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import type { NarrativeBreakdownItemFormData, EventPlanningItemFormData } from "@/lib/validations/detailed-one-liner";

interface NarrativeRow {
  id: string;
  story_stream: string;
  percentage: number;
  narrative_purpose: string;
}

interface EventPlanningRow {
  id: string;
  episode_range: string;
  event_scale: string;
  on_screen_activity: string;
  approx_frequency: string;
  budget_category: 'High' | 'Medium' | 'Low' | '';
}

interface PotentialWeaknessRiskRow {
  id: string;
  issue: string;
  explanation_risk_detail: string;
  impact: string;
}

interface EditDetailedOneLinerPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDetailedOneLinerPage({ params }: EditDetailedOneLinerPageProps) {
  const router = useRouter();
  const [detailedOneLinerId, setDetailedOneLinerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [callReportId, setCallReportId] = useState("");
  const [preamble, setPreamble] = useState("");
  const [plot, setPlot] = useState("");
  const [emotionalArena, setEmotionalArena] = useState("");
  const [creedConflict, setCreedConflict] = useState("");
  const [newElement, setNewElement] = useState("");
  const [emotionalCoreResolution, setEmotionalCoreResolution] = useState("");
  const [narrativeRows, setNarrativeRows] = useState<NarrativeRow[]>([
    { id: crypto.randomUUID(), story_stream: "", percentage: 0, narrative_purpose: "" }
  ]);
  const [eventPlanningRows, setEventPlanningRows] = useState<EventPlanningRow[]>([
    { id: crypto.randomUUID(), episode_range: "", event_scale: "", on_screen_activity: "", approx_frequency: "", budget_category: "" }
  ]);
  const [productionOptimizationNotes, setProductionOptimizationNotes] = useState("");
  const [netOutcome, setNetOutcome] = useState("");
  const [weaknessRiskRows, setWeaknessRiskRows] = useState<PotentialWeaknessRiskRow[]>([
    { id: crypto.randomUUID(), issue: "", explanation_risk_detail: "", impact: "" }
  ]);
  const [conclusionRecommendation, setConclusionRecommendation] = useState("");

  // Fetch existing detailed one-liner data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedParams = await params;
        setDetailedOneLinerId(resolvedParams.id);

        setLoadingData(true);
        const data = await getDetailedOneLinerClient(resolvedParams.id);

        // Populate all form fields with existing data
        setCallReportId(data.call_report_id || "");
        setPreamble(data.preamble || "");
        setPlot(data.plot || "");
        setEmotionalArena(data.emotional_arena || "");
        setCreedConflict(data.creed_conflict || "");
        setNewElement(data.new_element || "");
        setEmotionalCoreResolution(data.emotional_core_resolution || "");
        setProductionOptimizationNotes(data.production_optimization_notes || "");
        setNetOutcome(data.net_outcome || "");
        setConclusionRecommendation(data.conclusion_recommendation || "");

        // Populate narrative breakdown items
        if (data.narrative_breakdown_items && data.narrative_breakdown_items.length > 0) {
          setNarrativeRows(data.narrative_breakdown_items.map((item: any) => ({
            id: crypto.randomUUID(),
            story_stream: item.story_stream || "",
            percentage: item.percentage || 0,
            narrative_purpose: item.narrative_purpose || "",
          })));
        }

        // Populate event planning items
        if (data.event_planning_items && data.event_planning_items.length > 0) {
          setEventPlanningRows(data.event_planning_items.map((item: any) => ({
            id: crypto.randomUUID(),
            episode_range: item.episode_range || "",
            event_scale: item.event_scale || "",
            on_screen_activity: item.on_screen_activity || "",
            approx_frequency: item.approx_frequency || "",
            budget_category: item.budget_category || "",
          })));
        }

        // Populate potential weaknesses/risks items
        if (data.potential_weaknesses_risks_items && data.potential_weaknesses_risks_items.length > 0) {
          setWeaknessRiskRows(data.potential_weaknesses_risks_items.map((item: any) => ({
            id: crypto.randomUUID(),
            issue: item.issue || "",
            explanation_risk_detail: item.explanation_risk_detail || "",
            impact: item.impact || "",
          })));
        }

        setLoadingData(false);
      } catch (error) {
        console.error("Error loading detailed one-liner:", error);
        toast.error("Failed to load detailed one-liner");
        router.push("/evaluator/call-reports");
      }
    };

    loadData();
  }, [params, router]);

  const addNarrativeRow = () => {
    setNarrativeRows([
      ...narrativeRows,
      { id: crypto.randomUUID(), story_stream: "", percentage: 0, narrative_purpose: "" }
    ]);
  };

  const removeNarrativeRow = (id: string) => {
    if (narrativeRows.length > 1) {
      setNarrativeRows(narrativeRows.filter(row => row.id !== id));
    }
  };

  const updateNarrativeRow = (id: string, field: keyof NarrativeRow, value: string | number) => {
    setNarrativeRows(narrativeRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addEventPlanningRow = () => {
    setEventPlanningRows([
      ...eventPlanningRows,
      { id: crypto.randomUUID(), episode_range: "", event_scale: "", on_screen_activity: "", approx_frequency: "", budget_category: "" }
    ]);
  };

  const removeEventPlanningRow = (id: string) => {
    if (eventPlanningRows.length > 1) {
      setEventPlanningRows(eventPlanningRows.filter(row => row.id !== id));
    }
  };

  const updateEventPlanningRow = (id: string, field: keyof EventPlanningRow, value: string) => {
    setEventPlanningRows(eventPlanningRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addWeaknessRiskRow = () => {
    setWeaknessRiskRows([
      ...weaknessRiskRows,
      { id: crypto.randomUUID(), issue: "", explanation_risk_detail: "", impact: "" }
    ]);
  };

  const removeWeaknessRiskRow = (id: string) => {
    if (weaknessRiskRows.length > 1) {
      setWeaknessRiskRows(weaknessRiskRows.filter(row => row.id !== id));
    }
  };

  const updateWeaknessRiskRow = (id: string, field: keyof PotentialWeaknessRiskRow, value: string) => {
    setWeaknessRiskRows(weaknessRiskRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!preamble.trim()) {
        toast.error("Please fill in the Preamble section");
        return;
      }

      if (!plot.trim()) {
        toast.error("Please fill in the PLOT section");
        return;
      }

      if (!emotionalArena.trim()) {
        toast.error("Please fill in The Emotional Arena section");
        return;
      }

      if (!creedConflict.trim()) {
        toast.error("Please fill in the Creed and Conflict section");
        return;
      }

      if (!newElement.trim()) {
        toast.error("Please fill in the New Element section");
        return;
      }

      if (!emotionalCoreResolution.trim()) {
        toast.error("Please fill in the Emotional Core and Resolution section");
        return;
      }

      // Validate narrative breakdown
      const validRows = narrativeRows.filter(row =>
        row.story_stream.trim() && row.narrative_purpose.trim()
      );

      if (validRows.length === 0) {
        toast.error("Please add at least one narrative breakdown item");
        return;
      }

      // Check percentages
      for (const row of validRows) {
        if (row.percentage < 0 || row.percentage > 100) {
          toast.error("Percentage must be between 0 and 100");
          return;
        }
      }

      // Validate event planning items (optional)
      const validEventRows = eventPlanningRows.filter(row =>
        row.episode_range.trim() && row.event_scale.trim() &&
        row.on_screen_activity.trim() && row.approx_frequency.trim() &&
        row.budget_category
      );

      // Validate potential weaknesses/risks items (optional)
      const validWeaknessRows = weaknessRiskRows.filter(row =>
        row.issue.trim() && row.explanation_risk_detail.trim() && row.impact.trim()
      );

      if (!detailedOneLinerId) {
        toast.error("Detailed one-liner ID not found");
        return;
      }

      const formData = {
        preamble: preamble.trim(),
        plot: plot.trim(),
        emotional_arena: emotionalArena.trim(),
        creed_conflict: creedConflict.trim(),
        new_element: newElement.trim(),
        emotional_core_resolution: emotionalCoreResolution.trim(),
        narrative_breakdown_items: validRows.map((row, index) => ({
          story_stream: row.story_stream.trim(),
          percentage: row.percentage,
          narrative_purpose: row.narrative_purpose.trim(),
          sort_order: index,
        })),
        event_planning_items: validEventRows.length > 0 ? validEventRows.map((row, index) => ({
          episode_range: row.episode_range.trim(),
          event_scale: row.event_scale.trim(),
          on_screen_activity: row.on_screen_activity.trim(),
          approx_frequency: row.approx_frequency.trim(),
          budget_category: row.budget_category as 'High' | 'Medium' | 'Low',
          sort_order: index,
        })) : undefined,
        production_optimization_notes: productionOptimizationNotes.trim() || undefined,
        net_outcome: netOutcome.trim() || undefined,
        potential_weaknesses_risks_items: validWeaknessRows.length > 0 ? validWeaknessRows.map((row, index) => ({
          issue: row.issue.trim(),
          explanation_risk_detail: row.explanation_risk_detail.trim(),
          impact: row.impact.trim(),
          sort_order: index,
        })) : undefined,
        conclusion_recommendation: conclusionRecommendation.trim() || undefined,
      };

      const result = await updateDetailedOneLinerClient(detailedOneLinerId, formData);

      toast.success("Detailed One-Liner updated successfully!");

      // Redirect to view page
      router.push(`/evaluator/detailed-one-liner/${detailedOneLinerId}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating detailed one-liner:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update detailed one-liner");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="mobile-container mobile-section">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackHref="/evaluator/call-reports" variant="outline" size="sm" />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Edit Detailed One-Liner</h1>
          <p className="text-muted-foreground">
            Update the comprehensive one-liner analysis with narrative breakdown.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Preamble */}
          <Card>
            <CardHeader>
              <CardTitle>Preamble – Why This Drama May Work *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="preamble"
                placeholder="Explain why this drama may work..."
                rows={4}
                value={preamble}
                onChange={(e) => setPreamble(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          {/* PLOT */}
          <Card>
            <CardHeader>
              <CardTitle>PLOT *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="plot"
                placeholder="Describe the plot..."
                rows={4}
                value={plot}
                onChange={(e) => setPlot(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          {/* The Emotional Arena */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">The Emotional Arena *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="emotionalArena"
                placeholder="Describe the emotional arena..."
                rows={4}
                value={emotionalArena}
                onChange={(e) => setEmotionalArena(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          {/* Creed and Conflict */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Creed and Conflict *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="creedConflict"
                placeholder="Describe the creed and conflict..."
                rows={4}
                value={creedConflict}
                onChange={(e) => setCreedConflict(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          {/* New Element */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">New Element *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="newElement"
                placeholder="Describe the new element..."
                rows={4}
                value={newElement}
                onChange={(e) => setNewElement(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          {/* Emotional Core and Resolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Emotional Core and Resolution *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="emotionalCoreResolution"
                placeholder="Describe the emotional core and resolution..."
                rows={4}
                value={emotionalCoreResolution}
                onChange={(e) => setEmotionalCoreResolution(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          {/* Narrative Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Narrative Breakdown *</CardTitle>
                <Button type="button" onClick={addNarrativeRow} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {narrativeRows.map((row, index) => (
                  <div key={row.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {narrativeRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNarrativeRow(row.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Story Stream</Label>
                        <Textarea
                          placeholder="Story stream..."
                          rows={2}
                          value={row.story_stream}
                          onChange={(e) => updateNarrativeRow(row.id, "story_stream", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Percentage (0-100)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          value={row.percentage || ""}
                          onChange={(e) => updateNarrativeRow(row.id, "percentage", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Narrative Purpose</Label>
                        <Textarea
                          placeholder="Narrative purpose..."
                          rows={2}
                          value={row.narrative_purpose}
                          onChange={(e) => updateNarrativeRow(row.id, "narrative_purpose", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Planning */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Planning</CardTitle>
                <Button type="button" onClick={addEventPlanningRow} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eventPlanningRows.map((row, index) => (
                  <div key={row.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {eventPlanningRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEventPlanningRow(row.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="space-y-2">
                        <Label>Episode Range</Label>
                        <Input
                          placeholder="e.g., 1-5"
                          value={row.episode_range}
                          onChange={(e) => updateEventPlanningRow(row.id, "episode_range", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Event Scale</Label>
                        <Input
                          placeholder="e.g., Large"
                          value={row.event_scale}
                          onChange={(e) => updateEventPlanningRow(row.id, "event_scale", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Examples of On-Screen Activity</Label>
                        <Textarea
                          placeholder="Describe activities..."
                          rows={2}
                          value={row.on_screen_activity}
                          onChange={(e) => updateEventPlanningRow(row.id, "on_screen_activity", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Approx. Frequency</Label>
                        <Input
                          placeholder="e.g., Once"
                          value={row.approx_frequency}
                          onChange={(e) => updateEventPlanningRow(row.id, "approx_frequency", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Budget Category</Label>
                        <Select
                          value={row.budget_category}
                          onValueChange={(value) => updateEventPlanningRow(row.id, "budget_category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Production Optimization Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Production Optimization Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="productionOptimizationNotes"
                placeholder="Enter production optimization notes..."
                rows={4}
                value={productionOptimizationNotes}
                onChange={(e) => setProductionOptimizationNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Net Outcome */}
          <Card>
            <CardHeader>
              <CardTitle>Net Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="netOutcome"
                placeholder="Enter net outcome..."
                rows={4}
                value={netOutcome}
                onChange={(e) => setNetOutcome(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Potential Weaknesses/Risks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Potential Weaknesses/ Risks</CardTitle>
                <Button type="button" onClick={addWeaknessRiskRow} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weaknessRiskRows.map((row, index) => (
                  <div key={row.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {weaknessRiskRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWeaknessRiskRow(row.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Issue</Label>
                        <Textarea
                          placeholder="Describe the issue..."
                          rows={3}
                          value={row.issue}
                          onChange={(e) => updateWeaknessRiskRow(row.id, "issue", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Explanation / Risk Detail</Label>
                        <Textarea
                          placeholder="Explain the risk detail..."
                          rows={3}
                          value={row.explanation_risk_detail}
                          onChange={(e) => updateWeaknessRiskRow(row.id, "explanation_risk_detail", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Impact</Label>
                        <Textarea
                          placeholder="Describe the impact..."
                          rows={3}
                          value={row.impact}
                          onChange={(e) => updateWeaknessRiskRow(row.id, "impact", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conclusion/Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle>Conclusion/Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="conclusionRecommendation"
                placeholder="Enter conclusion and recommendation..."
                rows={6}
                value={conclusionRecommendation}
                onChange={(e) => setConclusionRecommendation(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" asChild disabled={loading}>
              <Link href="/evaluator/call-reports">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#224794] hover:bg-[#1a3670]">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Detailed One-Liner"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
