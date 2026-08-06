"use client";

import { AIAssistantPage } from "@/components/ai-assistant/ai-assistant-page";

const SUGGESTIONS = [
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

export default function ManagementAIAssistantPage() {
  return (
    <AIAssistantPage
      portalKey="management"
      suggestions={SUGGESTIONS}
      description="I can look up evaluations, track deliveries, check team performance, and answer any question about your portal data."
      placeholder="Ask about evaluations, projects, teams, deliveries..."
    />
  );
}
