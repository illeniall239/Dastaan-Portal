"use client";

import { useState, useEffect, useId, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, X, Network } from "lucide-react";
import { createDetailedOneLinerClient, getAvailableCallReportsClient } from "@/lib/detailed-one-liner/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormAutosave } from "@/lib/hooks/useFormAutosave";
import { DraftRestoreBanner } from "@/components/ui/draft-restore-banner";
import { BackButton } from "@/components/ui/back-button";
import type { NarrativeBreakdownItemFormData, EventPlanningItemFormData, CharacterRelationshipItemFormData } from "@/lib/validations/detailed-one-liner";
import type { CharacterRelationship } from "@/types";
import dynamic from 'next/dynamic';
const CharacterRelationshipGraph = dynamic(
  () => import("@/components/character-relationship-graph").then(m => m.CharacterRelationshipGraph),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const ReactFlowProvider = dynamic(
  () => import('reactflow').then(m => m.ReactFlowProvider),
  { ssr: false }
);

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

interface CharacterRelationshipRow {
  id: string;
  character_a_name: string;
  character_a_role: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | '';
  character_b_name: string;
  character_b_role: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | '';
  relationship_type: 'family' | 'romantic' | 'professional' | 'friendship' | 'rivalry' | 'mentor_mentee' | 'alliance' | 'conflict' | 'other' | '';
  relationship_description: string;
  initial_state: string;
  final_state: string;
  key_turning_points: string;
  emotional_weight: 'high' | 'medium' | 'low' | '';
  drives_plot: boolean;
}

export default function ProgrammerLogDetailedOneLinerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCallReports, setLoadingCallReports] = useState(false);
  const [callReports, setCallReports] = useState<any[]>([]);
  const [showVisualization, setShowVisualization] = useState(false);
  const [idCounter, setIdCounter] = useState(0);

  // Helper to generate stable IDs
  const generateId = () => {
    setIdCounter(prev => prev + 1);
    return `row-${idCounter}`;
  };

  // Form state
  const [callReportId, setCallReportId] = useState("");
  const [preamble, setPreamble] = useState("");
  const [plot, setPlot] = useState("");
  const [emotionalArena, setEmotionalArena] = useState("");
  const [creedConflict, setCreedConflict] = useState("");
  const [newElement, setNewElement] = useState("");
  const [emotionalCoreResolution, setEmotionalCoreResolution] = useState("");
  const [narrativeRows, setNarrativeRows] = useState<NarrativeRow[]>([
    { id: "narrative-0", story_stream: "", percentage: 0, narrative_purpose: "" }
  ]);
  const [eventPlanningRows, setEventPlanningRows] = useState<EventPlanningRow[]>([
    { id: "event-0", episode_range: "", event_scale: "", on_screen_activity: "", approx_frequency: "", budget_category: "" }
  ]);
  const [productionOptimizationNotes, setProductionOptimizationNotes] = useState("");
  const [netOutcome, setNetOutcome] = useState("");
  const [weaknessRiskRows, setWeaknessRiskRows] = useState<PotentialWeaknessRiskRow[]>([
    { id: "weakness-0", issue: "", explanation_risk_detail: "", impact: "" }
  ]);
  const [characterRelationshipRows, setCharacterRelationshipRows] = useState<CharacterRelationshipRow[]>([
    {
      id: "character-0",
      character_a_name: "",
      character_a_role: "",
      character_b_name: "",
      character_b_role: "",
      relationship_type: "",
      relationship_description: "",
      initial_state: "",
      final_state: "",
      key_turning_points: "",
      emotional_weight: "",
      drives_plot: false,
    }
  ]);
  const [conclusionRecommendation, setConclusionRecommendation] = useState("");

  // Autosave
  const { hasDraft, draftLoaded, draftUpdatedAt, saveDraft, loadDraft, clearDraft } = useFormAutosave({
    formType: "detailed_one_liner",
    entityId: callReportId || "_new",
  });

  const [draftDismissed, setDraftDismissed] = useState(false);

  // Autosave on form state changes
  useEffect(() => {
    saveDraft({
      callReportId,
      preamble,
      plot,
      emotionalArena,
      creedConflict,
      newElement,
      emotionalCoreResolution,
      narrativeRows,
      eventPlanningRows,
      productionOptimizationNotes,
      netOutcome,
      weaknessRiskRows,
      characterRelationshipRows,
      conclusionRecommendation,
    });
  }, [
    callReportId, preamble, plot, emotionalArena, creedConflict, newElement,
    emotionalCoreResolution, narrativeRows, eventPlanningRows,
    productionOptimizationNotes, netOutcome, weaknessRiskRows,
    characterRelationshipRows, conclusionRecommendation, saveDraft,
  ]);

  const handleRestoreDraft = useCallback(async () => {
    const data = await loadDraft();
    if (data) {
      const d = data as Record<string, any>;
      if (d.callReportId) setCallReportId(d.callReportId);
      if (d.preamble) setPreamble(d.preamble);
      if (d.plot) setPlot(d.plot);
      if (d.emotionalArena) setEmotionalArena(d.emotionalArena);
      if (d.creedConflict) setCreedConflict(d.creedConflict);
      if (d.newElement) setNewElement(d.newElement);
      if (d.emotionalCoreResolution) setEmotionalCoreResolution(d.emotionalCoreResolution);
      if (d.narrativeRows) setNarrativeRows(d.narrativeRows);
      if (d.eventPlanningRows) setEventPlanningRows(d.eventPlanningRows);
      if (d.productionOptimizationNotes) setProductionOptimizationNotes(d.productionOptimizationNotes);
      if (d.netOutcome) setNetOutcome(d.netOutcome);
      if (d.weaknessRiskRows) setWeaknessRiskRows(d.weaknessRiskRows);
      if (d.characterRelationshipRows) setCharacterRelationshipRows(d.characterRelationshipRows);
      if (d.conclusionRecommendation) setConclusionRecommendation(d.conclusionRecommendation);
      setDraftDismissed(true);
      toast.success("Draft restored");
    }
  }, [loadDraft]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    setDraftDismissed(true);
  }, [clearDraft]);

  // Fetch available call reports on mount
  useEffect(() => {
    fetchCallReports();
  }, []);

  // Pre-select callReportId from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("callReportId");
    if (id) setCallReportId(id);
  }, []);

  const fetchCallReports = async () => {
    setLoadingCallReports(true);
    try {
      const available = await getAvailableCallReportsClient();
      setCallReports(available);
    } catch (error) {
      console.error("Error fetching call reports:", error);
      toast.error("Failed to fetch stories");
    } finally {
      setLoadingCallReports(false);
    }
  };

  const addNarrativeRow = () => {
    const newId = `narrative-${Date.now()}`;
    setNarrativeRows([
      ...narrativeRows,
      { id: newId, story_stream: "", percentage: 0, narrative_purpose: "" }
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
    const newId = `event-${Date.now()}`;
    setEventPlanningRows([
      ...eventPlanningRows,
      { id: newId, episode_range: "", event_scale: "", on_screen_activity: "", approx_frequency: "", budget_category: "" }
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
    const newId = `weakness-${Date.now()}`;
    setWeaknessRiskRows([
      ...weaknessRiskRows,
      { id: newId, issue: "", explanation_risk_detail: "", impact: "" }
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

  const addCharacterRelationshipRow = () => {
    const newId = `character-${Date.now()}`;
    setCharacterRelationshipRows([
      ...characterRelationshipRows,
      {
        id: newId,
        character_a_name: "",
        character_a_role: "",
        character_b_name: "",
        character_b_role: "",
        relationship_type: "",
        relationship_description: "",
        initial_state: "",
        final_state: "",
        key_turning_points: "",
        emotional_weight: "",
        drives_plot: false,
      }
    ]);
  };

  const removeCharacterRelationshipRow = (id: string) => {
    if (characterRelationshipRows.length > 1) {
      setCharacterRelationshipRows(characterRelationshipRows.filter(row => row.id !== id));
    }
  };

  const updateCharacterRelationshipRow = (id: string, field: keyof CharacterRelationshipRow, value: string | boolean) => {
    setCharacterRelationshipRows(characterRelationshipRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!callReportId) {
        toast.error("Please select a story");
        return;
      }

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

      // Validate character relationships (optional)
      const validCharacterRelationshipRows = characterRelationshipRows.filter(row =>
        row.character_a_name.trim() && row.character_a_role &&
        row.character_b_name.trim() && row.character_b_role &&
        row.relationship_type && row.relationship_description.trim()
      );

      // Check that characters are different
      for (const row of validCharacterRelationshipRows) {
        if (row.character_a_name.trim() === row.character_b_name.trim()) {
          toast.error("Characters in a relationship must be different");
          return;
        }
      }

      const formData = {
        call_report_id: callReportId,
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
        character_relationships: validCharacterRelationshipRows.length > 0 ? validCharacterRelationshipRows.map((row, index) => ({
          character_a_name: row.character_a_name.trim(),
          character_a_role: row.character_a_role as 'protagonist' | 'antagonist' | 'supporting' | 'minor',
          character_b_name: row.character_b_name.trim(),
          character_b_role: row.character_b_role as 'protagonist' | 'antagonist' | 'supporting' | 'minor',
          relationship_type: row.relationship_type as 'family' | 'romantic' | 'professional' | 'friendship' | 'rivalry' | 'mentor_mentee' | 'alliance' | 'conflict' | 'other',
          relationship_description: row.relationship_description.trim(),
          initial_state: row.initial_state.trim() || undefined,
          final_state: row.final_state.trim() || undefined,
          key_turning_points: row.key_turning_points.trim() || undefined,
          emotional_weight: row.emotional_weight || undefined,
          drives_plot: row.drives_plot,
          sort_order: index,
        })) : undefined,
        conclusion_recommendation: conclusionRecommendation.trim() || undefined,
      };

      const result = await createDetailedOneLinerClient(formData);

      // Clear autosave draft on success
      await clearDraft();

      toast.success("Detailed One-Liner created successfully!");

      // Redirect to view page
      router.push(`/programmer/detailed-one-liner/${result.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating detailed one-liner:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create detailed one-liner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-6 mb-8">
          <BackButton fallbackHref="/programmer/call-reports" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Log Detailed One-Liner</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Create a comprehensive one-liner analysis with narrative breakdown for a one-liner.
            </p>
          </div>
        </div>

        {/* Draft restore banner */}
        {!draftDismissed && (
          <DraftRestoreBanner
            hasDraft={hasDraft}
            draftLoaded={draftLoaded}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
            lastUpdated={draftUpdatedAt}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Call Report Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Story</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={callReportId} onValueChange={setCallReportId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCallReports ? "Loading..." : "Select a story"} />
                </SelectTrigger>
                <SelectContent>
                  {callReports.map((cr) => (
                    <SelectItem key={cr.id} value={cr.id}>
                      {cr.call_report_id} - {cr.working_title} ({cr.writer_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

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

          {/* Character Relationships */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Character Relationships</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Map character dynamics and relationships in the story
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowVisualization(true)}
                    size="sm"
                    variant="secondary"
                    disabled={characterRelationshipRows.filter(r =>
                      r.character_a_name.trim() && r.character_b_name.trim() &&
                      r.character_a_role && r.character_b_role &&
                      r.relationship_type && r.relationship_description.trim()
                    ).length === 0}
                  >
                    <Network className="h-4 w-4 mr-1" />
                    Visualize
                  </Button>
                  <Button type="button" onClick={addCharacterRelationshipRow} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Relationship
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {characterRelationshipRows.map((row, index) => (
                  <div key={row.id} className="border rounded-lg p-4 space-y-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Relationship {index + 1}</span>
                      {characterRelationshipRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCharacterRelationshipRow(row.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Character A */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded border">
                      <div className="space-y-2">
                        <Label>Character A Name</Label>
                        <Input
                          placeholder="Enter character name"
                          value={row.character_a_name}
                          onChange={(e) => updateCharacterRelationshipRow(row.id, "character_a_name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Character A Role</Label>
                        <Select
                          value={row.character_a_role}
                          onValueChange={(value) => updateCharacterRelationshipRow(row.id, "character_a_role", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="protagonist">Protagonist</SelectItem>
                            <SelectItem value="antagonist">Antagonist</SelectItem>
                            <SelectItem value="supporting">Supporting</SelectItem>
                            <SelectItem value="minor">Minor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Character B */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded border">
                      <div className="space-y-2">
                        <Label>Character B Name</Label>
                        <Input
                          placeholder="Enter character name"
                          value={row.character_b_name}
                          onChange={(e) => updateCharacterRelationshipRow(row.id, "character_b_name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Character B Role</Label>
                        <Select
                          value={row.character_b_role}
                          onValueChange={(value) => updateCharacterRelationshipRow(row.id, "character_b_role", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="protagonist">Protagonist</SelectItem>
                            <SelectItem value="antagonist">Antagonist</SelectItem>
                            <SelectItem value="supporting">Supporting</SelectItem>
                            <SelectItem value="minor">Minor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Relationship Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Relationship Type</Label>
                        <Select
                          value={row.relationship_type}
                          onValueChange={(value) => updateCharacterRelationshipRow(row.id, "relationship_type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="romantic">Romantic</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="friendship">Friendship</SelectItem>
                            <SelectItem value="rivalry">Rivalry</SelectItem>
                            <SelectItem value="mentor_mentee">Mentor-Mentee</SelectItem>
                            <SelectItem value="alliance">Alliance</SelectItem>
                            <SelectItem value="conflict">Conflict</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Emotional Weight</Label>
                        <Select
                          value={row.emotional_weight}
                          onValueChange={(value) => updateCharacterRelationshipRow(row.id, "emotional_weight", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Optional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Relationship Description</Label>
                      <Textarea
                        placeholder="Describe the relationship dynamics..."
                        rows={2}
                        value={row.relationship_description}
                        onChange={(e) => updateCharacterRelationshipRow(row.id, "relationship_description", e.target.value)}
                      />
                    </div>

                    {/* Relationship Evolution (Optional) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Initial State (Optional)</Label>
                        <Textarea
                          placeholder="How the relationship begins..."
                          rows={2}
                          value={row.initial_state}
                          onChange={(e) => updateCharacterRelationshipRow(row.id, "initial_state", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Final State (Optional)</Label>
                        <Textarea
                          placeholder="How it evolves by the end..."
                          rows={2}
                          value={row.final_state}
                          onChange={(e) => updateCharacterRelationshipRow(row.id, "final_state", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Key Turning Points (Optional)</Label>
                      <Textarea
                        placeholder="Critical moments that transform this relationship..."
                        rows={2}
                        value={row.key_turning_points}
                        onChange={(e) => updateCharacterRelationshipRow(row.id, "key_turning_points", e.target.value)}
                      />
                    </div>

                    {/* Drives Plot Checkbox */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`drives_plot_${row.id}`}
                        checked={row.drives_plot}
                        onChange={(e) => updateCharacterRelationshipRow(row.id, "drives_plot", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor={`drives_plot_${row.id}`} className="text-sm font-normal">
                        This relationship is a key driver of plot progression
                      </Label>
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
              <Link href="/programmer/call-reports">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#224794] hover:bg-[#1a3670]">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Detailed One-Liner"
              )}
            </Button>
          </div>
        </form>

        {/* Character Relationship Visualization Dialog */}
        <Dialog open={showVisualization} onOpenChange={setShowVisualization}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Character Relationship Visualization</DialogTitle>
              <DialogDescription>
                Interactive graph showing character connections and dynamics
              </DialogDescription>
            </DialogHeader>
            <ReactFlowProvider>
              <CharacterRelationshipGraph
                relationships={characterRelationshipRows
                  .filter(r =>
                    r.character_a_name.trim() && r.character_b_name.trim() &&
                    r.character_a_role && r.character_b_role &&
                    r.relationship_type && r.relationship_description.trim()
                  )
                  .map((r, index) => ({
                    id: r.id,
                    detailed_one_liner_id: '',
                    character_a_name: r.character_a_name.trim(),
                    character_a_role: r.character_a_role as 'protagonist' | 'antagonist' | 'supporting' | 'minor',
                    character_b_name: r.character_b_name.trim(),
                    character_b_role: r.character_b_role as 'protagonist' | 'antagonist' | 'supporting' | 'minor',
                    relationship_type: r.relationship_type as 'family' | 'romantic' | 'professional' | 'friendship' | 'rivalry' | 'mentor_mentee' | 'alliance' | 'conflict' | 'other',
                    relationship_description: r.relationship_description,
                    initial_state: r.initial_state || undefined,
                    final_state: r.final_state || undefined,
                    key_turning_points: r.key_turning_points || undefined,
                    emotional_weight: (r.emotional_weight || undefined) as 'high' | 'medium' | 'low' | undefined,
                    drives_plot: r.drives_plot,
                    sort_order: index,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }))}
              />
            </ReactFlowProvider>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
