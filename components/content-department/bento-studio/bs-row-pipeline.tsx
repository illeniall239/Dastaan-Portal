"use client";

import { useState } from "react";
import { BsTile } from "./bs-tile";
import { AssessmentVsEvaluationChart } from "@/components/content-department/assessment-vs-evaluation-chart";
import { GenreDistributionChart, ContentTypeChart } from "@/components/evaluator/score-distribution-chart";
import type { ChartProject } from "@/components/evaluator/score-distribution-chart";

interface ComparisonProject {
  id: string;
  title: string;
  initialAssessment: number | null;
  evaluationScore: number | null;
  type: "oneliner" | "episodic";
  episodeNumber?: number;
}

interface BsRowPipelineProps {
  comparisonData: ComparisonProject[];
  chartProjects: ChartProject[];
}

export function BsRowPipeline({ comparisonData, chartProjects }: BsRowPipelineProps) {
  const [activeTab, setActiveTab] = useState<"scores" | "content">("scores");

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Pipeline Tile */}
      <BsTile variant="white" className="flex-1 min-h-[320px]">
        {/* Tab Header */}
        <div className="flex items-center gap-1 bg-[#F4F4F1] rounded-[16px] p-1 mb-5 w-fit">
          <button
            onClick={() => setActiveTab("scores")}
            className={`rounded-[12px] px-[15px] py-[8px] text-[12.5px] font-semibold transition-colors ${
              activeTab === "scores"
                ? "bg-white text-[#15151A] shadow-sm"
                : "text-[#7B7B85] hover:text-[#15151A]"
            }`}
          >
            Score Comparison
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`rounded-[12px] px-[15px] py-[8px] text-[12.5px] font-semibold transition-colors ${
              activeTab === "content"
                ? "bg-white text-[#15151A] shadow-sm"
                : "text-[#7B7B85] hover:text-[#15151A]"
            }`}
          >
            Content Types
          </button>
        </div>

        {activeTab === "scores" ? (
          <AssessmentVsEvaluationChart data={comparisonData} bare />
        ) : (
          <ContentTypeChart projects={chartProjects} bare />
        )}
      </BsTile>

      {/* Genre Tile */}
      <BsTile variant="white" className="w-full md:w-[400px] flex-shrink-0 min-h-[320px]">
        <GenreDistributionChart projects={chartProjects} bare />
      </BsTile>
    </div>
  );
}
