"use client";

import { AIAssistantPage } from "@/components/ai-assistant/ai-assistant-page";

const SUGGESTIONS = [
  "Give me a summary of my team's activity",
  "What are the highest rated projects in our team?",
  "How many evaluations were done this month?",
  "Which projects are behind on episode delivery?",
  "Show me pending evaluations for our team",
  "What ideas were logged last month?",
];

export default function ProgrammerAIAssistantPage() {
  return (
    <AIAssistantPage
      portalKey="programmer"
      suggestions={SUGGESTIONS}
      description="I can help you look up your team's evaluations, track episode deliveries, and answer questions about your projects."
      placeholder="Ask about your team's evaluations, projects, episodes..."
    />
  );
}
