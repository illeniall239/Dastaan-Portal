"use client";

import { AIAssistantPage } from "@/components/ai-assistant/ai-assistant-page";

const VIEWER_SUGGESTIONS = [
  "Give me a full portal summary",
  "Which projects are behind on episode delivery?",
  "How many episodes received for Double Wala Love?",
  "List all writers and their project counts",
  "Show me active contracts and payment status",
  "What ideas were logged last month?",
];

const MANAGEMENT_SUGGESTIONS = [
  "Give me a full portal summary",
  "What are the highest rated projects?",
  "How many evaluations were done this month?",
  "How many episodes received for Double Wala Love?",
  "Which projects are behind on episode delivery?",
  "What has Ammar Usmani been working on?",
  "List all writers and their project counts",
  "Show me active contracts and payment status",
  "How are the teams performing?",
  "What evaluations and approvals are pending?",
  "Which stories were approved this year?",
  "What ideas were logged last month?",
];

export function ManagementAIAssistantClient({ role }: { role: string }) {
  const isViewer = role === "management_viewer";

  return (
    <AIAssistantPage
      portalKey="management"
      suggestions={isViewer ? VIEWER_SUGGESTIONS : MANAGEMENT_SUGGESTIONS}
      description={
        isViewer
          ? "I can look up projects, track episode deliveries, check content aging, and answer questions about portal data."
          : "I can look up evaluations, track deliveries, check team performance, and answer any question about your portal data."
      }
      placeholder={
        isViewer
          ? "Ask about projects, episode deliveries, content aging..."
          : "Ask about evaluations, projects, teams, deliveries..."
      }
    />
  );
}
