"use client";

import { useState } from "react";
import { StagePipelineTable } from "./stage-pipeline-table";
import { StoryDetailModal } from "./story-detail-modal";
import type { PipelineStory } from "@/types";

interface StageWisePipelineProps {
  stories: {
    stage1: PipelineStory[];
    stage2: PipelineStory[];
    stage3: PipelineStory[];
    all: PipelineStory[];
  };
}

export function StageWisePipeline({ stories }: StageWisePipelineProps) {
  const [selectedStory, setSelectedStory] = useState<PipelineStory | null>(null);

  return (
    <>
      {/* Table View */}
      <StagePipelineTable
        stories={stories.all}
        onStoryClick={setSelectedStory}
      />

      {/* Story Detail Modal */}
      <StoryDetailModal
        story={selectedStory}
        isOpen={selectedStory !== null}
        onClose={() => setSelectedStory(null)}
      />
    </>
  );
}
