"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterRelationshipGraph } from "@/components/character-relationship-graph";
import type { CharacterRelationship } from "@/types";
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

interface NarrativeBreakdownItem {
  id: string;
  story_stream: string;
  percentage: number;
  narrative_purpose: string;
  sort_order: number;
}

interface EventPlanningItem {
  id: string;
  episode_range: string;
  event_scale: string;
  on_screen_activity: string;
  approx_frequency: string;
  budget_category: "High" | "Medium" | "Low";
  sort_order: number;
}

interface PotentialWeaknessRiskItem {
  id: string;
  issue: string;
  explanation_risk_detail: string;
  impact: string;
  sort_order: number;
}

interface DetailedOneLiner {
  id: string;
  call_report_id: string;
  preamble: string;
  plot: string;
  emotional_arena: string;
  creed_conflict: string;
  new_element: string;
  emotional_core_resolution: string;
  production_optimization_notes?: string;
  net_outcome?: string;
  conclusion_recommendation?: string;
  narrative_breakdown_items?: NarrativeBreakdownItem[];
  event_planning_items?: EventPlanningItem[];
  potential_weaknesses_risks_items?: PotentialWeaknessRiskItem[];
  character_relationships?: CharacterRelationship[];
  created_by_user?: {
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface DetailedOneLinerDisplayProps {
  detailedOneLiner: DetailedOneLiner | null;
}

export function DetailedOneLinerDisplay({ detailedOneLiner }: DetailedOneLinerDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If no detailed one-liner exists, show placeholder
  if (!detailedOneLiner) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            No detailed one-liner has been created for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-semibold text-slate-900">
              Detailed One-Liner Analysis
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:scale-105 transition-transform"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4 space-y-6">
          {/* Preamble Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-blue-600"></span>
              Why This Drama May Work
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {detailedOneLiner.preamble}
            </p>
          </div>

          {/* PLOT Section */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-blue-600"></span>
              PLOT
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {detailedOneLiner.plot}
            </p>
          </div>

          {/* Emotional Arena */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-blue-600"></span>
              The Emotional Arena
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {detailedOneLiner.emotional_arena}
            </p>
          </div>

          {/* Creed and Conflict */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-blue-600"></span>
              Creed and Conflict
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {detailedOneLiner.creed_conflict}
            </p>
          </div>

          {/* New Element */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-blue-600"></span>
              New Element
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {detailedOneLiner.new_element}
            </p>
          </div>

          {/* Emotional Core and Resolution */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-blue-600"></span>
              Emotional Core and Resolution
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {detailedOneLiner.emotional_core_resolution}
            </p>
          </div>

          {/* Narrative Breakdown Items */}
          {detailedOneLiner.narrative_breakdown_items && detailedOneLiner.narrative_breakdown_items.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-blue-600"></span>
                Narrative Breakdown
              </h3>
              <div className="space-y-3">
                {detailedOneLiner.narrative_breakdown_items
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.percentage}%
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">{item.story_stream}</span>
                      </div>
                      <p className="text-sm text-slate-600">{item.narrative_purpose}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Event Planning Items */}
          {detailedOneLiner.event_planning_items && detailedOneLiner.event_planning_items.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-blue-600"></span>
                Event Planning
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left p-2 font-semibold text-slate-700">Episode Range</th>
                      <th className="text-left p-2 font-semibold text-slate-700">Event Scale</th>
                      <th className="text-left p-2 font-semibold text-slate-700">On-Screen Activity</th>
                      <th className="text-left p-2 font-semibold text-slate-700">Frequency</th>
                      <th className="text-left p-2 font-semibold text-slate-700">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedOneLiner.event_planning_items
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="p-2 text-slate-900">{item.episode_range}</td>
                          <td className="p-2 text-slate-700">{item.event_scale}</td>
                          <td className="p-2 text-slate-700">{item.on_screen_activity}</td>
                          <td className="p-2 text-slate-700">{item.approx_frequency}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                item.budget_category === "High"
                                  ? "destructive"
                                  : item.budget_category === "Medium"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {item.budget_category}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Potential Weaknesses/Risks */}
          {detailedOneLiner.potential_weaknesses_risks_items &&
            detailedOneLiner.potential_weaknesses_risks_items.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-red-600"></span>
                  Potential Weaknesses / Risks
                </h3>
                <div className="space-y-3">
                  {detailedOneLiner.potential_weaknesses_risks_items
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item, index) => (
                      <div key={item.id} className="border border-red-200 rounded-lg p-3 bg-red-50/50">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant="destructive" className="text-xs mt-0.5">
                            {index + 1}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 mb-1">{item.issue}</p>
                            <p className="text-sm text-slate-700 mb-2">{item.explanation_risk_detail}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600">Impact:</span>
                              <span className="text-xs text-slate-700">{item.impact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Character Relationships */}
          {detailedOneLiner.character_relationships && detailedOneLiner.character_relationships.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-purple-600"></span>
                Character Relationships
              </h3>
              <ReactFlowProvider>
                <CharacterRelationshipGraph relationships={detailedOneLiner.character_relationships} />
              </ReactFlowProvider>
            </div>
          )}

          {/* Production Optimization Notes */}
          {detailedOneLiner.production_optimization_notes && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-blue-600"></span>
                Production Optimization Notes
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {detailedOneLiner.production_optimization_notes}
              </p>
            </div>
          )}

          {/* Net Outcome */}
          {detailedOneLiner.net_outcome && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-blue-600"></span>
                Net Outcome
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {detailedOneLiner.net_outcome}
              </p>
            </div>
          )}

          {/* Conclusion/Recommendation */}
          {detailedOneLiner.conclusion_recommendation && (
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-600"></span>
                Conclusion / Recommendation
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {detailedOneLiner.conclusion_recommendation}
              </p>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-3 border-t border-slate-200 mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div>
                Created by:{" "}
                <span className="font-medium text-slate-700">
                  {detailedOneLiner.created_by_user?.name || "Unknown"}
                </span>
              </div>
              <div>
                {new Date(detailedOneLiner.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
