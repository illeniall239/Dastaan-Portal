"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import type { InitialAssessment } from "@/types";

interface InitialAssessmentPanelProps {
    /** UUID of the entity being assessed */
    entityId: string;
    /** Type of entity */
    entityType: "call_report" | "episode";
    /** Label for the assessment */
    label?: string;
    /** Description below the label */
    description?: string;
    /** Whether the current user can submit an assessment */
    canAssess?: boolean;
    /** If true, renders in compact inline mode (no Card wrapper) */
    compact?: boolean;
    /** If true, the panel is disabled */
    disabled?: boolean;
    /** Pre-loaded score for initial render (avoids flash) */
    initialScore?: number | null;
    /** Pre-loaded average for initial render */
    initialAverage?: number | null;
    /** Pre-loaded count for initial render */
    initialCount?: number;
    /** Callback when assessment changes (for parent state updates) */
    onAssessmentChange?: (score: number, stats: { average: number | null; count: number }) => void;
}

function getGradeLabel(score: number): string {
    if (score >= 9) return "Outstanding";
    if (score >= 8) return "Excellent";
    if (score >= 7) return "Very Good";
    if (score >= 6) return "Good";
    if (score >= 5) return "Average";
    if (score >= 4) return "Below Average";
    if (score >= 3) return "Poor";
    return "Very Poor";
}

function getGradeColor(score: number): string {
    if (score >= 8) return "text-green-700";
    if (score >= 6) return "text-blue-700";
    if (score >= 4) return "text-amber-700";
    return "text-red-700";
}

export function InitialAssessmentPanel({
    entityId,
    entityType,
    label = "Initial Assessment",
    description = "Your assessment of this content (1-10). Other team members can also score.",
    canAssess = true,
    compact = false,
    disabled = false,
    initialScore,
    initialAverage,
    initialCount,
    onAssessmentChange,
}: InitialAssessmentPanelProps) {
    const [myScore, setMyScore] = useState<number | null>(initialScore ?? null);
    const [assessments, setAssessments] = useState<InitialAssessment[]>([]);
    const [average, setAverage] = useState<number | null>(initialAverage ?? null);
    const [count, setCount] = useState(initialCount ?? 0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showOthers, setShowOthers] = useState(false);

    const fetchAssessments = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/initial-assessments?entity_type=${entityType}&entity_id=${entityId}&_t=${Date.now()}`,
                { cache: "no-store" }
            );
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setAssessments(data.assessments || []);
            setMyScore(data.myAssessment?.score ?? null);
            setAverage(data.stats.average);
            setCount(data.stats.count);
        } catch {
            // Silent fail on initial load — we have initialScore/initialAverage as fallback
        } finally {
            setLoading(false);
        }
    }, [entityId, entityType]);

    useEffect(() => {
        fetchAssessments();
    }, [fetchAssessments]);

    const handleScoreChange = async (score: number) => {
        if (disabled || saving || !canAssess) return;

        setMyScore(score);
        setSaving(true);

        try {
            const res = await fetch("/api/initial-assessments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entity_type: entityType,
                    entity_id: entityId,
                    score,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            const data = await res.json();
            setAverage(data.stats.average);
            setCount(data.stats.count);
            onAssessmentChange?.(score, data.stats);
            toast.success(`Assessment saved: ${score}/10`);

            // Refresh to get updated list
            fetchAssessments();
        } catch (error: any) {
            toast.error(error.message || "Failed to save assessment");
            // Revert
            fetchAssessments();
        } finally {
            setSaving(false);
        }
    };

    const otherAssessments = assessments.filter(a => a.score !== myScore || assessments.length > 1);

    const scoreSelector = canAssess ? (
        <div className="space-y-2">
            {/* Desktop: horizontal */}
            <div className="hidden sm:flex items-center gap-3">
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => handleScoreChange(value)}
                            disabled={disabled || saving}
                            className={`
                w-8 h-8 text-xs font-medium rounded transition-colors
                ${myScore === value
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                }
                ${disabled || saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
                            title={`Score: ${value}`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
                {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {/* Mobile: 5x2 grid */}
            <div className="flex sm:hidden flex-col items-center gap-2">
                <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => handleScoreChange(value)}
                            disabled={disabled || saving}
                            className={`
                w-8 h-10 text-sm font-medium rounded transition-colors
                ${myScore === value
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                }
                ${disabled || saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
                            title={`Score: ${value}`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
                {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
        </div>
    ) : null;

    // Stats line
    const statsLine = (
        <div className="flex items-center gap-3 flex-wrap">
            {myScore != null && (
                <span className={`text-sm font-medium ${getGradeColor(myScore)}`}>
                    Your Score: {myScore}/10 — {getGradeLabel(myScore)}
                </span>
            )}
            {count > 0 && average != null && (
                <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Avg: {average.toFixed(1)}/10 ({count} {count === 1 ? "assessment" : "assessments"})
                </Badge>
            )}
            {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
    );

    // Others list (expandable)
    const othersList = count > 1 && (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setShowOthers(!showOthers)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                {showOthers ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                View all {count} assessments
            </button>
            {showOthers && (
                <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-gray-200">
                    {assessments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{a.assessor?.name || "Unknown"}</span>
                            <Badge
                                variant="outline"
                                className={`text-[10px] ${a.score >= 8 ? "border-green-300 text-green-700" :
                                        a.score >= 6 ? "border-blue-300 text-blue-700" :
                                            a.score >= 4 ? "border-amber-300 text-amber-700" :
                                                "border-red-300 text-red-700"
                                    }`}
                            >
                                {a.score}/10
                            </Badge>
                            {a.assessor?.role && (
                                <span className="text-muted-foreground capitalize">
                                    {a.assessor.role.replace(/_/g, " ")}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Compact mode — no card wrapper
    if (compact) {
        return (
            <div className="space-y-2">
                {scoreSelector}
                {statsLine}
                {othersList}
            </div>
        );
    }

    // Full mode — with Card wrapper
    return (
        <Card className="p-4">
            <div className="space-y-3">
                <div>
                    <Label className="font-semibold">{label}</Label>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
                {scoreSelector}
                {statsLine}
                {othersList}
            </div>
        </Card>
    );
}
