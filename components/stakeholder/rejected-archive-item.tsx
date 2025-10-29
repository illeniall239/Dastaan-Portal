"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FileX } from "lucide-react";

interface Evaluation {
  id: string;
  evaluatorName: string;
  evaluatorEmail: string;
  premiseConflictScore: number;
  storylinePlotScore: number;
  episodicProgressionScore: number;
  charactersScore: number;
  dialoguesScore: number;
  overallAssessmentScore: number;
  averageScore: number;
  comments: string;
  submittedAt: string;
}

interface RejectedArchiveItemProps {
  id: string;
  callReportId: string;
  writerName: string;
  workingTitle: string;
  logline: string;
  meetingDate: string;
  averageScore: number;
  totalEvaluations: number;
  rejectionReason: string;
  archivedAt: string;
  evaluations: Evaluation[];
}

export function RejectedArchiveItem({
  id,
  callReportId,
  writerName,
  workingTitle,
  logline,
  meetingDate,
  averageScore,
  totalEvaluations,
  rejectionReason,
  archivedAt,
  evaluations
}: RejectedArchiveItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const meetingDateObj = new Date(meetingDate);
  const archivedDateObj = new Date(archivedAt);

  const getScoreColor = (score: number) => {
    if (score < 3.0) return "bg-red-100 text-red-800 border-red-300";
    if (score < 4.0) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  };

  return (
    <div className="border-2 border-red-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Collapsed View */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50/50 rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileX className="h-5 w-5 text-red-500 flex-shrink-0" />
              <h3 className="text-lg font-semibold">{workingTitle}</h3>
              <Badge variant="destructive" className="text-xs">Rejected</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                {callReportId}
              </span>
              <span>Writer: {writerName}</span>
              <span>Meeting: {meetingDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {logline}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="text-right">
              <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 font-bold text-xl ${getScoreColor(averageScore)}`}>
                {averageScore.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalEvaluations} evaluation{totalEvaluations !== 1 ? "s" : ""}
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded View - Evaluator Scores */}
      {isExpanded && (
        <div className="border-t-2 border-red-100 p-4 bg-slate-50/50">
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileX className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-900 mb-1">Rejection Reason</p>
                <p className="text-xs text-red-700">{rejectionReason}</p>
                <p className="text-xs text-red-600 mt-2">
                  Archived on {archivedDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Individual Evaluator Scores
          </h4>

          <div className="space-y-3">
            {evaluations.map((evaluation, idx) => (
              <div key={evaluation.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {evaluation.evaluatorName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{evaluation.evaluatorName}</p>
                        <Badge variant="outline" className="text-xs">Evaluator #{idx + 1}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{evaluation.evaluatorEmail}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted: {new Date(evaluation.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border-2 font-bold text-lg ${getScoreColor(evaluation.averageScore)}`}>
                    {evaluation.averageScore.toFixed(1)}
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <span className="font-medium">Premise & Conflict</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${getScoreColor(evaluation.premiseConflictScore)}`}>
                      {evaluation.premiseConflictScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <span className="font-medium">Storyline & Plot</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${getScoreColor(evaluation.storylinePlotScore)}`}>
                      {evaluation.storylinePlotScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <span className="font-medium">Episodic Prog.</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${getScoreColor(evaluation.episodicProgressionScore)}`}>
                      {evaluation.episodicProgressionScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <span className="font-medium">Characters</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${getScoreColor(evaluation.charactersScore)}`}>
                      {evaluation.charactersScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <span className="font-medium">Dialogues</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${getScoreColor(evaluation.dialoguesScore)}`}>
                      {evaluation.dialoguesScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <span className="font-medium">Overall</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${getScoreColor(evaluation.overallAssessmentScore)}`}>
                      {evaluation.overallAssessmentScore}
                    </span>
                  </div>
                </div>

                {/* Evaluator Comments */}
                <div className="bg-slate-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-900 mb-1">Evaluator Comments</p>
                  <p className="text-sm text-slate-700">{evaluation.comments}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
